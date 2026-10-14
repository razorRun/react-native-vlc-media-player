// Adapter for the Legacy Architecture. Guarded like its implementation so that
// Phase 3 deletes both files in one piece (see MODERNIZATION.md).
#ifndef RCT_NEW_ARCH_ENABLED

#import <React/RCTViewManager.h>

@interface RCTVLCPlayerManager : RCTViewManager

@end

#endif
