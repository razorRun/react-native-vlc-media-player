/**
 * Video aspect ratio type
 */
export type VideoAspectRatio = '16:9' | '1:1' | '4:3' | '3:2' | '21:9' | '9:16';

export interface NativePlayerCommands {
  seek: number;
  resume: boolean;
  snapshotPath: string;
  autoAspectRatio: boolean;
  videoAspectRatio: PlayerAspectRatio;
}

export interface NativePlayerProps {
  source: NativePlayerSource;
  src: NativeSrc;
}
