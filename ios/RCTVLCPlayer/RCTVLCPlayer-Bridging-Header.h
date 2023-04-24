//
//  Use this file to import your target's public headers that you would like to expose to Swift.
//

#import <React/RCTViewManager.h>
#import <React/RCTView.h>
#import <React/RCTConvert.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventDispatcher.h>
#import <React/UIView+React.h>

#ifdef TARGET_OS_TV
#import <TVVLCKit/TVVLCKit.h>
#else
#import <MobileVLCKit/MobileVLCKit.h>
#endif
