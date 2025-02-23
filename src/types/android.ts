import type { NativeSyntheticEvent } from 'react-native';
import type { VideoAspectRatio } from './native';
import type { VideoTargetEvent } from './shared';

export interface VLCPlayerAndroidProps extends VLCPlayerAndroidEvents {
  source: VLCPlayerAndroidSource;
  subtitleUri?: string;
  repeat?: boolean;
  paused?: boolean;
  muted?: boolean;
  volume?: number;
  seek?: number;
  autoAspectRatio?: boolean;
  resume: boolean;
  rate?: number;
  position: number;
  videoAspectRatio?: VideoAspectRatio;
  snapshotPath: string;
  audioTrack?: number;
  textTrack?: number;
  progressUpdateInterval: number;
  clear: boolean;
}

export interface VLCPlayerAndroidSource {
  uri: string;
  type: string;
  isNetwork: boolean;
  autoplay: boolean;
}

export interface VLCPlayerAndroidEvents {
  onVideoLoadStart: (event: NativeSyntheticEvent<VideoTargetEvent>) => void;
  onVideoOpen: (event: NativeSyntheticEvent<AndroidVideoOpenEvent>) => void;
  onVideoProgress: (event: NativeSyntheticEvent<AndroidVideoProgressEvent>) => void;
  onVideoSeek: (event: NativeSyntheticEvent<AndroidVideoSeekEvent>) => void;
  onVideoEnd: (event: NativeSyntheticEvent<AndroidVideoEndEvent>) => void;
  onSnapshot: (event: NativeSyntheticEvent<AndroidVideoSnapshotEvent>) => void;
  onVideoPlaying: (event: NativeSyntheticEvent<AndroidVideoPlayingEvent>) => void;
  onVideoStateChange: (event: NativeSyntheticEvent<AndroidVideoStateChangeEvent | AndroidLayoutVideoStateChangeEvent>) => void;
  onVideoPaused: (event: NativeSyntheticEvent<AndroidVideoPausedEvent>) => void;
  onVideoBuffering: (event: NativeSyntheticEvent<AndroidVideoBufferingEvent>) => void;
  onVideoError: (event: NativeSyntheticEvent<AndroidVideoErrorEvent>) => void;
  onVideoStopped: (event: NativeSyntheticEvent<AndroidVideoStoppedEvent>) => void;
  onVideoLoad: (event: NativeSyntheticEvent<AndroidVideoLoadEvent>) => void;
}

export interface AndroidVideoStoppedEvent extends VideoTargetEvent {
  type: 'Stopped';
}

export interface AndroidVideoBufferingEvent extends VideoTargetEvent {
  type: 'Buffering';
  bufferRate: number;
}

export interface AndroidVideoPausedEvent extends VideoTargetEvent {
  type: 'Paused';
  isPlaying: false;
  position: number;
  currentTime: number;
  duration: number;
}

export interface AndroidLayoutVideoStateChangeEvent extends VideoTargetEvent {
  type: 'onNewVideoLayout';
  mVideoWidth: number;
  mVideoHeight: number;
  mVideoVisibleWidth: number;
  mVideoVisibleHeight: number;
  mSarNum: number;
  mSarDen: number;
}

export interface AndroidVideoStateChangeEvent extends VideoTargetEvent {
  type: 'Paused' | 'Buffering' | 'Stopped' | 'Error';
  [key: string]: unknown;
}

export interface AndroidVideoPlayingEvent extends VideoTargetEvent {
  type: 'Playing';
  isPlaying: true;
  position: number;
  currentTime: number;
  duration: number;
}

export interface AndroidVideoEndEvent extends VideoTargetEvent {
  type: 'Ended';
  isPlaying: boolean;
  position: number;
  currentTime: number;
  duration: number;
}

export interface AndroidVideoSeekEvent extends VideoTargetEvent {
  type: 'TimeChanged';
}

export interface AndroidVideoOpenEvent extends VideoTargetEvent {
  type: 'Opening';
  isPlaying: boolean;
  position: number;
  currentTime: number;
  duration: number;
}

export interface AndroidVideoProgressEvent extends VideoTargetEvent {
  isPlaying: boolean;
  /** From 0.0 to 1.0. */
  position: number;
  /** The video current time in ms. */
  currentTime: number;
  /** The video duration in ms. */
  duration: number;
}

export interface AndroidVideoErrorEvent extends VideoTargetEvent {
  error: {
    errorString: string;
    excepion: string;
  };
}

export interface AndroidVideoLoadEvent extends VideoTargetEvent {
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

export interface AndroidVideoSnapshotEvent extends VideoTargetEvent {
  isSuccess: number;
}
