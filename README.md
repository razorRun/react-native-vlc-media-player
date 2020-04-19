# react-native-vlc-media-player

A `<VLCPlayer>` component for react-native
project was cloned from `react-native-yz-vlcplayer` as it is not maintained any more and does not support RN newer versions.

## Supported RN Versions

0.59,0.60,0.61 and up
PODs are updated to works with 0.61 and up.(Tested in 0.61.5)

## Sample repo

[VLC Media Player test](https://github.com/razorRun/react-native-vlc-media-player-test)

## Supported formats

Support for network streams, RTSP, RTP,RTMP, HLS, MMS.
Play all files, in all formats, including exotic ones, like classic VLC media player.
Play MKV, multiple audio tracks (including 5.1), and subtitles tracks (including SSA!)

### Add it to your project

Run `npm i react-native-vlc-media-player --save`

(Run - optional `react-native link react-native-vlc-media-player`) // No need if you are running RN 0.61 and up

## android

Should work without any specific settings

## ios

1. cd to ios
2. run `pod init` (if only Podfile has not been generated in ios folder)
3. (No need if you are running RN 0.61 and up) add `pod 'MobileVLCKit', '3.3.10'` to pod file
4. run `pod install` (you have to delete the app on the simulator/device and run `react-native run-ios` again)

## Optional(only for ios)

Enable Bitcode
in root project select Build Settings ---> find Bitcode and select Enable Bitcode

## More formats

Container formats: 3GP, ASF, AVI, DVR-MS, FLV, Matroska (MKV), MIDI,QuickTime File Format, MP4, Ogg, OGM, WAV, MPEG-2 (ES, PS, TS, PVA, MP3), AIFF, Raw audio, Raw DV, MXF, VOB, RM, Blu-ray, DVD-Video, VCD, SVCD, CD Audio, DVB, HEIF, AVIF
Audio coding formats: AAC, AC3, ALAC, AMR, DTS, DV Audio, XM, FLAC, It, MACE, MOD, Monkey's Audio, MP3, Opus, PLS, QCP, QDM2/QDMC, RealAudio, Speex, Screamtracker 3/S3M, TTA, Vorbis, WavPack, WMA (WMA 1/2, WMA 3 partially).
Capture devices: Video4Linux (on Linux), DirectShow (on Windows), Desktop (screencast), Digital TV (DVB-C, DVB-S, DVB-T, DVB-S2, DVB-T2, ATSC, Clear QAM)
Network protocols: FTP, HTTP, MMS, RSS/Atom, RTMP, RTP (unicast or multicast), RTSP, UDP, Sat-IP, Smooth Streaming
Network streaming formats: Apple HLS, Flash RTMP, MPEG-DASH, MPEG Transport Stream, RTP/RTSP ISMA/3GPP PSS, Windows Media MMS
Subtitles: Advanced SubStation Alpha, Closed Captions, DVB, DVD-Video, MPEG-4 Timed Text, MPL2, OGM, SubStation Alpha, SubRip, SVCD, Teletext, Text file, VobSub, WebVTT, TTML
Video coding formats: Cinepak, Dirac, DV, H.263, H.264/MPEG-4 AVC, H.265/MPEG HEVC, AV1, HuffYUV, Indeo 3,MJPEG, MPEG-1, MPEG-2, MPEG-4 Part 2, RealVideo 3&4,Sorenson, Theora, VC-1,[h] VP5,VP6, VP8, VP9, DNxHD, ProRes and some WMV.

## TODO

1. Android video Aspect ratio does not work.
2. UPDATE VLC KIT to latest(3.3.10) or atleast [3.1.7](https://mvnrepository.com/artifact/com.yyl.vlc/vlc-android-sdk/3.1.7) in android  -> react-native-vlc-media-player/android/build.gradle:28 => compile 'com.yyl.vlc:vlc-android-sdk:3.0.10'

## Got a few minutes to spare? Please help us to keep this repo up to date and simple to use. 

#### Our idea was to keep the repo simple, and people can use it with newer RN versions without any additional config.


1. Get a copy of [VLC Media Player test](https://github.com/razorRun/react-native-vlc-media-player-test) 
2. Run it for ios and android locally. 
3. Verify your changes and make sure everything works on both platforms. (If you need a hand with testing I might be able to help as well)
4. Send PR.
5. Be happy, Coz you are a Rockstart 🌟 ❤️

## Use

```
  (1) import { VLCPlayer, VlCPlayerView } from 'react-native-vlc-media-player';

  (2)
    <VLCPlayer
           ref={ref => (this.vlcPlayer = ref)}
           style={[styles.video]}
           videoAspectRatio="16:9"
           paused={this.state.paused}
           source={{ uri: this.props.uri}}
           onProgress={this.onProgress.bind(this)}
           onEnd={this.onEnded.bind(this)}
           onBuffering={this.onBuffering.bind(this)}
           onError={this._onError}
           onStopped={this.onStopped.bind(this)}
           onPlaying={this.onPlaying.bind(this)}
           onPaused={this.onPaused.bind(this)}
       />
  (3) or use
    <VlCPlayerView
           autoplay={false}
           url={this.state.url}
           Orientation={Orientation}
           //BackHandle={BackHandle}
           ggUrl=""
           showGG={true}
           showTitle={true}
           title=""
           showBack={true}
           onLeftPress={()=>{}}
           startFullScreen={() => {
              this.setState({
              isFull: true,
             });
           }}
           closeFullScreen={() => {
              this.setState({
              isFull: false,
             });
           }}
       />
```



## credits

[Nghi-NV](https://github.com/Nghi-NV)
[xuyuanzhou](https://github.com/xuyuanzhou)
[ammarahm-ed](https://github.com/ammarahm-ed)
