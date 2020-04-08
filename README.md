# react-native-vlc-media-player

A `<VLCPlayer>` component for react-native
project was cloned from `react-native-yz-vlcplayer` as it is not maintained any more and does not support RN newer versions.

## Supported RN Versions

0.59,0.60,0.61 and up
PODs are updated to works with 0.61 and up.(Tested in 0.61.5)

### Add it to your project

Run

`npm i react-native-vlc-media-player --save`

Run `react-native link react-native-vlc-media-player`

## android

Should work without any specific settings

## ios

1. cd to ios
2. run `pod init` (if only Podfile has not been generated in ios folder)
3. add `pod 'MobileVLCKit-unstable', '3.0.0a44'` to pod file
4. run `pod install` (you have to delete the app on the simulator/device and run `react-native run-ios` again)

## Optional(only for ios)

Enable Bitcode
in root project select Build Settings ---> find Bitcode and select Enable Bitcode

## TODO

1. Android video Aspect ratio does not work.

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
