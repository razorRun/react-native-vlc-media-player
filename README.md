# react-native-vlc-media-player

## New feature requests and bug fixes

At the moment I am a bit tied up with other work. As a matter of fact, I don't get much time to develop at all nowadays. But I am more than open to help anyone who wants's to contribute to this repo. And I will be sure to merge any fixes as soon as PR's come up. But if you need someone to fix issues that affect you till I get back to this(ETA Q3 2022), One option is to add a bounty to the following site https://www.bountysource.com/ someone will attend to it.

## Supported RN Versions

0.59 > 0.62 and up
PODs are updated to works with 0.61 and up.(Tested in 0.61.5 and 0.62 and 0.63)

## Sample repo

[VLC Media Player test](https://github.com/razorRun/react-native-vlc-media-player-test)

## Supported formats

Support for network streams, RTSP, RTP, RTMP, HLS, MMS.
Play all files,[ in all formats, including exotic ones, like the classic VLC media player.](#-More-formats)
Play MKV, multiple audio tracks (including 5.1), and subtitles tracks (including SSA!)

### Add it to your project

Run

`npm i react-native-vlc-media-player --save`

or

`yarn add react-native-vlc-media-player`

Run 

`react-native link react-native-vlc-media-player`

## android

Should work without any specific settings

gradle build might failed with `More than one file was found with OS independent path 'lib/x86/libc++_shared.so'` error. If that happens add the following block to your `android/app/build.gradle`

```
tasks.whenTaskAdded((tas -> {
    // when task is 'mergeLocalDebugNativeLibs' or 'mergeLocalReleaseNativeLibs'
    if (tas.name.contains("merge") && tas.name.contains("NativeLibs")) {
        tasks.named(tas.name) {it
            doFirst {
                java.nio.file.Path notNeededDirectory = it.externalLibNativeLibs
                        .getFiles()
                        .stream()
                        // for React Native 0.71, the file value now contains "jetified-react-android" instead of "jetified-react-native"
                        .filter(file -> file.toString().contains("jetified-react-native"))
                        .findAny()
                        .orElse(null)
                        .toPath();
                java.nio.file.Files.walk(notNeededDirectory).forEach(file -> {
                    if (file.toString().contains("libc++_shared.so")) {
                        java.nio.file.Files.delete(file);
                    }
                });
            }
        }
    }
}))
```

Explain: react-native and libvlc both import `libc++_shared.so`, but we cannot use `packagingOptions.pickFirst` to handle this case, because libvlc-all:3.6.0-eap5 will crash when using `libc++_shared.so`, so we have to use `libc++_shared.so` from libvlc, so I add a gradle script to delete `libc++_shared.so` from react-native to solve this.

Reference: https://stackoverflow.com/questions/74258902/how-to-define-which-so-file-to-use-in-gradle-packaging-options

Explain why we have to use libvlc-all:3.6.0-eap5 instead of libvlc-all:3.2.6: libvlc-all:3.2.6 has a bug that subtitle won't display on Android 12 and 13, so we have to upgrade libvlc to support subtitle display on Android 12 and 13.

Reference: https://code.videolan.org/videolan/vlc-android/-/issues/2252

## iOS

1. cd to ios
2. run `pod init` (if only Podfile has not been generated in ios folder)
3. add `pod 'MobileVLCKit', '3.3.10'` to pod file **(No need if you are running RN 0.61 and up)** 
4. run `pod install` (you have to delete the app on the simulator/device and run `react-native run-ios` again)

## Optional (only for ios)

Enable Bitcode
in root project select Build Settings ---> find Bitcode and select Enable Bitcode

## TODO

1. Android video Aspect ratio and other params do not work (Events are called but all events come through a single event onVideoStateChange but the JS side does not implement it.).

## Got a few minutes to spare? Please help us to keep this repo up to date and simple to use.

#### Our idea was to keep the repo simple, and people can use it with newer RN versions without any additional config.

1. Get a fork of this repo and clone [VLC Media Player test](https://github.com/razorRun/react-native-vlc-media-player-test) 
2. Run it for ios and android locally using your fork, and do the changes. (remove this package using ```npm remove react-native-vlc-media-player``` and install the forked version from git hub ```npm i https://git-address-to-your-forked-repo```)  
3. Verify your changes and make sure everything works on both platforms. (If you need a hand with testing I might be able to help as well)
4. Send PR.
5. Be happy, Cause you're a Rockstar 🌟 ❤️

## Use

```
import { VLCPlayer, VlCPlayerView } from 'react-native-vlc-media-player';
import Orientation from 'react-native-orientation';

    <VLCPlayer
        style={[styles.video]}
        videoAspectRatio="16:9"
        source={{ uri: "https://www.radiantmediaplayer.com/media/big-buck-bunny-360p.mp4"}}
    />

or you can use

    <VlCPlayerView
          autoplay={false}
          url="https://www.radiantmediaplayer.com/media/big-buck-bunny-360p.mp4"
          Orientation={Orientation}
          ggUrl=""
          showGG={true}
          showTitle={true}
          title="Big Buck Bunny"
          showBack={true}
          onLeftPress={()=>{}}
       />
```

### VLCPlayer Props

| Prop                | Description                                                                                                                                        | Default |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `source`            | Object that contains the uri of a video or song to play eg `{{ uri: "https://video.com/example.mkv" }}`                                            | `{}`    |
| `subtitleUri`       | local subtitle file path，if you want to hide subtitle, you can set this to an empty subtitle file，current we don't support a `hide subtitle` prop.|         |
| `paused`            | Set to `true` or `false` to pause or play the media                                                                                                | `false` |
| `repeat`            | Set to `true` or `false` to loop the media                                                                                                         | `false` |
| `rate`              | Set the playback rate of the player                                                                                                                | `1`     |
| `seek`              | Set position to seek between `0` and `1` (`0` being the start, `1` being the end , use `position` from the progress object )                       |         |
| `volume`            | Set the volume of the player (`number`)                                                                                                            |         |
| `muted`             | Set to `true` or `false` to mute the player                                                                                                        | `false` |
| `audioTrack`        | Set audioTrack id (`number`)   (see `onLoad` callback VideoInfo.audioTracks)                                                                       |         |
| `textTrack`         | Set textTrack(subtitle) id  (`number`)   (see `onLoad` callback- VideoInfo.textTracks)                                                             |         |                      
| `playInBackground`  | Set to `true` or `false` to allow playing in the background                                                                                        | false   |
| `videoAspectRatio ` | Set the video aspect ratio eg `"16:9"`                                                                                                             |         |
| `autoAspectRatio`   | Set to `true` or `false` to enable auto aspect ratio                                                                                               | false   |
| `resizeMode`        | Set the behavior for the video size (`fill, contain, cover, none, scale-down`)                                                                     | none    |
| `style`             | React native stylesheet styles                                                                                                                     | `{}`    |

#### Callback props

Callback props take a function that gets fired on various player events:

| Prop           | Description                                                                                                                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onPlaying`    | Called when media starts playing returns eg `{target: 9, duration: 99750, seekable: true}`                                                                                                                           |
| `onProgress`   | Callback containing `position` as a fraction, and `duration`, `currentTime` and `remainingTime` in seconds <br />&nbsp; ◦ &nbsp;eg `{  duration: 99750, position: 0.30, currentTime: 30154, remainingTime: -69594 }` |
| `onPaused`     | Called when media is paused                                                                                                                                                                                          |
| `onStopped `   | Called when media is stoped                                                                                                                                                                                          |
| `onBuffering ` | Called when media is buffering                                                                                                                                                                                       |
| `onEnded`      | Called when media playing ends                                                                                                                                                                                       |
| `onError`      | Called when an error occurs whilst attempting to play media                                                                                                                                                          |
| `onLoad`       | Called when video info is loaded, Callback containing VideoInfo

VideoInfo example:
```
 {
    duration: 30906, 
    videoSize: {height: 240, width: 32},
    audioTracks: [
            {id: -1, name: "Disable"}, 
            {id: 1, name: "Track 1"}, 
            {id: 3, name: "Japanese Audio (2ch LC-AAC) - [Japanese]"}
    ], 
    textTracks: [
        {id: -1, name: "Disable"}, 
        {id: 4, name: "Track 1 - [English]"}, 
        {id: 5, name: "Track 2 - [Japanese]"}
    ],    
}
```

## More formats

Container formats: 3GP, ASF, AVI, DVR-MS, FLV, Matroska (MKV), MIDI, QuickTime File Format, MP4, Ogg, OGM, WAV, MPEG-2 (ES, PS, TS, PVA, MP3), AIFF, Raw audio, Raw DV, MXF, VOB, RM, Blu-ray, DVD-Video, VCD, SVCD, CD Audio, DVB, HEIF, AVIF
Audio coding formats: AAC, AC3, ALAC, AMR, DTS, DV Audio, XM, FLAC, It, MACE, MOD, Monkey's Audio, MP3, Opus, PLS, QCP, QDM2/QDMC, RealAudio, Speex, Screamtracker 3/S3M, TTA, Vorbis, WavPack, WMA (WMA 1/2, WMA 3 partially).
Capture devices: Video4Linux (on Linux), DirectShow (on Windows), Desktop (screencast), Digital TV (DVB-C, DVB-S, DVB-T, DVB-S2, DVB-T2, ATSC, Clear QAM)
Network protocols: FTP, HTTP, MMS, RSS/Atom, RTMP, RTP (unicast or multicast), RTSP, UDP, Sat-IP, Smooth Streaming
Network streaming formats: Apple HLS, Flash RTMP, MPEG-DASH, MPEG Transport Stream, RTP/RTSP ISMA/3GPP PSS, Windows Media MMS
Subtitles: Advanced SubStation Alpha, Closed Captions, DVB, DVD-Video, MPEG-4 Timed Text, MPL2, OGM, SubStation Alpha, SubRip, SVCD, Teletext, Text file, VobSub, WebVTT, TTML
Video coding formats: Cinepak, Dirac, DV, H.263, H.264/MPEG-4 AVC, H.265/MPEG HEVC, AV1, HuffYUV, Indeo 3, MJPEG, MPEG-1, MPEG-2, MPEG-4 Part 2, RealVideo 3&4, Sorenson, Theora, VC-1,[h] VP5, VP6, VP8, VP9, DNxHD, ProRes and some WMV.

## credits

[ammarahm-ed](https://github.com/ammarahm-ed)
[Nghi-NV](https://github.com/Nghi-NV)
[xuyuanzhou](https://github.com/xuyuanzhou)

## sponsors

Huge thanks to "[smartlife - one of the best custom home automation companies in new zealand](https://www.smartlife.nz/)" for helping me to keep this repo maintained 

Author - Roshan Milinda -> [roshan.digital](https://roshan.digital)
