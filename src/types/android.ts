import type { VideoAspectRatio } from './native';
import type { VideoTargetEvent } from './shared';

export interface VLCPlayerAndroidProps extends VLCPlayerAndroidEvents {
  source: VLCPlayerAndroidSource;
  subtitleUri: string;
  repeat: boolean;
  paused: boolean;
  muted: boolean;
  volume: number;
  seek: number;
  autoAspectRatio: boolean;
  resume: boolean;
  rate: number;
  position: number;
  videoAspectRatio: VideoAspectRatio;
  snapshotPath: string;
  audioTrack: number;
  textTrack: number;
  progressUpdateInterval: number;
  clear: boolean;
}

interface VLCPlayerAndroidSource {
  uri: string;
  type: string;
  isNetwork: boolean;
  autoplay: boolean;
}

interface VLCPlayerAndroidEvents {
  onVideoLoadStart: (event: VideoTargetEvent) => void;
  onVideoOpen: (event: AndroidVideoOpenEvent) => void;
  onVideoProgress: (event: AndroidVideoProgressEvent) => void;
  onVideoSeek: (event: AndroidVideoSeekEvent) => void;
  onVideoEnd: (event: AndroidVideoEndEvent) => void;
  onSnapshot: (event: AndroidVideoSnapshotEvent) => void;
  onVideoPlaying: (event: AndroidVideoPlayingEvent) => void;
  onVideoStateChange: (event: AndroidVideoStateChangeEvent | AndroidLayoutVideoStateChangeEvent) => void;
  onVideoPaused: (event: AndroidVideoPausedEvent) => void;
  onVideoBuffering: (event: AndroidVideoBufferingEvent) => void;
  onVideoError: (event: AndroidVideoErrorEvent) => void;
  onVideoStopped: (event: AndroidVideoStoppedEvent) => void;
  onVideoLoad: (event: AndroidVideoLoadEvent) => void;
}

interface AndroidVideoStoppedEvent extends VideoTargetEvent {
  type: 'Stopped';
}

interface AndroidVideoBufferingEvent extends VideoTargetEvent {
  type: 'Buffering';
  bufferRate: number;
}

interface AndroidVideoPausedEvent extends VideoTargetEvent {
  type: 'Paused';
  isPlaying: false;
  position: number;
  currentTime: number;
  duration: number;
}

interface AndroidLayoutVideoStateChangeEvent extends VideoTargetEvent {
  type: 'onNewVideoLayout';
  mVideoWidth: number;
  mVideoHeight: number;
  mVideoVisibleWidth: number;
  mVideoVisibleHeight: number;
  mSarNum: number;
  mSarDen: number;
}

interface AndroidVideoStateChangeEvent extends VideoTargetEvent {
  type: 'Paused' | 'Buffering' | 'Stopped' | 'Error';
  [key: string]: unknown;
}

interface AndroidVideoPlayingEvent extends VideoTargetEvent {
  type: 'Playing';
  isPlaying: true;
  position: number;
  currentTime: number;
  duration: number;
}

interface AndroidVideoEndEvent extends VideoTargetEvent {
  type: 'Ended';
  isPlaying: boolean;
  position: number;
  currentTime: number;
  duration: number;
}

interface AndroidVideoSeekEvent extends VideoTargetEvent {
  type: 'TimeChanged';
}

interface AndroidVideoOpenEvent extends VideoTargetEvent {
  type: 'Opening';
  isPlaying: boolean;
  position: number;
  currentTime: number;
  duration: number;
}

interface AndroidVideoProgressEvent extends VideoTargetEvent {
  isPlaying: boolean;
  /** From 0.0 to 1.0. */
  position: number;
  /** The video current time in ms. */
  currentTime: number;
  /** The video duration in ms. */
  duration: number;
}

interface AndroidVideoErrorEvent extends VideoTargetEvent {
  error: {
    errorString: string;
    excepion: string;
  };
}

interface AndroidVideoLoadEvent extends VideoTargetEvent {
  duration: number;
  audioTracks: {
    id: number;
    name: string;
  }[];
  textTracks: {
    id: number;
    name: string;
  }[];
  videoSize: {
    width: number;
    height: number;
  };
}

interface AndroidVideoSnapshotEvent extends VideoTargetEvent {
  isSuccess: number;
}
