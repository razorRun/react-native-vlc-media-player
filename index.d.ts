import type { Component } from "react";
import { StyleProp, ViewStyle } from "react-native";

/**
 * Video aspect ratio type
 */
export type PlayerAspectRatio = "16:9" | "1:1" | "4:3" | "3:2" | "21:9" | "9:16";

/**
 * Video resize mode
 */
export type PlayerResizeMode = "fill" | "contain" | "cover" | "none" | "scale-down";

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
}

/**
 * Represents a track type in playback
 */
export type Track = {
  /**
   * Track identification
   */
  id: number;

  /**
   * Track name
   */
  name: string;
};

/**
 * Represents a full playback information
 */
export type VideoInfo = {
  /**
   * Total playback duration
   */
  duration: number;

  /**
   * Playback target
   */
  target: number;

  /**
   * Total playback video size
   */
  videoSize: Record<"width" | "height", number>;

  /**
   * List of playback audio tracks
   */
  audioTracks: Track[];

  /**
   * List of playback text tracks
   */
  textTracks: Track[];
};

type OnPlayingEventProps = Pick<VideoInfo, "duration" | "target"> & {
  seekable: boolean;
};

type OnProgressEventProps = Pick<VideoInfo, "duration" | "target"> & {
  /**
   * Current playback time
   */
  currentTime: number;

  /**
   * Current playback position
   */
  position: number;

  /**
   * Remaining time to end playback
   */
  remainingTime: number;
};

type SimpleCallbackEventProps = Pick<VideoInfo, "target">;

export type VLCPlayerCallbackProps = {
  /**
   * Called when media starts playing returns
   *
   * @param event - Event properties
   */
  onPlaying?: (event: OnPlayingEventProps) => void;

  /**
   * Callback containing position as a fraction, and duration, currentTime and remainingTime in seconds
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
   * Called when media is stoped
   *
   * @param event - Event properties
   */
  onStopped?: (event: SimpleCallbackEventProps) => void;

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
  onSnapshot?: (event: {
    success: boolean;
    path?: string;
    error?: string;
  }) => void;
};

export type VLCPlayerProps = VLCPlayerCallbackProps & {
  /**
   * Object that contains the uri of a video or song to play eg
   */
  source: VLCPlayerSource;

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
   * 	Set textTrack(subtitle) id (number) (see onLoad callback - VideoInfo.textTracks)
   */
  textTrack?: number;

  /**
   * Set to `true` or `false` to allow playing in the background
   * @default false
   */
  playInBackground?: boolean;

  /**
   * Video aspect ratio
   */
  videoAspectRatio?: PlayerAspectRatio;

  /**
   * Set to `true` or `false` to enable auto aspect ratio
   * @default false
   */
  autoAspectRatio?: boolean;

  /**
   * Set the behavior for the video size (fill, contain, cover, none, scale-down)
   */
  resizeMode?: PlayerResizeMode;

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
};

declare class PlaybackMethods<T> extends Component<T> {
  /**
   * Start a new recording session at the given path
   * @param path Directory to create new recording in
   */
  startRecording(path: string);

  /**
   * Stop current recording session
   */
  stopRecording();

  /**
   * Stop playing 
   */
  stopPlayer();

  /**
   * Take a screenshot of the current video frame
   *
   * @param path The file path where to save the screenshot
   */
  snapshot(path: string);

  /**
   * Seek to the given position
   * 
   * @param pos Position to seek to (as a percentage of the full duration)
   */
  seek(pos: number);

  /**
   * Resume playback
   */
  resume();

  /**
   * Change auto aspect ratio setting
   * 
   * @param useAuto Whether or not to use auto aspect ratio
   */
  autoAspectRatio(useAuto: boolean);
  
  /**
   * Update video aspect ratio e.g. `"16:9"`
   * 
   * @param ratio Aspect ratio to use
   */
  changeVideoAspectRatio(ratio: string);
}

/**
 * A component that can be used to show a playback
 */
declare class VLCPlayer extends PlaybackMethods<VLCPlayerProps> {}

/**
 * A component that renders a playback with additional
 * features like fullscreen, controls, etc.
 */
declare class VlCPlayerView extends PlaybackMethods<any> {}
