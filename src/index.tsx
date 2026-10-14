export { default as VLCPlayer } from './VLCPlayer';
export { default as VlCPlayerView } from './playerView';
export { default as BackHandle } from './playerView/BackHandle';

export type {
  BackHandleLike,
  OrientationLike,
  VlCPlayerViewProps,
} from './playerView';
export type { VLCPlayerViewProps } from './playerView/VLCPlayerView';
export type { ControlBtnProps } from './playerView/ControlBtn';
export type { TimeLimitProps } from './playerView/TimeLimit';

export type {
  OnPlayingEventProps,
  OnProgressEventProps,
  OnRecordingStateEventProps,
  OnSeekEventProps,
  OnSnapshotEventProps,
  OnVideoStateChangeEventProps,
  PlaybackMethods,
  PlayerAspectRatio,
  PlayerResizeMode,
  SimpleCallbackEventProps,
  Track,
  VideoInfo,
  VLCPlayerCallbackProps,
  VLCPlayerNativeOnlyProps,
  VLCPlayerProps,
  VLCPlayerSource,
} from './types';

// The native contract, for anyone writing their own view around the native
// component. `NativeProps` is also what Phase 2b/2c generate native code from.
//
// Not `export { Commands as … } from`: React Native's codegen Babel plugin runs
// on every file of the consuming app and rejects any export specifier whose local
// name is `Commands`, so that form breaks bundling for every app on the standard
// preset. Re-binding under a new name first is what the plugin allows.
import {
  Commands as nativeCommands,
  type NativeCommands,
} from './VlcPlayerViewNativeComponent';
export const VlcPlayerViewCommands: NativeCommands = nativeCommands;
export type {
  NativeCommands as VlcPlayerViewNativeCommands,
  NativeProps as VlcPlayerViewNativeProps,
  NativeSource as VlcPlayerViewNativeSource,
} from './VlcPlayerViewNativeComponent';
