#import "React/RCTConvert.h"
#import "RCTVLCPlayer.h"
#import "React/RCTBridgeModule.h"
#import "React/RCTEventDispatcher.h"
#import "React/UIView+React.h"
#if TARGET_OS_TV
#import <TVVLCKit/TVVLCKit.h>
#else
#import <MobileVLCKit/MobileVLCKit.h>
#endif
#import <AVFoundation/AVFoundation.h>
static NSString *const statusKeyPath = @"status";
static NSString *const playbackLikelyToKeepUpKeyPath = @"playbackLikelyToKeepUp";
static NSString *const playbackBufferEmptyKeyPath = @"playbackBufferEmpty";
static NSString *const readyForDisplayKeyPath = @"readyForDisplay";
static NSString *const playbackRate = @"rate";


#if !defined(DEBUG) || !(TARGET_IPHONE_SIMULATOR)
    #define NSLog(...)
#endif


@implementation RCTVLCPlayer
{

    /* Required to publish events */
    RCTEventDispatcher *_eventDispatcher;
    VLCMediaPlayer *_player;

    NSDictionary * _videoInfo;
    NSString * _subtitleUri;

    BOOL _paused;
    BOOL _autoplay;
    BOOL _acceptInvalidCertificates;
}

- (instancetype)initWithEventDispatcher:(RCTEventDispatcher *)eventDispatcher
{
    if ((self = [super init])) {
        _eventDispatcher = eventDispatcher;

        [[NSNotificationCenter defaultCenter] addObserver:self
                                                 selector:@selector(applicationWillResignActive:)
                                                     name:UIApplicationWillResignActiveNotification
                                                   object:nil];

        [[NSNotificationCenter defaultCenter] addObserver:self
                                                 selector:@selector(applicationWillEnterForeground:)
                                                     name:UIApplicationWillEnterForegroundNotification
                                                   object:nil];

    }

    return self;
}

- (void)applicationWillEnterForeground:(NSNotification *)notification
{
    if (!_paused)
        [self play];
}

- (void)applicationWillResignActive:(NSNotification *)notification
{
    if (!_paused)
        [self play];
}

- (void)play
{
    if (_player) {
        [_player play];
        _paused = NO;
    }
}

- (void)pause
{
    if (_player) {
        [_player pause];
        _paused = YES;
    }
}

- (void)setSource:(NSDictionary *)source
{
    if (_player) {
        [self _release];
    }

    _videoInfo = nil;

    // [bavv edit start]
    NSString* uriString = [source objectForKey:@"uri"];
    NSURL* uri = [NSURL URLWithString:uriString];
    int initType = [source objectForKey:@"initType"];
    NSDictionary* initOptions = [source objectForKey:@"initOptions"];
    
    // Get acceptInvalidCertificates from source
    _acceptInvalidCertificates = [[source objectForKey:@"acceptInvalidCertificates"] boolValue];
    NSLog(@"iOS: Set acceptInvalidCertificates to %@", _acceptInvalidCertificates ? @"YES" : @"NO");

    if (initType == 1) {
        _player = [[VLCMediaPlayer alloc] init];
    } else {
        _player = [[VLCMediaPlayer alloc] initWithOptions:initOptions];
    }
    _player.delegate = self;
    _player.drawable = self;
    // [bavv edit end]

    VLCLibrary *library = _player.libraryInstance;

    VLCConsoleLogger *consoleLogger = [[VLCConsoleLogger alloc] init];
    consoleLogger.level = kVLCLogLevelDebug;
    library.loggers = @[consoleLogger];

    // Create dialog provider with custom UI to handle dialogs programmatically
    self.dialogProvider = [[VLCDialogProvider alloc] initWithLibrary:library customUI:YES];
    self.dialogProvider.customRenderer = self;
    _player.media = [VLCMedia mediaWithURL:uri];

    if (_autoplay)
        [_player play];
    
    [[AVAudioSession sharedInstance] setActive:NO withOptions:AVAudioSessionSetActiveOptionNotifyOthersOnDeactivation error:nil];
}

- (void)setAutoplay:(BOOL)autoplay
{
    _autoplay = autoplay;

    if (autoplay)
        [self play];
}

- (void)setPaused:(BOOL)paused
{
    _paused = paused;

    if (!paused) {
        [self play];
    } else {
        [self pause];
    }
}

- (void)setResume:(BOOL)resume
{
    if (resume) {
        [self play];
    } else {
        [self pause];
    }
}

- (void)setSubtitleUri:(NSString *)subtitleUri
{
    NSURL *url = [NSURL URLWithString:subtitleUri];
    
    if (url.absoluteString.length != 0 && _player) {
        _subtitleUri = url;
        [_player addPlaybackSlave:_subtitleUri type:VLCMediaPlaybackSlaveTypeSubtitle enforce:YES];
    } else {
        NSLog(@"Invalid subtitle URI: %@", subtitleUri);
    }
}

// ==== player delegate methods ====

- (void)mediaPlayerTimeChanged:(NSNotification *)aNotification
{
    [self updateVideoProgress];
}

- (void)mediaPlayerStateChanged:(NSNotification *)aNotification
{

    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    NSLog(@"userInfo %@",[aNotification userInfo]);
    NSLog(@"standardUserDefaults %@",defaults);
    if (_player) {
        VLCMediaPlayerState state = _player.state;
        switch (state) {
            case VLCMediaPlayerStateOpening:
                 NSLog(@"VLCMediaPlayerStateOpening  %i", _player.numberOfAudioTracks);
                self.onVideoOpen(@{
                                     @"target": self.reactTag
                                     });
                self.onVideoLoadStart(@{
                                           @"target": self.reactTag
                                           });
                break;
            case VLCMediaPlayerStatePaused:
                _paused = YES;
                NSLog(@"VLCMediaPlayerStatePaused %i", _player.numberOfAudioTracks);
                self.onVideoPaused(@{
                                     @"target": self.reactTag
                                     });
                break;
            case VLCMediaPlayerStateStopped:
                NSLog(@"VLCMediaPlayerStateStopped %i", _player.numberOfAudioTracks);
                self.onVideoStopped(@{
                                      @"target": self.reactTag
                                      });
                break;
            case VLCMediaPlayerStateBuffering:
                NSLog(@"VLCMediaPlayerStateBuffering %i", _player.numberOfAudioTracks);
                self.onVideoBuffering(@{
                                        @"target": self.reactTag
                                        });
                break;
            case VLCMediaPlayerStatePlaying:
                _paused = NO;
                NSLog(@"VLCMediaPlayerStatePlaying %i", _player.numberOfAudioTracks);
                self.onVideoPlaying(@{
                                      @"target": self.reactTag,
                                      @"seekable": [NSNumber numberWithBool:[_player isSeekable]],
                                      @"duration":[NSNumber numberWithInt:[_player.media.length intValue]]
                                      });
                break;
            case VLCMediaPlayerStateEnded:
                NSLog(@"VLCMediaPlayerStateEnded %i",  _player.numberOfAudioTracks);
                int currentTime   = [[_player time] intValue];
                int remainingTime = [[_player remainingTime] intValue];
                int duration      = [_player.media.length intValue];

                self.onVideoEnded(@{
                                    @"target": self.reactTag,
                                    @"currentTime": [NSNumber numberWithInt:currentTime],
                                    @"remainingTime": [NSNumber numberWithInt:remainingTime],
                                    @"duration":[NSNumber numberWithInt:duration],
                                    @"position":[NSNumber numberWithFloat:_player.position]
                                    });
                break;
            case VLCMediaPlayerStateError:
                NSLog(@"VLCMediaPlayerStateError %i", _player.numberOfAudioTracks);
                // This callback doesn't have any data about the error, we need to rely on the error dialog
                [self _release];
                break;
            default:
                break;
        }
    }
}


//   ===== media delegate methods =====

- (void)mediaDidFinishParsing:(VLCMedia *)aMedia {
    NSLog(@"VLCMediaDidFinishParsing %i", _player.numberOfAudioTracks);
}

- (void)mediaMetaDataDidChange:(VLCMedia *)aMedia{
    NSLog(@"VLCMediaMetaDataDidChange %i", _player.numberOfAudioTracks);
}

- (void)mediaPlayer:(VLCMediaPlayer *)player recordingStoppedAtPath:(NSString *)path {
    if (self.onRecordingState) {
        self.onRecordingState(@{
            @"target": self.reactTag,
            @"isRecording": @NO,
            @"recordPath": path ?: [NSNull null]
        });
    }
}

//   ===================================

- (void)updateVideoProgress
{
    if (_player && !_paused) {
        int currentTime   = [[_player time] intValue];
        int remainingTime = [[_player remainingTime] intValue];
        int duration      = [_player.media.length intValue];
        [self updateVideoInfo];

        self.onVideoProgress(@{
                               @"target": self.reactTag,
                               @"currentTime": [NSNumber numberWithInt:currentTime],
                               @"remainingTime": [NSNumber numberWithInt:remainingTime],
                               @"duration":[NSNumber numberWithInt:duration],
                               @"position":[NSNumber numberWithFloat:_player.position],
                               });
    }
}

- (void)updateVideoInfo
{
    NSMutableDictionary *info = [NSMutableDictionary new];
    info[@"duration"] = _player.media.length.value;
    int i;
    if (_player.videoSize.width > 0) {
        info[@"videoSize"] =  @{
            @"width":  @(_player.videoSize.width),
            @"height": @(_player.videoSize.height)
        };
    }

    if (_player.numberOfAudioTracks > 0) {
            NSMutableArray *tracks = [NSMutableArray new];
            for (i = 0; i < _player.numberOfAudioTracks; i++) {
                if (_player.audioTrackIndexes[i] && _player.audioTrackNames[i]) {
                    [tracks addObject:  @{
                        @"id": _player.audioTrackIndexes[i],
                        @"name":  _player.audioTrackNames[i]
                    }];
                }
            }
            info[@"audioTracks"] = tracks;
        }

        if (_player.numberOfSubtitlesTracks > 0) {
            NSMutableArray *tracks = [NSMutableArray new];
            for (i = 0; i < _player.numberOfSubtitlesTracks; i++) {
                if (_player.videoSubTitlesIndexes[i] && _player.videoSubTitlesNames[i]) {
                    [tracks addObject:  @{
                        @"id": _player.videoSubTitlesIndexes[i],
                        @"name":  _player.videoSubTitlesNames[i]
                    }];
                }
            }
            info[@"textTracks"] = tracks;
        }

        if (![_videoInfo isEqualToDictionary:info]) {
            self.onVideoLoad(info);
            _videoInfo = info;
        }
}

- (void)jumpBackward:(int)interval
{
    if (interval>=0 && interval <= [_player.media.length intValue])
        [_player jumpBackward:interval];
}

- (void)jumpForward:(int)interval
{
    if (interval>=0 && interval <= [_player.media.length intValue])
        [_player jumpForward:interval];
}

- (void)setSeek:(float)pos
{
    if ([_player isSeekable]) {
        if (pos>=0 && pos <= 1) {
            [_player setPosition:pos];
        }
    }
}

- (void)setSnapshotPath:(NSString*)path
{
    if (_player)
        [_player saveVideoSnapshotAt:path withWidth:0 andHeight:0];
}

- (void)setRate:(float)rate
{
    [_player setRate:rate];
}

- (void)setAudioTrack:(int)track
{
    [_player setCurrentAudioTrackIndex: track];
}

- (void)setTextTrack:(int)track
{
    [_player setCurrentVideoSubTitleIndex:track];
}

- (void)startRecording:(NSString*)path
{
    [_player startRecordingAtPath:path];
    if (self.onRecordingState) {
        self.onRecordingState(@{
            @"target": self.reactTag,
            @"isRecording": @YES
        });
    }
}

- (void)stopRecording
{
    [_player stopRecording];
}

- (void)stopPlayer
{
    [_player stop];
}

- (void)snapshot:(NSString*)path
{
    @try {
        if (_player) {
            [_player saveVideoSnapshotAt:path withWidth:_player.videoSize.width andHeight:_player.videoSize.height];
            self.onSnapshot(@{
                @"success": @YES,
                @"path": path,
                @"error": [NSNull null],
                @"target": self.reactTag
            });
        } else {
            @throw [NSException exceptionWithName:@"PlayerNotInitialized" reason:@"Player is not initialized" userInfo:nil];
        }
    } @catch (NSException *e) {
        NSLog(@"Error in snapshot: %@", e);
        self.onSnapshot(@{
            @"success": @NO,
            @"error": [e description],
            @"target": self.reactTag
        });
    }
}

- (void)setVideoAspectRatio:(NSString *)ratio{
    char *char_content = [ratio cStringUsingEncoding:NSASCIIStringEncoding];
    [_player setVideoAspectRatio:char_content];
}

- (void)setMuted:(BOOL)value
{
    if (_player) {
        [[_player audio] setMuted:value];
    }
}

#pragma mark - VLCCustomDialogRendererProtocol

- (void)showErrorWithTitle:(NSString *)title message:(NSString *)message {
    NSLog(@"VLC Error - Title: %@, Message: %@", title, message);
    if (self.onVideoError) {
        self.onVideoError(@{
            @"target": self.reactTag,
            @"title": title ?: [NSNull null],
            @"message": message ?: [NSNull null]
        });
    }
}

- (void)showLoginWithTitle:(NSString *)title
                   message:(NSString *)message
           defaultUsername:(NSString *)username
          askingForStorage:(BOOL)askingForStorage
             withReference:(NSValue *)reference {
    NSLog(@"VLC Login - Title: %@, Message: %@", title, message);
    if (self.onVideoError) {
        self.onVideoError(@{
            @"target": self.reactTag,
            @"title": title ?: [NSNull null],
            @"message": message ?: [NSNull null]
        });
    }
}

- (void)showQuestionWithTitle:(NSString *)title
                      message:(NSString *)message
                         type:(VLCDialogQuestionType)type
                 cancelString:(NSString *)cancel
               action1String:(NSString *)action1
               action2String:(NSString *)action2
               withReference:(NSValue *)reference {
    
    NSLog(@"VLC Question - Title: %@, Message: %@", title, message);
    
    // Check if this is a certificate-related dialog
    NSString *fullText = [NSString stringWithFormat:@"%@ %@", title ?: @"", message ?: @""];
    BOOL isCertificateDialog = [fullText containsString:@"certificate"] || 
                              [fullText containsString:@"SSL"] || 
                              [fullText containsString:@"TLS"] ||
                              [fullText containsString:@"cert"] ||
                              [fullText containsString:@"security"];
    
    if (isCertificateDialog) {
        if (_acceptInvalidCertificates) {
            // Accept certificate (usually action1)
            [self.dialogProvider postAction:1 forDialogReference:reference];
            NSLog(@"iOS: Auto-accepted certificate dialog");
        } else {
            // Reject certificate (cancel)
            [self.dialogProvider postAction:3 forDialogReference:reference]; // Cancel
            NSLog(@"iOS: Rejected certificate dialog");
        }
    } else {
        // For other dialogs, default to cancel
        [self.dialogProvider postAction:3 forDialogReference:reference];
    }
}

- (void)showProgressWithTitle:(NSString *)title 
                      message:(NSString *)message 
                isIndeterminate:(BOOL)indeterminate 
                       position:(float)position 
                 cancelString:(NSString *)cancel 
                withReference:(NSValue *)reference {
    NSLog(@"VLC Progress - Title: %@, Message: %@, Position: %.2f", title, message, position);
    // Handle progress dialog if needed
}

- (void)updateProgressWithReference:(NSValue *)reference 
                            message:(NSString *)message 
                           position:(float)position {
    // Update progress dialog
}

- (void)cancelDialogWithReference:(NSValue *)reference {
    NSLog(@"VLC Dialog cancelled");
    // Handle dialog cancellation
}

- (void)setAcceptInvalidCertificates:(BOOL)accept 
{
    _acceptInvalidCertificates = accept;
    NSLog(@"iOS: Set acceptInvalidCertificates to %@", accept ? @"YES" : @"NO");
}

- (void)_release
{
    [[NSNotificationCenter defaultCenter] removeObserver:self];

    if (_player.media)
        [_player stop];

    if (_player)
        _player = nil;

    _eventDispatcher = nil;
}


#pragma mark - Lifecycle
- (void)removeFromSuperview
{
    NSLog(@"removeFromSuperview");
    [self _release];
    [super removeFromSuperview];
}

@end