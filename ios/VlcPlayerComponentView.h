#ifdef RCT_NEW_ARCH_ENABLED

#import <React/RCTViewComponentView.h>
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

/// Adapter for the New Architecture. Holds the Swift core and translates between
/// the generated C++ props/events and the core's Foundation interface.
@interface VlcPlayerComponentView : RCTViewComponentView

@end

NS_ASSUME_NONNULL_END

#endif
