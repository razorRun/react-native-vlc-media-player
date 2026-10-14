# react-native-vlc-media-player

## Supported RN Versions

- React Native `>= 0.74` (declared in `peerDependencies`)
- CI builds the example app against React Native `0.81.6` on **iOS and Android,
  each on the Legacy and the New Architecture**.
- React Native `0.82` removed the Legacy Architecture. The player still runs
  through the legacy view manager, so on `0.82+` it currently relies on the
  interop layer — full Fabric/codegen support is tracked in
  [`MODERNIZATION.md`](MODERNIZATION.md).

## Supported formats

Support for network streams, RTSP, RTP, RTMP, HLS, MMS.
Play all files, [in all formats, including exotic ones, like the classic VLC media player.](#-More-formats)
Play MKV, multiple audio tracks (including 5.1), and subtitles tracks (including SSA!)

## Sample repo

The repo contains a runnable example app in [`example/`](example) — see
[Contributing](#contributing). There is also a standalone
[VLC Media Player test](https://github.com/razorRun/react-native-vlc-media-player-test)
project.

## Add it to your project

Run

`npm i react-native-vlc-media-player --save`

or

`yarn add react-native-vlc-media-player`

If not using Expo also run

`react-native link react-native-vlc-media-player`

## Android

**Requires `minSdkVersion` 26.** The library declares it, so a lower value in your
app fails the manifest merger with `minSdkVersion 24 cannot be smaller than
version 26`. Raise it in `android/app/build.gradle`, or with Expo through
[`expo-build-properties`](https://docs.expo.dev/versions/latest/sdk/build-properties/):

```json
["expo-build-properties", { "android": { "minSdkVersion": 26 } }]
```

Beyond that it should work without specific settings. The Gradle build might fail
with `More than one file was found with OS independent path 'lib/x86/libc++_shared.so'`.

If that happens, add the following block to your `android/app/build.gradle`:

```gradle
tasks.whenTaskAdded { task ->
    if (task.name.contains("merge") && task.name.contains("NativeLibs")) {
        task.doFirst {
            // React Native >= 0.71 ships as "react-android"; on older versions the
            // directory is named "jetified-react-native".
            def reactNativeLibDir = task.externalLibNativeLibs.getFiles().find {
                it.toString().contains("jetified-react-android")
            }
            if (reactNativeLibDir != null) {
                java.nio.file.Files.walk(reactNativeLibDir.toPath()).withCloseable { paths ->
                    paths.filter { it.toString().contains("libc++_shared.so") }
                         .forEach { java.nio.file.Files.delete(it) }
                }
            }
        }
    }
}
```

Expo users get this automatically from the config plugin (see [Expo](#expo)) and
do not need to add it by hand.

### Explanation
`react-native` and `LibVLC` both import `libc++_shared.so`, but we cannot use `packagingOptions.pickFirst` to handle this case, because `libvlc-all:3.6.0-eap5` will crash when using `libc++_shared.so`, so we have to use `libc++_shared.so` from `LibVLC`.

Reference: https://stackoverflow.com/questions/74258902/how-to-define-which-so-file-to-use-in-gradle-packaging-options

### Also to consider
`libvlc-all:3.2.6` has a bug where subtitles won't display on Android 12 and 13, so we have to upgrade `LibVLC` to support it.

Reference: https://code.videolan.org/videolan/vlc-android/-/issues/2252

## iOS

1. cd to ios
2. run `pod install` (you have to delete the app on the simulator/device and run it again)

The pod pulls `MobileVLCKit` (or `TVVLCKit` on tvOS) in itself — the version lives
in the `vlc` field of this package's `package.json`, so nothing needs pinning in
your Podfile.

Minimum deployment target is **iOS 13.4**.

### Important

Starting from iOS 14, you are required to provide a message for the `NSLocalNetworkUsageDescription` key in `Info.plist` if your app uses the local network directly or indirectly.

It seems the `MobileVLCKit` library powering the VLC Player on iOS makes use of this feature when playing external media from sources such as RTSP streams from IP cameras.

Provide a custom message specifying how your app will make use of the network so your App Store submission is not rejected for this reason, read more about this here:

https://developer.apple.com/documentation/bundleresources/information-property-list/nslocalnetworkusagedescription

### Optional

In root project select "Build Settings", find "Bitcode" and select "Enable Bitcode"

## Expo

This package works with Expo, Expo Go does not include custom native code so you must use a [development build](https://docs.expo.dev/develop/development-builds/introduction/).

To enable just insert the `react-native-vlc-media-player` plugin to the "plugins" array from `app.config.js` or `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-vlc-media-player",
        {
          "ios": {
              "includeVLCKit": false
          },
          "android": {
              "legacyJetifier": false
          }
        }
      ]
    ],
  }
}
```

### Configuring the plugin is optional:

- Set `ios.includeVLCKit` to `true` if using RN < 0.61
- Set `android.legacyJetifier` to `true` if using RN < 0.71

Then rebuild your app as described in the ["Adding custom native code"](https://docs.expo.io/workflow/customizing/) guide.

## Usage

```jsx
import { VLCPlayer, VlCPlayerView } from 'react-native-vlc-media-player';
import Orientation from 'react-native-orientation';

<VLCPlayer
  style={[styles.video]}
  videoAspectRatio="16:9"
  source={{ uri: "https://www.radiantmediaplayer.com/media/big-buck-bunny-360p.mp4" }}
/>

// Or you can use

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

| Prop                | Description                                                                                                                                          | Default |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `source`            | Object that contains the uri of a video or song to play eg `{{ uri: "https://video.com/example.mkv" }}`                                              | `{}`    |
| `subtitleUri`       | local subtitle file path，if you want to hide subtitle, you can set this to an empty subtitle file，current we don't support a `hide subtitle` prop. |         |
| `paused`            | Set to `true` or `false` to pause or play the media                                                                                                  | `false` |
| `repeat`            | Set to `true` or `false` to loop the media                                                                                                           | `false` |
| `rate`              | Set the playback rate of the player                                                                                                                  | `1`     |
| `seek`              | Set position to seek between `0` and `1` (`0` being the start, `1` being the end , use `position` from the progress object )                         |         |
| `volume`            | Set the volume of the player (`number`)                                                                                                              |         |
| `muted`             | Set to `true` or `false` to mute the player                                                                                                          | `false` |
| `audioTrack`        | Set audioTrack id (`number`) (see `onLoad` callback VideoInfo.audioTracks)                                                                           |         |
| `textTrack`         | Set textTrack(subtitle) id (`number`) (see `onLoad` callback- VideoInfo.textTracks)                                                                  |         |
| `playInBackground`  | Set to `true` or `false` to allow playing in the background                                                                                          | false   |
| `videoAspectRatio ` | Set the video aspect ratio eg `"16:9"`                                                                                                               |         |
| `autoAspectRatio`   | Set to `true` or `false` to enable auto aspect ratio                                                                                                 | false   |
| `resizeMode`        | Set the behavior for the video size (`fill, contain, cover, none, scale-down`)                                                                       | none    |
| `style`             | React native stylesheet styles                                                                                                                       | `{}`    |
| `autoplay`          | Set to `true` or `false` to enable autoplay                                                                                                          | `true`  |

#### Callback props

Callback props take a function that gets fired on various player events:

| Prop                 | Description                                                                                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onPlaying`          | Called when media starts playing returns eg `{target: 9, duration: 99750, seekable: true}`                                                                                                                           |
| `onProgress`         | Callback containing `position` as a fraction, and `duration`, `currentTime` and `remainingTime` in seconds <br />&nbsp; ◦ &nbsp;eg `{  duration: 99750, position: 0.30, currentTime: 30154, remainingTime: -69594 }` |
| `onPaused`           | Called when media is paused                                                                                                                                                                                          |
| `onStopped `         | Called when media is stoped                                                                                                                                                                                          |
| `onBuffering `       | Called when media is buffering                                                                                                                                                                                       |
| `onEnded`            | Called when media playing ends                                                                                                                                                                                       |
| `onError`            | Called when an error occurs whilst attempting to play media                                                                                                                                                          |
| `onLoad`             | Called when video info is loaded, Callback containing VideoInfo                                                                                                                                                      |
| `onRecordingCreated` | Called when a new recording is created as the result of `startRecording()` `stopRecording()`                                                                                                                         |
| `onSnapshot`         | Called when a new snapshot is created as the result of `snapshot()` - contains `{success: boolean, path?: string, error?: string}`                                                                                   |

#### Methods props

Methods available on the VLC player ref. Each one dispatches a native command, so
they work on both the Legacy and the New Architecture.

```tsx
import { useRef } from 'react';
import { VLCPlayer, type PlaybackMethods } from 'react-native-vlc-media-player';

const player = useRef<PlaybackMethods>(null);

<VLCPlayer ref={player} source={{ uri }} />;

player.current?.seek(0.5);
```

| Method                                 | Description                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `startRecording(directory: string)`    | Start recording the current video into the given directory                                                         |
| `stopRecording()`                      | Stop recording the current video. The final recording file can be obtained from the `onRecordingCreated` callback   |
| `stopPlayer()`                         | Stop playback                                                                                                      |
| `snapshot(path: string)`               | Capture a snapshot of the current video frame to the given file path                                               |
| `seek(pos: number)`                    | Seek to a fraction of the duration, between `0` and `1`                                                            |
| `resume(isResume?: boolean)`           | Resume playback, or pause it with `false`. Defaults to `true`                                                      |
| `autoAspectRatio(isAuto: boolean)`     | Toggle automatic aspect ratio. Android only; a no-op on iOS                                                        |
| `changeVideoAspectRatio(ratio)`        | Set the aspect ratio, e.g. `"16:9"`                                                                                |
| `setNativeProps(props)`                | **Deprecated.** Does not exist on the New Architecture. Use the methods above or the corresponding props           |

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

## Contributing

The repo ships an example app, so you no longer need a separate test project.

```sh
npm install                # installs the library and the example workspace

npm run lint               # ESLint
npm run typecheck          # tsc --noEmit
npm run build              # react-native-builder-bob -> lib/

cd example
npx expo prebuild --platform android   # or ios
npx expo run:android                   # or run:ios
```

The example app links the library from `../src`, so a change in `src/` shows up
without rebuilding `lib/`.

### Testing both architectures

`EXAMPLE_ARCH=old` prebuilds against the Legacy Architecture:

```sh
cd example
EXAMPLE_ARCH=old npx expo prebuild --platform android --clean
```

On iOS, the Legacy Architecture builds React Native from source, and `Pods/fmt`
does not compile with the clang in Xcode 26 and newer. Installing the prebuilt
dependencies instead works around it:

```sh
cd example
EXAMPLE_ARCH=old npx expo prebuild --platform ios --clean
cd ios && RCT_NEW_ARCH_ENABLED=0 RCT_USE_RN_DEP=1 pod install
```

Both architectures are still supported, so please check a change against both —
that is exactly what the four CI jobs do. Note that React Native `0.81` is the
last version where this switch exists at all.

### Then

1. Verify your change in the example app on both platforms.
2. Send a PR. `npm run lint && npm run typecheck && npm run build` has to pass.
3. Be happy, cause you're a Rockstar 🌟 ❤️

## Known Issues

### iOS 17 Simulator Crash

It is a [known issue](https://code.videolan.org/videolan/VLCKit/-/issues/724) that apps can crash on playback in iOS simulator with `EXEC_BAD_ACCESS` errors. This appears to only be on certain iOS 17.x versions (17.4, 17.5).
If this happens, try running on an iOS 18+ simulator instead.

## TODO

1. Android video aspect ratio and other params do not work (Events are called but all events come through a single event onVideoStateChange but the JS side does not implement it)

## Credits

[cornejobarraza](https://github.com/cornejobarraza)
[ammarahm-ed](https://github.com/ammarahm-ed)
[Nghi-NV](https://github.com/Nghi-NV)
[xuyuanzhou](https://github.com/xuyuanzhou)


Author - Roshan Milinda -> [roshan.digital](https://roshan.digital)
