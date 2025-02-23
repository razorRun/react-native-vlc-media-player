import type { VLCPlayerProps } from './types/js';
import type { NativePlayerCommands, NativePlayerProps } from './types/native';
import type {
  AndroidVideoBufferingEvent,
  AndroidVideoEndEvent,
  AndroidVideoErrorEvent,
  AndroidVideoLoadEvent,
  AndroidVideoOpenEvent,
  AndroidVideoPausedEvent,
  AndroidVideoPlayingEvent,
  AndroidVideoProgressEvent,
  AndroidVideoStoppedEvent,
} from './types/android';
import type { VideoTargetEvent } from './types/shared';
import type { IosVideoEndedEvent, IosVideoLoadEvent, IosVideoPlayingEvent, IosVideoProgressEvent } from './types/ios';
import { resolveAssetSource } from './source';
import { Component, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { requireNativeComponent, StyleSheet, type NativeMethods, type NativeSyntheticEvent } from 'react-native';

const RCTVLCPlayer = requireNativeComponent<NativePlayerProps>('RCTVLCPlayer');

export const VLCPlayer = ({
  source,
  style,
  autoplay = true,
  ref,
  onBuffering,
  onEnd,
  onError,
  onLoad,
  onPaused,
  onPlaying,
  onProgress,
  onStopped,
  audioTrack,
  autoAspectRatio,
  muted,
  paused,
  /** @ts-expect-error I didn't find it on the native side. */
  playInBackground,
  rate,
  repeat,
  /** @ts-expect-error I didn't find it on the native side. */
  resizeMode,
  seek,
  subtitleUri,
  textTrack,
  videoAspectRatio,
  volume,
}: VLCPlayerProps) => {
  const playerRef = useRef<Component<NativePlayerProps, {}, any> & NativeMethods>(null);

  const setNativeProps = useCallback((props: Partial<NativePlayerCommands>) => {
    if (playerRef.current) {
      playerRef.current.setNativeProps(props);
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      seek: (pos) => {
        setNativeProps({ seek: pos });
      },
      resume: (isResume) => {
        setNativeProps({ resume: isResume });
      },
      snapshot: (path) => {
        setNativeProps({ snapshotPath: path });
      },
      autoAspectRatio: (isAuto) => {
        setNativeProps({ autoAspectRatio: isAuto });
      },
      changeVideoAspectRatio: (ratio) => {
        setNativeProps({ videoAspectRatio: ratio });
      },
    }),
    [setNativeProps],
  );

  //** Event handlers */

  const onBufferingHandler = (event: NativeSyntheticEvent<AndroidVideoBufferingEvent | VideoTargetEvent>) => {
    if (onBuffering) {
      onBuffering({ target: event.nativeEvent.target });
    }
  };

  const onErrorHandler = (event: NativeSyntheticEvent<AndroidVideoErrorEvent | VideoTargetEvent>) => {
    if (onError) {
      onError(event.nativeEvent);
    }
  };

  const onOpenHandler = (_event: NativeSyntheticEvent<AndroidVideoOpenEvent | VideoTargetEvent>) => {
    /** Not provided on the js types rn. */
  };

  const onLoadStartHandler = (_event: NativeSyntheticEvent<VideoTargetEvent>) => {
    /** Not provided on the js types rn. */
  };

  const onProgressHandler = (event: NativeSyntheticEvent<AndroidVideoProgressEvent | IosVideoProgressEvent>) => {
    if (onProgress) {
      /** @ts-expect-error We will look at it later on. */
      onProgress(event.nativeEvent);
    }
  };

  const onEndedHandler = (event: NativeSyntheticEvent<AndroidVideoEndEvent | IosVideoEndedEvent>) => {
    if (onEnd) {
      onEnd(event.nativeEvent);
    }
  };

  const onStoppedHandler = (_event: NativeSyntheticEvent<AndroidVideoStoppedEvent | VideoTargetEvent>) => {
    setNativeProps({ paused: true });
    if (onStopped) {
      /** @ts-expect-error We will look at it later on. */
      onStopped();
    }
  };

  const onPausedHandler = (event: NativeSyntheticEvent<AndroidVideoPausedEvent | VideoTargetEvent>) => {
    if (onPaused) {
      onPaused(event.nativeEvent);
    }
  };

  const onPlayingHandler = (event: NativeSyntheticEvent<AndroidVideoPlayingEvent | IosVideoPlayingEvent>) => {
    if (onPlaying) {
      /** @ts-expect-error We will look at it later on. */
      onPlaying(event.nativeEvent);
    }
  };

  const onLoadHandler = (event: NativeSyntheticEvent<AndroidVideoLoadEvent | IosVideoLoadEvent>) => {
    if (onLoad) {
      onLoad(event.nativeEvent);
    }
  };

  const resolvedAssetSource = useMemo(() => resolveAssetSource(source, autoplay), [source, autoplay]);

  return (
    /** @ts-expect-error We will add the missing properties later on. */
    <RCTVLCPlayer
      ref={playerRef}
      source={resolvedAssetSource}
      style={StyleSheet.compose(baseStyle, style)}
      autoplay={autoplay}
      onVideoBuffering={onBufferingHandler}
      onVideoError={onErrorHandler}
      onVideoOpen={onOpenHandler}
      onVideoLoadStart={onLoadStartHandler}
      onVideoProgress={onProgressHandler}
      onVideoEnd={onEndedHandler}
      onVideoEnded={onEndedHandler}
      onVideoStopped={onStoppedHandler}
      onVideoPaused={onPausedHandler}
      onVideoPlaying={onPlayingHandler}
      onVideoLoad={onLoadHandler}
      audioTrack={audioTrack}
      autoAspectRatio={autoAspectRatio}
      muted={muted}
      paused={paused}
      rate={rate}
      repeat={repeat}
      seek={seek}
      subtitleUri={subtitleUri}
      textTrack={textTrack}
      videoAspectRatio={videoAspectRatio}
      volume={volume}
      progressUpdateInterval={onProgress ? 250 : 0}
    />
  );
};

const { baseStyle } = StyleSheet.create({
  baseStyle: {
    overflow: 'hidden',
  },
});

export * from './types/js';
