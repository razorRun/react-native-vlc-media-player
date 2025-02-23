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
    id<RCTEventDispatcherProtocol> _eventDispatcher;
    VLCMediaPlayer *_player;

    NSDictionary * _videoInfo;
    NSURL * _subtitleUri;

    BOOL _paused;
    BOOL _autoplay;
}

- (instancetype)initWithEventDispatcher:(id<RCTEventDispatcherProtocol>)eventDispatcher
{
    if ((self = [super initWithFrame:CGRectZero])) {
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

- (instancetype)initWithFrame:(CGRect)frame {
    return [self initWithEventDispatcher:nil];
}

- (instancetype)initWithCoder:(NSCoder *)coder {
    return [self initWithEventDispatcher:nil];
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
    int initType = [[source objectForKey:@"initType"] intValue];
    NSArray* initOptions = [source objectForKey:@"initOptions"];

    if (initType == 1) {
        _player = [[VLCMediaPlayer alloc] init];
    } else {
        _player = [[VLCMediaPlayer alloc] initWithOptions:initOptions];
    }
    _player.delegate = self;
    _player.drawable = self;
    // [bavv edit end]

    _player.media = [VLCMedia mediaWithURL:uri];
    
    [[AVAudioSession sharedInstance] setActive:NO withOptions:AVAudioSessionSetActiveOptionNotifyOthersOnDeactivation error:nil];

    self.onVideoLoadStart(@{
                           @"target": self.reactTag
                           });
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
    NSLog(@"userInfo %@",[aNotification userInfo]);
    if (_player) {
        VLCMediaPlayerState state = _player.state;
        switch (state) {
            case VLCMediaPlayerStateOpening: {
                     NSLog(@"VLCMediaPlayerStateOpening  %i", _player.numberOfAudioTracks);
                    self.onVideoOpen(@{
                                         @"target": self.reactTag
                                         });
                    break;
            }
            case VLCMediaPlayerStatePaused: {
                _paused = YES;
                NSLog(@"VLCMediaPlayerStatePaused %i", _player.numberOfAudioTracks);
                self.onVideoPaused(@{
                                     @"target": self.reactTag
                                     });
                break;
            }
            case VLCMediaPlayerStateStopped: {
                NSLog(@"VLCMediaPlayerStateStopped %i", _player.numberOfAudioTracks);
                self.onVideoStopped(@{
                                      @"target": self.reactTag
                                      });
                break;
            }
            case VLCMediaPlayerStateBuffering: {
                NSLog(@"VLCMediaPlayerStateBuffering %i", _player.numberOfAudioTracks);
                if (!_videoInfo && _player.numberOfAudioTracks > 0) {
                    _videoInfo = [self getVideoInfo];
                    self.onVideoLoad(_videoInfo);
                }


                self.onVideoBuffering(@{
                                        @"target": self.reactTag
                                        });
                break;
            }
            case VLCMediaPlayerStatePlaying: {
                _paused = NO;
                NSLog(@"VLCMediaPlayerStatePlaying %i", _player.numberOfAudioTracks);
                self.onVideoPlaying(@{
                                      @"target": self.reactTag,
                                      @"seekable": [NSNumber numberWithBool:[_player isSeekable]],
                                      @"duration":[NSNumber numberWithInt:[_player.media.length intValue]]
                                      });
                break;
            }
            case VLCMediaPlayerStateEnded: {
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
            }
            case VLCMediaPlayerStateError:  {
                NSLog(@"VLCMediaPlayerStateError %i", _player.numberOfAudioTracks);
                self.onVideoError(@{
                                    @"target": self.reactTag
                                    });
                [self _release];
                break;
            }
            default: {
                break;
            }
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

//   ===================================

- (void)updateVideoProgress
{
    if (_player) {
        int currentTime   = [[_player time] intValue];
        int remainingTime = [[_player remainingTime] intValue];
        int duration      = [_player.media.length intValue];

        if ( currentTime >= 0 && currentTime < duration) {
            self.onVideoProgress(@{
                                   @"target": self.reactTag,
                                   @"currentTime": [NSNumber numberWithInt:currentTime],
                                   @"remainingTime": [NSNumber numberWithInt:remainingTime],
                                   @"duration":[NSNumber numberWithInt:duration],
                                   @"position":[NSNumber numberWithFloat:_player.position]
                                   });
        }
    }
}

- (NSDictionary *)getVideoInfo
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

        return info;
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


- (void)setVideoAspectRatio:(NSString *)ratio{
    char *char_content = strdup([ratio cStringUsingEncoding:NSASCIIStringEncoding]);
    [_player setVideoAspectRatio:char_content];
    free(char_content);
}

- (void)setMuted:(BOOL)value
{
    if (_player) {
        [[_player audio] setMuted:value];
    }
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
