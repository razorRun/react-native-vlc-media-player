// Adapter for the Legacy Architecture.
//
// The whole file is behind the guard, so Phase 3 deletes it rather than editing
// it. It is ObjC++ (.mm) on purpose: install_modules_dependencies() puts
// -DRCT_NEW_ARCH_ENABLED=1 into OTHER_CPLUSPLUSFLAGS and OTHER_SWIFT_FLAGS only,
// never into GCC_PREPROCESSOR_DEFINITIONS, so the macro is invisible to a plain
// .m file and the guard would silently never fire.
#ifndef RCT_NEW_ARCH_ENABLED

#import "RCTVLCPlayerManager.h"

#import <React/RCTBridge.h>
#import <React/RCTLog.h>
#import <React/RCTUIManager.h>

#import "react_native_vlc_media_player-Swift.h"

@implementation RCTVLCPlayerManager

// React Native strips the "Manager" suffix, so the view is registered as
// `VlcPlayerView` — the same name Fabric uses. The JS side asks for exactly one
// name on both architectures (see VlcPlayerViewNativeComponent.ts).
RCT_EXPORT_MODULE(VlcPlayerViewManager);

@synthesize bridge = _bridge;

- (UIView *)view
{
    // Explicit: the Swift core declares initWithFrame: as its designated
    // initialiser, so -init is not part of its Swift-visible surface.
    return [[VlcPlayerView alloc] initWithFrame:CGRectZero];
}

- (dispatch_queue_t)methodQueue
{
    return dispatch_get_main_queue();
}

#pragma mark - Events
//
// The core declares these as plain `((NSDictionary) -> Void)?` closures, which is
// block-compatible with RCTDirectEventBlock. React Native adds `target` to every
// body itself (RCTComponentEvent), which is why the core never sees a view tag.

RCT_EXPORT_VIEW_PROPERTY(onVideoLoadStart, RCTDirectEventBlock);
RCT_EXPORT_VIEW_PROPERTY(onVideoOpen, RCTDirectEventBlock);
RCT_EXPORT_VIEW_PROPERTY(onVideoLoad, RCTDirectEventBlock);
RCT_EXPORT_VIEW_PROPERTY(onVideoProgress, RCTDirectEventBlock);
RCT_EXPORT_VIEW_PROPERTY(onVideoPlaying, RCTDirectEventBlock);
RCT_EXPORT_VIEW_PROPERTY(onVideoPaused, RCTDirectEventBlock);
RCT_EXPORT_VIEW_PROPERTY(onVideoStopped, RCTDirectEventBlock);
RCT_EXPORT_VIEW_PROPERTY(onVideoBuffering, RCTDirectEventBlock);
RCT_EXPORT_VIEW_PROPERTY(onVideoError, RCTDirectEventBlock);
RCT_EXPORT_VIEW_PROPERTY(onVideoEnded, RCTDirectEventBlock);
RCT_EXPORT_VIEW_PROPERTY(onRecordingState, RCTDirectEventBlock);
RCT_EXPORT_VIEW_PROPERTY(onSnapshot, RCTDirectEventBlock);

#pragma mark - Props

RCT_EXPORT_VIEW_PROPERTY(source, NSDictionary);
RCT_EXPORT_VIEW_PROPERTY(subtitleUri, NSString);
RCT_EXPORT_VIEW_PROPERTY(paused, BOOL);
RCT_EXPORT_VIEW_PROPERTY(seek, float);
RCT_EXPORT_VIEW_PROPERTY(rate, float);
RCT_EXPORT_VIEW_PROPERTY(resume, BOOL);
RCT_EXPORT_VIEW_PROPERTY(videoAspectRatio, NSString);
RCT_EXPORT_VIEW_PROPERTY(snapshotPath, NSString);
RCT_EXPORT_VIEW_PROPERTY(muted, BOOL);
RCT_EXPORT_VIEW_PROPERTY(audioTrack, int);
RCT_EXPORT_VIEW_PROPERTY(textTrack, int);
RCT_EXPORT_VIEW_PROPERTY(autoplay, BOOL);
RCT_EXPORT_VIEW_PROPERTY(acceptInvalidCertificates, BOOL);

#pragma mark - Commands
//
// These have to stay. On the Legacy Architecture a codegen command is dispatched
// by name through RCTUIManager, which resolves it against this module's exported
// methods (`methodsByName`) and prepends the react tag — there is no other hook.

- (void)withView:(nonnull NSNumber *)reactTag perform:(void (^)(VlcPlayerView *view))block
{
    [self.bridge.uiManager addUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *, UIView *> *viewRegistry) {
        UIView *view = viewRegistry[reactTag];
        if (![view isKindOfClass:[VlcPlayerView class]]) {
            RCTLogError(@"Cannot find VlcPlayerView with tag #%@", reactTag);
            return;
        }
        block((VlcPlayerView *)view);
    }];
}

RCT_EXPORT_METHOD(startRecording:(nonnull NSNumber *)reactTag withPath:(NSString *)path) {
    [self withView:reactTag perform:^(VlcPlayerView *view) { [view startRecording:path]; }];
}

RCT_EXPORT_METHOD(stopRecording:(nonnull NSNumber *)reactTag) {
    [self withView:reactTag perform:^(VlcPlayerView *view) { [view stopRecording]; }];
}

RCT_EXPORT_METHOD(stopPlayer:(nonnull NSNumber *)reactTag) {
    [self withView:reactTag perform:^(VlcPlayerView *view) { [view stopPlayer]; }];
}

RCT_EXPORT_METHOD(snapshot:(nonnull NSNumber *)reactTag withPath:(NSString *)path) {
    [self withView:reactTag perform:^(VlcPlayerView *view) { [view snapshot:path]; }];
}

RCT_EXPORT_METHOD(seek:(nonnull NSNumber *)reactTag position:(nonnull NSNumber *)position) {
    float pos = [position floatValue];
    [self withView:reactTag perform:^(VlcPlayerView *view) { [view applySeek:pos]; }];
}

RCT_EXPORT_METHOD(applyResume:(nonnull NSNumber *)reactTag isResume:(BOOL)isResume) {
    [self withView:reactTag perform:^(VlcPlayerView *view) { [view applyResume:isResume]; }];
}

RCT_EXPORT_METHOD(applyPaused:(nonnull NSNumber *)reactTag paused:(BOOL)paused) {
    [self withView:reactTag perform:^(VlcPlayerView *view) { [view applyPaused:paused]; }];
}

RCT_EXPORT_METHOD(applyAspectRatio:(nonnull NSNumber *)reactTag ratio:(NSString *)ratio) {
    [self withView:reactTag perform:^(VlcPlayerView *view) { [view applyAspectRatio:ratio]; }];
}

// MobileVLCKit has no automatic aspect ratio on this code path, so iOS answers the
// command with nothing. Declared so that the command exists on both platforms and
// RCTUIManager does not log "No command found with name".
RCT_EXPORT_METHOD(applyAutoAspectRatio:(nonnull NSNumber *)reactTag isAuto:(BOOL)isAuto) {
}

@end

#endif
