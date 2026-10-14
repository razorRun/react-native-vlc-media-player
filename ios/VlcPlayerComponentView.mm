#ifdef RCT_NEW_ARCH_ENABLED

#import "VlcPlayerComponentView.h"

#import <react/renderer/components/ReactNativeVlcMediaPlayerSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeVlcMediaPlayerSpec/EventEmitters.h>
#import <react/renderer/components/ReactNativeVlcMediaPlayerSpec/Props.h>
#import <react/renderer/components/ReactNativeVlcMediaPlayerSpec/RCTComponentViewHelpers.h>

#import <React/RCTConversions.h>
#import <React/RCTFabricComponentsPlugins.h>

#import "react_native_vlc_media_player-Swift.h"

using namespace facebook::react;

namespace {

NSString *_Nullable NSStringOrNil(const std::string &value)
{
    return value.empty() ? nil : [NSString stringWithUTF8String:value.c_str()];
}

double DoubleValue(NSDictionary *payload, NSString *key)
{
    id value = payload[key];
    return [value isKindOfClass:[NSNumber class]] ? [value doubleValue] : 0;
}

int IntValue(NSDictionary *payload, NSString *key)
{
    id value = payload[key];
    return [value isKindOfClass:[NSNumber class]] ? [value intValue] : 0;
}

bool BoolValue(NSDictionary *payload, NSString *key)
{
    id value = payload[key];
    return [value isKindOfClass:[NSNumber class]] ? [value boolValue] : false;
}

std::string StringValue(NSDictionary *payload, NSString *key)
{
    id value = payload[key];
    return [value isKindOfClass:[NSString class]] ? std::string([value UTF8String]) : std::string();
}

/// The source struct has no operator== outside RN_SERIALIZABLE_STATE builds.
bool SourceEqual(const VlcPlayerViewSourceStruct &lhs, const VlcPlayerViewSourceStruct &rhs)
{
    return lhs.uri == rhs.uri && lhs.type == rhs.type && lhs.isNetwork == rhs.isNetwork &&
        lhs.autoplay == rhs.autoplay && lhs.initType == rhs.initType &&
        lhs.initOptions == rhs.initOptions && lhs.mainVer == rhs.mainVer &&
        lhs.patchVer == rhs.patchVer && lhs.mediaOptions == rhs.mediaOptions &&
        lhs.hwDecoderEnabled == rhs.hwDecoderEnabled && lhs.hwDecoderForced == rhs.hwDecoderForced;
}

NSDictionary *SourceToDictionary(const VlcPlayerViewSourceStruct &source)
{
    NSMutableArray<NSString *> *initOptions = [NSMutableArray arrayWithCapacity:source.initOptions.size()];
    for (const auto &option : source.initOptions) {
        [initOptions addObject:[NSString stringWithUTF8String:option.c_str()]];
    }
    return @{
        @"uri" : NSStringOrNil(source.uri) ?: @"",
        @"type" : NSStringOrNil(source.type) ?: @"",
        @"isNetwork" : @(source.isNetwork),
        @"autoplay" : @(source.autoplay),
        @"initType" : @(source.initType),
        @"initOptions" : initOptions,
        @"mainVer" : @(source.mainVer),
        @"patchVer" : @(source.patchVer),
    };
}

}  // namespace

@interface VlcPlayerComponentView () <RCTVlcPlayerViewViewProtocol>
@end

@implementation VlcPlayerComponentView {
    VlcPlayerView *_view;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
    return concreteComponentDescriptorProvider<VlcPlayerViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
    if (self = [super initWithFrame:frame]) {
        static const auto defaultProps = std::make_shared<const VlcPlayerViewProps>();
        _props = defaultProps;

        _view = [[VlcPlayerView alloc] initWithFrame:frame];
        [self wireEvents];
        self.contentView = _view;
    }
    return self;
}

#pragma mark - Events

/// `target` is the react tag. React Native fills it in itself on the legacy path;
/// here the adapter has to, which is the only reason the tag is read at all.
///
/// Every caller checks for nil first: this returns a std::shared_ptr, and sending a
/// message to nil is only defined for scalars and small structs.
- (std::shared_ptr<const VlcPlayerViewEventEmitter>)emitter
{
    if (!_eventEmitter) {
        return nullptr;
    }
    return std::static_pointer_cast<const VlcPlayerViewEventEmitter>(_eventEmitter);
}

- (void)wireEvents
{
    // Weak, or the core would retain the component view that owns it.
    __weak VlcPlayerComponentView *weakSelf = self;

    _view.onVideoLoadStart = ^(NSDictionary *payload) {
        VlcPlayerComponentView *strongSelf = weakSelf;
        if (strongSelf == nil) {
            return;
        }
        auto emitter = strongSelf.emitter;
        if (emitter) {
            emitter->onVideoLoadStart({.target = (int)strongSelf.tag});
        }
    };

    _view.onVideoOpen = ^(NSDictionary *payload) {
        VlcPlayerComponentView *strongSelf = weakSelf;
        if (strongSelf == nil) {
            return;
        }
        auto emitter = strongSelf.emitter;
        if (emitter) {
            emitter->onVideoOpen({.target = (int)strongSelf.tag});
        }
    };

    _view.onVideoPaused = ^(NSDictionary *payload) {
        VlcPlayerComponentView *strongSelf = weakSelf;
        if (strongSelf == nil) {
            return;
        }
        auto emitter = strongSelf.emitter;
        if (emitter) {
            emitter->onVideoPaused({.target = (int)strongSelf.tag});
        }
    };

    _view.onVideoStopped = ^(NSDictionary *payload) {
        VlcPlayerComponentView *strongSelf = weakSelf;
        if (strongSelf == nil) {
            return;
        }
        auto emitter = strongSelf.emitter;
        if (emitter) {
            emitter->onVideoStopped({.target = (int)strongSelf.tag});
        }
    };

    _view.onVideoBuffering = ^(NSDictionary *payload) {
        VlcPlayerComponentView *strongSelf = weakSelf;
        if (strongSelf == nil) {
            return;
        }
        auto emitter = strongSelf.emitter;
        if (emitter) {
            emitter->onVideoBuffering({.target = (int)strongSelf.tag});
        }
    };

    _view.onVideoError = ^(NSDictionary *payload) {
        VlcPlayerComponentView *strongSelf = weakSelf;
        if (strongSelf == nil) {
            return;
        }
        auto emitter = strongSelf.emitter;
        if (emitter) {
            emitter->onVideoError({.target = (int)strongSelf.tag});
        }
    };

    _view.onVideoEnded = ^(NSDictionary *payload) {
        VlcPlayerComponentView *strongSelf = weakSelf;
        if (strongSelf == nil) {
            return;
        }
        auto emitter = strongSelf.emitter;
        if (emitter) {
            emitter->onVideoEnded({.target = (int)strongSelf.tag});
        }
    };

    _view.onVideoPlaying = ^(NSDictionary *payload) {
        VlcPlayerComponentView *strongSelf = weakSelf;
        if (strongSelf == nil) {
            return;
        }
        auto emitter = strongSelf.emitter;
        if (emitter) {
            emitter->onVideoPlaying({
                .target = (int)strongSelf.tag,
                .duration = DoubleValue(payload, @"duration"),
                .seekable = BoolValue(payload, @"seekable"),
            });
        }
    };

    _view.onVideoProgress = ^(NSDictionary *payload) {
        VlcPlayerComponentView *strongSelf = weakSelf;
        if (strongSelf == nil) {
            return;
        }
        auto emitter = strongSelf.emitter;
        if (emitter) {
            emitter->onVideoProgress({
                .target = (int)strongSelf.tag,
                .duration = DoubleValue(payload, @"duration"),
                .currentTime = DoubleValue(payload, @"currentTime"),
                .position = DoubleValue(payload, @"position"),
                .remainingTime = DoubleValue(payload, @"remainingTime"),
            });
        }
    };

    _view.onVideoLoad = ^(NSDictionary *payload) {
        VlcPlayerComponentView *strongSelf = weakSelf;
        if (strongSelf == nil) {
            return;
        }
        auto emitter = strongSelf.emitter;
        if (!emitter) {
            return;
        }

        VlcPlayerViewEventEmitter::OnVideoLoad event{};
        event.target = (int)strongSelf.tag;
        event.duration = DoubleValue(payload, @"duration");

        NSDictionary *videoSize = payload[@"videoSize"];
        if ([videoSize isKindOfClass:[NSDictionary class]]) {
            event.videoSize = {
                .width = DoubleValue(videoSize, @"width"),
                .height = DoubleValue(videoSize, @"height"),
            };
        }

        for (NSDictionary *track in payload[@"audioTracks"]) {
            event.audioTracks.push_back({
                .id = IntValue(track, @"id"),
                .name = StringValue(track, @"name"),
            });
        }
        for (NSDictionary *track in payload[@"textTracks"]) {
            event.textTracks.push_back({
                .id = IntValue(track, @"id"),
                .name = StringValue(track, @"name"),
            });
        }

        emitter->onVideoLoad(event);
    };

    _view.onRecordingState = ^(NSDictionary *payload) {
        VlcPlayerComponentView *strongSelf = weakSelf;
        if (strongSelf == nil) {
            return;
        }
        auto emitter = strongSelf.emitter;
        if (emitter) {
            emitter->onRecordingState({
                .isRecording = BoolValue(payload, @"isRecording"),
                .recordPath = StringValue(payload, @"recordPath"),
            });
        }
    };

    _view.onSnapshot = ^(NSDictionary *payload) {
        VlcPlayerComponentView *strongSelf = weakSelf;
        if (strongSelf == nil) {
            return;
        }
        auto emitter = strongSelf.emitter;
        if (emitter) {
            emitter->onSnapshot({
                .success = BoolValue(payload, @"success"),
                .path = StringValue(payload, @"path"),
                .error = StringValue(payload, @"error"),
            });
        }
    };
}

#pragma mark - Props

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
    const auto &oldViewProps = *std::static_pointer_cast<const VlcPlayerViewProps>(_props);
    const auto &newViewProps = *std::static_pointer_cast<const VlcPlayerViewProps>(props);

    // Autoplay before source: the core reads it while building the player.
    if (oldViewProps.autoplay != newViewProps.autoplay) {
        _view.autoplay = newViewProps.autoplay;
    }
    if (!SourceEqual(oldViewProps.source, newViewProps.source)) {
        _view.source = SourceToDictionary(newViewProps.source);
    }
    if (oldViewProps.subtitleUri != newViewProps.subtitleUri) {
        _view.subtitleUri = NSStringOrNil(newViewProps.subtitleUri);
    }
    if (oldViewProps.paused != newViewProps.paused) {
        _view.paused = newViewProps.paused;
    }
    if (oldViewProps.muted != newViewProps.muted) {
        _view.muted = newViewProps.muted;
    }
    if (oldViewProps.seek != newViewProps.seek) {
        _view.seek = newViewProps.seek;
    }
    if (oldViewProps.rate != newViewProps.rate) {
        _view.rate = newViewProps.rate;
    }
    if (oldViewProps.resume != newViewProps.resume) {
        _view.resume = newViewProps.resume;
    }
    if (oldViewProps.videoAspectRatio != newViewProps.videoAspectRatio) {
        _view.videoAspectRatio = NSStringOrNil(newViewProps.videoAspectRatio);
    }
    if (oldViewProps.audioTrack != newViewProps.audioTrack) {
        _view.audioTrack = newViewProps.audioTrack;
    }
    if (oldViewProps.textTrack != newViewProps.textTrack) {
        _view.textTrack = newViewProps.textTrack;
    }
    if (oldViewProps.acceptInvalidCertificates != newViewProps.acceptInvalidCertificates) {
        _view.acceptInvalidCertificates = newViewProps.acceptInvalidCertificates;
    }
    if (oldViewProps.snapshotPath != newViewProps.snapshotPath) {
        _view.snapshotPath = NSStringOrNil(newViewProps.snapshotPath);
    }

    // repeat, volume, autoAspectRatio, progressUpdateInterval and clear are
    // declared in the spec because Android reads them. iOS never did.

    [super updateProps:props oldProps:oldProps];
}

#pragma mark - Commands

- (void)startRecording:(NSString *)path
{
    [_view startRecording:path];
}

- (void)stopRecording
{
    [_view stopRecording];
}

- (void)stopPlayer
{
    [_view stopPlayer];
}

- (void)snapshot:(NSString *)path
{
    [_view snapshot:path];
}

- (void)seek:(float)position
{
    [_view applySeek:position];
}

- (void)applyResume:(BOOL)isResume
{
    [_view applyResume:isResume];
}

- (void)applyPaused:(BOOL)paused
{
    [_view applyPaused:paused];
}

- (void)applyAspectRatio:(NSString *)ratio
{
    [_view applyAspectRatio:ratio];
}

- (void)applyAutoAspectRatio:(BOOL)isAuto
{
    // MobileVLCKit has no automatic aspect ratio on this code path.
}

#pragma mark - Lifecycle

- (void)prepareForRecycle
{
    [_view releasePlayer];
    [super prepareForRecycle];
}

@end

// React Native's generated RCTThirdPartyFabricComponentsProvider looks this up by
// name to map the component to its view class.
Class<RCTComponentViewProtocol> VlcPlayerViewCls(void)
{
    return VlcPlayerComponentView.class;
}

#endif
