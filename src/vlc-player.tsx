import type { VLCPlayerProps } from './types/js';
import type { NativePlayerCommands, NativePlayerProps } from './types/native';
import { resolveAssetSource } from './source';
import { Component, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { requireNativeComponent, StyleSheet, type NativeMethods } from 'react-native';

const RCTVLCPlayer = requireNativeComponent<NativePlayerProps>('RCTVLCPlayer');

export const VLCPlayer = ({ source, style, autoplay = true, ref }: VLCPlayerProps) => {
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

  const onBuffering = () => {};

  const resolvedAssetSource = useMemo(() => resolveAssetSource(source, autoplay), [source, autoplay]);

  return <RCTVLCPlayer ref={playerRef} source={resolvedAssetSource} style={StyleSheet.compose(baseStyle, style)} autoplay={autoplay} />;
};

const { baseStyle } = StyleSheet.create({
  baseStyle: {
    overflow: 'hidden',
  },
});

export * from './types/js';
