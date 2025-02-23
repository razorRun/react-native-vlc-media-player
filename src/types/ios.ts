import type { NativeSyntheticEvent } from 'react-native';
import type { VideoAspectRatio } from './native';
import type { VideoTargetEvent } from './shared';

export interface VLCPlayerIosProps extends VLCPlayerIosEvents {
  source: VLCPlayerIosSource;
  subtitleUri?: string;
  paused?: boolean;
  seek?: number;
  rate?: number;
  resume: boolean;
  videoAspectRatio?: VideoAspectRatio;
  snapshotPath: string;
  muted?: boolean;
  audioTrack?: number;
  textTrack?: number;
  autoplay: boolean;
}

export type VLCPlayerIosSource = {
  uri: string;
  initType: number;
  initOptions: string[];
  headers: Record<string, string>;
};

export interface VLCPlayerIosEvents {
  onVideoProgress: (event: NativeSyntheticEvent<IosVideoProgressEvent>) => void;
  onVideoPaused: (event: NativeSyntheticEvent<VideoTargetEvent>) => void;
  onVideoStopped: (event: NativeSyntheticEvent<VideoTargetEvent>) => void;
  onVideoBuffering: (event: NativeSyntheticEvent<VideoTargetEvent>) => void;
  onVideoPlaying: (event: NativeSyntheticEvent<IosVideoPlayingEvent>) => void;
  onVideoEnded: (event: NativeSyntheticEvent<IosVideoEndedEvent>) => void;
  onVideoError: (event: NativeSyntheticEvent<VideoTargetEvent>) => void;
  onVideoOpen: (event: NativeSyntheticEvent<VideoTargetEvent>) => void;
  onVideoLoadStart: (event: NativeSyntheticEvent<VideoTargetEvent>) => void;
  onVideoLoad: (event: NativeSyntheticEvent<IosVideoLoadEvent>) => void;
}

export interface IosVideoProgressEvent extends VideoTargetEvent {
  currentTime: number;
  remainingTime: number;
  duration: number;
  position: number;
}

export interface IosVideoPlayingEvent extends VideoTargetEvent {
  seekable: boolean;
  duration: number;
}

export interface IosVideoEndedEvent extends VideoTargetEvent {
  currentTime: number;
  remainingTime: number;
  duration: number;
  position: number;
}

export interface IosVideoLoadEvent extends VideoTargetEvent {
  duration: number;
  videoSize: {
    width: number;
    height: number;
  };
  audioTracks: {
    id: number;
    name: string;
  }[];
  textTracks: {
    id: number;
    name: string;
  }[];
}
