import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import type { ComponentRef } from 'react';
import { Image, StyleSheet } from 'react-native';

import VlcPlayerView, { Commands } from './VlcPlayerViewNativeComponent';
import type { NativeSource } from './VlcPlayerViewNativeComponent';
import type {
  OnRecordingStateEventProps,
  PlaybackMethods,
  VLCPlayerNativeOnlyProps,
  VLCPlayerProps,
  VLCPlayerSource,
} from './types';

type NativeRef = ComponentRef<typeof VlcPlayerView>;

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});

/**
 * Resolve the `source` prop into the object the native side expects.
 *
 * `Image.resolveAssetSource` returns object sources unchanged, so everything
 * below works on a copy: the previous implementation mutated the caller's own
 * object (including pushing `--repeat` into their `initOptions` array).
 */
function resolveSource(
  source: VLCPlayerProps['source'],
  autoplay: boolean,
  repeat: boolean | undefined
): NativeSource {
  const resolved =
    typeof source === 'number'
      ? ((Image.resolveAssetSource(source) ?? {}) as VLCPlayerSource)
      : (source ?? ({} as VLCPlayerSource));

  const uri = resolved.uri ?? '';
  // Preserved from the original: anything that is not one of these schemes counts
  // as network, and an absolute path counts as local.
  const isAsset = /^(assets-library|file|content|ms-appx|ms-appdata):/.test(
    uri
  );
  const isNetwork = !isAsset && !uri.startsWith('/');

  const initOptions = [...(resolved.initOptions ?? [])];
  if (repeat) {
    const hasRepeat = initOptions.some(
      (item) => item.startsWith('--repeat') || item.startsWith('--input-repeat')
    );
    if (!hasRepeat) {
      initOptions.push('--repeat');
    }
  }

  return { ...resolved, initOptions, isNetwork, autoplay };
}

/**
 * A component that can be used to show a playback.
 *
 * The imperative methods are reachable through a ref:
 *
 * ```tsx
 * const player = useRef<PlaybackMethods>(null);
 * <VLCPlayer ref={player} source={{ uri }} />
 * player.current?.seek(0.5);
 * ```
 */
const VLCPlayer = forwardRef<PlaybackMethods, VLCPlayerProps>(
  function VLCPlayer(props, ref) {
    const {
      autoplay = true,
      onBuffering,
      onEnd,
      onError,
      onLoad,
      onLoadStart,
      onOpen,
      onPaused,
      onPlaying,
      onProgress,
      onRecordingCreated,
      onSnapshot,
      onStopped,
      playInBackground: _playInBackground,
      resizeMode: _resizeMode,
      repeat,
      source,
      style,
      ...rest
    } = props;

    const nativeRef = useRef<NativeRef | null>(null);
    const lastRecording = useRef<string | undefined>(undefined);

    /** Commands need a mounted view; before mount there is nothing to talk to. */
    const withView = useCallback((dispatch: (view: NativeRef) => void) => {
      const view = nativeRef.current;
      if (view != null) {
        dispatch(view);
      }
    }, []);

    useImperativeHandle(
      ref,
      (): PlaybackMethods => ({
        startRecording: (path) =>
          withView((view) => Commands.startRecording(view, path)),
        stopRecording: () => withView((view) => Commands.stopRecording(view)),
        stopPlayer: () => withView((view) => Commands.stopPlayer(view)),
        snapshot: (path) => withView((view) => Commands.snapshot(view, path)),
        seek: (pos) => withView((view) => Commands.seek(view, pos)),
        resume: (isResume = true) =>
          withView((view) => Commands.applyResume(view, isResume)),
        autoAspectRatio: (isAuto) =>
          withView((view) => Commands.applyAutoAspectRatio(view, isAuto)),
        changeVideoAspectRatio: (ratio) =>
          withView((view) => Commands.applyAspectRatio(view, ratio)),
        setNativeProps: (
          nativeProps: Partial<VLCPlayerProps> & VLCPlayerNativeOnlyProps
        ) => {
          // Deprecated passthrough; the library itself no longer uses it.
          nativeRef.current?.setNativeProps(nativeProps);
        },
      }),
      [withView]
    );

    const handleStopped = useCallback(() => {
      // The player must not pick playback back up on the next render. This used
      // to be setNativeProps({ paused: true }), which wrote behind React's back.
      withView((view) => Commands.applyPaused(view, true));
      onStopped?.();
    }, [onStopped, withView]);

    const handleRecordingState = useCallback(
      (event: { nativeEvent: OnRecordingStateEventProps }) => {
        const { isRecording, recordPath } = event.nativeEvent;
        if (lastRecording.current === recordPath) {
          return;
        }
        if (!isRecording && recordPath) {
          lastRecording.current = recordPath;
          onRecordingCreated?.(recordPath);
        }
      },
      [onRecordingCreated]
    );

    return (
      <VlcPlayerView
        ref={nativeRef}
        {...rest}
        autoplay={autoplay}
        repeat={repeat}
        style={[styles.base, style]}
        source={resolveSource(source, autoplay, repeat)}
        onVideoLoadStart={(e) => onLoadStart?.(e.nativeEvent)}
        onVideoOpen={(e) => onOpen?.(e.nativeEvent)}
        onVideoError={(e) => onError?.(e.nativeEvent)}
        onVideoProgress={(e) => onProgress?.(e.nativeEvent)}
        onVideoEnd={(e) => onEnd?.(e.nativeEvent)}
        onVideoEnded={(e) => onEnd?.(e.nativeEvent)}
        onVideoPlaying={(e) => onPlaying?.(e.nativeEvent)}
        onVideoPaused={(e) => onPaused?.(e.nativeEvent)}
        onVideoStopped={handleStopped}
        onVideoBuffering={(e) => onBuffering?.(e.nativeEvent)}
        onVideoLoad={(e) => onLoad?.(e.nativeEvent)}
        onRecordingState={handleRecordingState}
        onSnapshot={(e) => {
          if (e.nativeEvent.success) {
            onSnapshot?.(e.nativeEvent);
          }
        }}
        progressUpdateInterval={onProgress ? 250 : 0}
      />
    );
  }
);

export default VLCPlayer;
