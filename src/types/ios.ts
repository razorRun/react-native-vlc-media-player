import type { VideoAspectRatio } from './native';
import type { VideoTargetEvent } from './shared';

export interface VLCPlayerIosProps extends VLCPlayerIosEvents {
  source: VLCPlayerIosSource;
  subtitleUri: string;
  paused: boolean;
  seek: number;
  rate: number;
  resume: boolean;
  videoAspectRatio: VideoAspectRatio;
  snapshotPath: string;
  muted: boolean;
  audioTrack: number;
  textTrack: number;
  autoplay: boolean;
}

type VLCPlayerIosSource = {
  uri: string;
  initType: number;
  initOptions: string[];
  headers: Record<string, string>;
};

interface VLCPlayerIosEvents {
  onVideoProgress: (event: IosVideoProgressEvent) => void;
  onVideoPaused: (event: VideoTargetEvent) => void;
  onVideoStopped: (event: VideoTargetEvent) => void;
  onVideoBuffering: (event: VideoTargetEvent) => void;
  onVideoPlaying: (event: IosVideoPlayingEvent) => void;
  onVideoEnded: (event: IosVideoEndedEvent) => void;
  onVideoError: (event: VideoTargetEvent) => void;
  onVideoOpen: (event: VideoTargetEvent) => void;
  onVideoLoadStart: (event: VideoTargetEvent) => void;
  onVideoLoad: (event: IosVideoLoadEvent) => void;
}

interface IosVideoProgressEvent extends VideoTargetEvent {
  currentTime: number;
  remainingTime: number;
  duration: number;
  position: number;
}

interface IosVideoPlayingEvent extends VideoTargetEvent {
  seekable: boolean;
  duration: number;
}

interface IosVideoEndedEvent extends VideoTargetEvent {
  currentTime: number;
  remainingTime: number;
  duration: number;
  position: number;
}

interface IosVideoLoadEvent extends VideoTargetEvent {
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
