import type { StyleProp, ViewProps, ViewStyle } from 'react-native';

import type {
  OnPlayingEventProps,
  OnProgressEventProps,
  OnSnapshotEventProps,
  SimpleCallbackEventProps,
  VideoInfo,
} from './VlcPlayerViewNativeComponent';

// The event payloads live in the native spec, because that is what the native
// side actually sends. Re-exporting them keeps the public API from drifting away
// from the contract the way the hand-written index.d.ts did.
export type {
  OnPlayingEventProps,
  OnProgressEventProps,
  OnRecordingStateEventProps,
  OnSeekEventProps,
  OnSnapshotEventProps,
  OnVideoStateChangeEventProps,
  SimpleCallbackEventProps,
  Track,
  VideoInfo,
} from './VlcPlayerViewNativeComponent';

/**
 * Video aspect ratio type
 */
export type PlayerAspectRatio =
  '16:9' | '1:1' | '4:3' | '3:2' | '21:9' | '9:16';

/**
 * Video resize mode
 *
 * @deprecated Neither platform reads this prop. It is kept so existing code keeps
 * compiling; see MODERNIZATION.md.
 */
export type PlayerResizeMode =
  'fill' | 'contain' | 'cover' | 'none' | 'scale-down';

/**
 * VLC Player source configuration options
 */
export interface VLCPlayerSource {
  /**
   * Media source URI to render
   */
  uri: string;
  /**
   * VLC Player initialization type
   *
   *  - Default configuration: `1`
   *  - Custom configuration: `2`
   *
   * See `initOptions` for more information
   *
   * @default 1
   */
  initType?: 1 | 2;
  /**
   * https://wiki.videolan.org/VLC_command-line_help/
   *
   * VLC Player initialization options
   *
   * `["--network-caching=50", "--rtsp-tcp"]`
   *
   * If `repeat` is set on props this will default to ["--repeat"] unless
   * another `--repeat` or `--input-repeat` flag is passed.
   *
   * @default []
   */
  initOptions?: string[];
  /**
   * Media type, derived from the file extension when omitted
   */
  type?: string;
  /**
   * Major version passed through to the native player
   */
  mainVer?: number;
  /**
   * Patch version passed through to the native player
   */
  patchVer?: number;
  /**
   * Android only. VLC options applied to this media, e.g. `[":network-caching=300"]`
   */
  mediaOptions?: string[];
  /**
   * Android only. `1` enables hardware decoding, `0` disables it. Takes effect
   * only together with `hwDecoderForced`; omit both to keep VLC's default.
   */
  hwDecoderEnabled?: 0 | 1;
  /**
   * Android only. `1` forces hardware decoding. See `hwDecoderEnabled`.
   */
  hwDecoderForced?: 0 | 1;
}

export type VLCPlayerCallbackProps = {
  /**
   * Called when media starts playing returns
   *
   * @param event - Event properties
   */
  onPlaying?: (event: OnPlayingEventProps) => void;

  /**
   * Callback containing position as a fraction, and duration, currentTime and
   * remainingTime in seconds
   *
   * @param event - Event properties
   */
  onProgress?: (event: OnProgressEventProps) => void;

  /**
   * Called when media is paused
   *
   * @param event - Event properties
   */
  onPaused?: (event: SimpleCallbackEventProps) => void;

  /**
   * Called when media is stopped
   */
  onStopped?: () => void;

  /**
   * Called when media is buffering
   *
   * @param event - Event properties
   */
  onBuffering?: (event: SimpleCallbackEventProps) => void;

  /**
   * Called when media playing ends
   *
   * @param event - Event properties
   */
  onEnd?: (event: SimpleCallbackEventProps) => void;

  /**
   * Called when an error occurs whilst attempting to play media
   *
   * @param event - Event properties
   */
  onError?: (event: SimpleCallbackEventProps) => void;

  /**
   * Called when the native player starts opening the media
   *
   * @param event - Event properties
   */
  onOpen?: (event: SimpleCallbackEventProps) => void;

  /**
   * Called when the native player starts loading the media
   *
   * @param event - Event properties
   */
  onLoadStart?: (event: SimpleCallbackEventProps) => void;

  /**
   * Called when video info is loaded, Callback containing `VideoInfo`
   *
   * @param event - Event properties
   */
  onLoad?: (event: VideoInfo) => void;

  /**
   * Called when a new recording is created
   *
   * @param recordingPath - Full path to the recording file
   */
  onRecordingCreated?: (recordingPath: string) => void;

  /**
   * Called when a new snapshot is created
   *
   * @param event - Event properties
   */
  onSnapshot?: (event: OnSnapshotEventProps) => void;
};

/**
 * Props that only exist on the native view.
 *
 * @deprecated Only reachable through the deprecated `setNativeProps`. The
 * imperative methods on the ref drive these through codegen commands now.
 */
export type VLCPlayerNativeOnlyProps = {
  seek?: number;
  resume?: boolean;
  paused?: boolean;
  autoAspectRatio?: boolean;
  videoAspectRatio?: string;
};

export type VLCPlayerProps = VLCPlayerCallbackProps &
  Omit<ViewProps, 'style'> & {
    /**
     * Object that contains the uri of a video or song to play, or the result of
     * `require()` for a bundled asset
     */
    source: VLCPlayerSource | number;

    /**
     * local subtitle file path，if you want to hide subtitle,
     * you can set this to an empty subtitle file，
     * current we don't support a hide subtitle prop.
     */
    subtitleUri?: string;

    /**
     * Set to `true` or `false` to pause or play the media
     * @default false
     */
    paused?: boolean;

    /**
     * Set to `true` or `false` to loop the media
     *
     * Android only. On iOS, pass `--repeat` through `source.initOptions`, which
     * this component does for you when `repeat` is set.
     *
     * @default false
     */
    repeat?: boolean;

    /**
     * Set the playback rate of the player
     * @default 1
     */
    rate?: number;

    /**
     * Set position to seek between 0 and 1
     * (0 being the start, 1 being the end, use position from the progress object)
     */
    seek?: number;

    /**
     * Set the volume of the player
     *
     * Android only.
     */
    volume?: number;

    /**
     * Set to `true` or `false` to mute the player
     * @default false
     */
    muted?: boolean;

    /**
     * Set audioTrack id (number) (see onLoad callback VideoInfo.audioTracks)
     */
    audioTrack?: number;

    /**
     * Set textTrack(subtitle) id (number) (see onLoad callback - VideoInfo.textTracks)
     */
    textTrack?: number;

    /**
     * Video aspect ratio
     */
    videoAspectRatio?: PlayerAspectRatio | string;

    /**
     * Set to `true` or `false` to enable auto aspect ratio
     *
     * Android only.
     *
     * @default false
     */
    autoAspectRatio?: boolean;

    /**
     * React native view stylesheet styles
     */
    style?: StyleProp<ViewStyle>;

    /**
     * Enables autoplay
     *
     * @default true
     */
    autoplay?: boolean;

    /**
     * Set to `true` to automatically accept invalid SSL/TLS certificates
     * when connecting to HTTPS streams. This bypasses certificate validation
     * which may pose security risks.
     *
     * @default false
     */
    acceptInvalidCertificates?: boolean;

    /**
     * Set to `true` or `false` to allow playing in the background
     *
     * @deprecated Neither platform reads this prop.
     */
    playInBackground?: boolean;

    /**
     * Set the behavior for the video size (fill, contain, cover, none, scale-down)
     *
     * @deprecated Neither platform reads this prop; use `videoAspectRatio`.
     */
    resizeMode?: PlayerResizeMode;
  };

/**
 * The imperative API exposed on a `VLCPlayer` ref. Every method dispatches a
 * codegen command, so it works on both architectures.
 */
export type PlaybackMethods = {
  /**
   * Start a new recording session at the given path
   * @param path Directory to create new recording in
   */
  startRecording(path: string): void;

  /**
   * Stop current recording session
   */
  stopRecording(): void;

  /**
   * Stop playing
   */
  stopPlayer(): void;

  /**
   * Take a screenshot of the current video frame
   *
   * @param path The file path where to save the screenshot
   */
  snapshot(path: string): void;

  /**
   * Seek to the given position
   *
   * @param pos Position to seek to (as a fraction of the full duration)
   */
  seek(pos: number): void;

  /**
   * Resume playback
   *
   * @param isResume Whether to resume (default) or pause
   */
  resume(isResume?: boolean): void;

  /**
   * Change auto aspect ratio setting
   *
   * Android only; a no-op on iOS.
   *
   * @param isAuto Whether or not to use auto aspect ratio
   */
  autoAspectRatio(isAuto: boolean): void;

  /**
   * Update video aspect ratio e.g. `"16:9"`
   *
   * @param ratio Aspect ratio to use
   */
  changeVideoAspectRatio(ratio: string): void;

  /**
   * Imperatively set props on the underlying native view.
   *
   * @deprecated `setNativeProps` does not exist on the New Architecture. The
   * library itself no longer uses it; this passthrough only remains so existing
   * calls keep compiling. Use the methods above or the corresponding props.
   */
  setNativeProps(
    nativeProps: Partial<VLCPlayerProps> & VLCPlayerNativeOnlyProps
  ): void;
};
