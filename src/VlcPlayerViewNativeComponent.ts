import type * as React from 'react';
import type { HostComponent, ViewProps } from 'react-native';
// These two deep imports are the sanctioned codegen entry points. React Native
// only re-exports them from the package root since 0.80, and this package
// declares a floor of 0.74, so the path form is the portable one.
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import type {
  DirectEventHandler,
  Double,
  Float,
  Int32,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes';

/**
 * The native contract of the VLC player view: every prop the platform view
 * managers read, every event they emit, every command they answer.
 *
 * This file is the single source of truth. The public types in `./types` are
 * derived from it, which is what keeps them from drifting the way the
 * hand-written `index.d.ts` did.
 */

// -- Event payloads ---------------------------------------------------------

/**
 * Represents a track type in playback
 */
export type Track = Readonly<{
  /** Track identification */
  id: Int32;
  /** Track name */
  name: string;
}>;

/**
 * Payload of the events that carry nothing but the view tag
 */
export type SimpleCallbackEventProps = Readonly<{
  /** Playback target */
  target: Int32;
}>;

export type OnPlayingEventProps = Readonly<{
  target: Int32;
  /** Total playback duration */
  duration: Double;
  seekable: boolean;
}>;

export type OnProgressEventProps = Readonly<{
  target: Int32;
  /** Total playback duration */
  duration: Double;
  /** Current playback time */
  currentTime: Double;
  /** Current playback position */
  position: Double;
  /** Remaining time to end playback */
  remainingTime: Double;
}>;

/**
 * Represents a full playback information
 */
export type VideoInfo = Readonly<{
  /** Playback target */
  target: Int32;
  /** Total playback duration */
  duration: Double;
  /** Total playback video size */
  videoSize: Readonly<{ width: Double; height: Double }>;
  // Codegen does not resolve a type alias as an array element type in an event
  // payload, so the Track shape is inlined here. `Track` below is the same shape
  // and exists for the public API.
  /** List of playback audio tracks */
  audioTracks: { id: Int32; name: string }[];
  /** List of playback text tracks */
  textTracks: { id: Int32; name: string }[];
}>;

export type OnSeekEventProps = Readonly<{
  target: Int32;
  currentTime: Double;
  seekTime: Double;
}>;

export type OnRecordingStateEventProps = Readonly<{
  isRecording: boolean;
  recordPath?: string;
}>;

export type OnSnapshotEventProps = Readonly<{
  success: boolean;
  path?: string;
  error?: string;
}>;

/**
 * Android-only aggregate event. Android routes several state transitions through
 * `onVideoStateChange` instead of dedicated events; the payload is whatever
 * `VideoEventEmitter.onVideoStateChange` put into the map.
 */
export type OnVideoStateChangeEventProps = Readonly<{
  type?: string;
}>;

// -- Props ------------------------------------------------------------------

export type NativeSource = Readonly<{
  uri?: string;
  type?: string;
  isNetwork?: boolean;
  autoplay?: boolean;
  initType?: Int32;
  initOptions?: ReadonlyArray<string>;
  mainVer?: Int32;
  patchVer?: Int32;
  /** Android only. Options added to the media, as with `initOptions`. */
  mediaOptions?: ReadonlyArray<string>;
  /**
   * Android only. `>= 1` enables hardware decoding, `0` disables it. Only applied
   * when `hwDecoderForced` is set too. The `-1` default means "leave VLC's own
   * default alone" — without it an omitted field would arrive on the New
   * Architecture as `0` and switch hardware decoding off.
   */
  hwDecoderEnabled?: WithDefault<Int32, -1>;
  /** Android only. `>= 1` forces hardware decoding. See `hwDecoderEnabled`. */
  hwDecoderForced?: WithDefault<Int32, -1>;
}>;

export interface NativeProps extends ViewProps {
  source?: NativeSource;
  subtitleUri?: string;

  paused?: WithDefault<boolean, false>;
  muted?: WithDefault<boolean, false>;
  seek?: Float;
  rate?: Float;
  resume?: WithDefault<boolean, true>;
  videoAspectRatio?: string;
  audioTrack?: Int32;
  textTrack?: Int32;
  acceptInvalidCertificates?: WithDefault<boolean, false>;

  /** iOS only; Android reads autoplay from `source.autoplay`. */
  autoplay?: boolean;
  /** iOS only. Saves a snapshot to this path when set. */
  snapshotPath?: string;

  /** Android only. */
  repeat?: WithDefault<boolean, false>;
  /** Android only. */
  volume?: WithDefault<Float, 1.0>;
  /** Android only. */
  autoAspectRatio?: WithDefault<boolean, false>;
  /** Android only. */
  progressUpdateInterval?: WithDefault<Float, 0.0>;
  /** Android only. Setting this at all tears the player down. */
  clear?: boolean;

  onVideoLoadStart?: DirectEventHandler<SimpleCallbackEventProps>;
  onVideoOpen?: DirectEventHandler<SimpleCallbackEventProps>;
  onVideoLoad?: DirectEventHandler<VideoInfo>;
  onVideoProgress?: DirectEventHandler<OnProgressEventProps>;
  onVideoPlaying?: DirectEventHandler<OnPlayingEventProps>;
  onVideoPaused?: DirectEventHandler<SimpleCallbackEventProps>;
  onVideoStopped?: DirectEventHandler<SimpleCallbackEventProps>;
  onVideoBuffering?: DirectEventHandler<SimpleCallbackEventProps>;
  onVideoError?: DirectEventHandler<SimpleCallbackEventProps>;
  /** Android spells it `onVideoEnd`, iOS `onVideoEnded`. Both are declared. */
  onVideoEnd?: DirectEventHandler<SimpleCallbackEventProps>;
  onVideoEnded?: DirectEventHandler<SimpleCallbackEventProps>;
  /** Android only. */
  onVideoSeek?: DirectEventHandler<OnSeekEventProps>;
  /** Android only. */
  onVideoStateChange?: DirectEventHandler<OnVideoStateChangeEventProps>;
  onRecordingState?: DirectEventHandler<OnRecordingStateEventProps>;
  onSnapshot?: DirectEventHandler<OnSnapshotEventProps>;
}

// -- Commands ---------------------------------------------------------------
//
// Naming rule: a command called `setX` collides with a prop called `x`, because
// codegen generates `setX(view, value)` for both and the generated
// VlcPlayerViewManagerInterface then declares the method twice. The commands that
// imperatively drive a prop are therefore named `apply…`.

type ComponentType = HostComponent<NativeProps>;

export interface NativeCommands {
  startRecording: (
    viewRef: React.ElementRef<ComponentType>,
    path: string
  ) => void;
  stopRecording: (viewRef: React.ElementRef<ComponentType>) => void;
  stopPlayer: (viewRef: React.ElementRef<ComponentType>) => void;
  snapshot: (viewRef: React.ElementRef<ComponentType>, path: string) => void;
  seek: (viewRef: React.ElementRef<ComponentType>, position: Float) => void;
  applyResume: (
    viewRef: React.ElementRef<ComponentType>,
    isResume: boolean
  ) => void;
  applyPaused: (
    viewRef: React.ElementRef<ComponentType>,
    paused: boolean
  ) => void;
  applyAutoAspectRatio: (
    viewRef: React.ElementRef<ComponentType>,
    isAuto: boolean
  ) => void;
  applyAspectRatio: (
    viewRef: React.ElementRef<ComponentType>,
    ratio: string
  ) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: [
    'startRecording',
    'stopRecording',
    'stopPlayer',
    'snapshot',
    'seek',
    'applyResume',
    'applyPaused',
    'applyAutoAspectRatio',
    'applyAspectRatio',
  ],
});

// One native name for both architectures. The static view config that codegen
// generates from this call carries a single name, and with `paperComponentName`
// set that name is the paper one on Fabric too — so Fabric looked for
// `RCTVLCPlayer` and never found the `VlcPlayerView` component the native
// adapters register. The legacy view managers are named `VlcPlayerView` instead.
export default codegenNativeComponent<NativeProps>(
  'VlcPlayerView'
) as ComponentType;
