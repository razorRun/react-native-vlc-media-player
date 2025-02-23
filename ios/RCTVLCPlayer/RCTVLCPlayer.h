#import "React/RCTView.h"
#import <React/RCTEventDispatcherProtocol.h>
#if TARGET_OS_TV
#import <TVVLCKit/TVVLCKit.h>
#else
#import <MobileVLCKit/MobileVLCKit.h>
#endif

@class RCTEventDispatcher;

@interface RCTVLCPlayer : UIView <VLCMediaPlayerDelegate>

@property (nonatomic, copy) RCTBubblingEventBlock onVideoProgress;
@property (nonatomic, copy) RCTBubblingEventBlock onVideoPaused;
@property (nonatomic, copy) RCTBubblingEventBlock onVideoStopped;
@property (nonatomic, copy) RCTBubblingEventBlock onVideoBuffering;
@property (nonatomic, copy) RCTBubblingEventBlock onVideoPlaying;
@property (nonatomic, copy) RCTBubblingEventBlock onVideoEnded;
@property (nonatomic, copy) RCTBubblingEventBlock onVideoError;
@property (nonatomic, copy) RCTBubblingEventBlock onVideoOpen;
@property (nonatomic, copy) RCTBubblingEventBlock onVideoLoadStart;
@property (nonatomic, copy) RCTBubblingEventBlock onVideoLoad;

- (instancetype)initWithEventDispatcher:(id<RCTEventDispatcherProtocol>)eventDispatcher NS_DESIGNATED_INITIALIZER;

- (void)setMuted:(BOOL)value;

@end
