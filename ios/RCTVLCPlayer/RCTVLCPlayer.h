#import "React/RCTView.h"

@class RCTEventDispatcher;

@interface RCTVLCPlayer : UIView

@property (nonatomic, copy) RCTBubblingEventBlock onVideoProgress;
@property (nonatomic, copy) RCTBubblingEventBlock onVideoPaused;
@property (nonatomic, copy) RCTBubblingEventBlock onVideoStopped;
@property (nonatomic, copy) RCTBubblingEventBlock onVideoBuffering;
@property (nonatomic, copy) RCTBubblingEventBlock onVideoPlaying;
@property (nonatomic, copy) RCTBubblingEventBlock onVideoEnded;
@property (nonatomic, copy) RCTBubblingEventBlock onVideoError;
@property (nonatomic, copy) RCTBubblingEventBlock onVideoOpen;
@property (nonatomic, copy) RCTBubblingEventBlock onVideoLoadStart;


- (instancetype)initWithEventDispatcher:(RCTEventDispatcher *)eventDispatcher NS_DESIGNATED_INITIALIZER;

@end
