import * as React from 'react';

import {ActivityIndicator, Button, StyleSheet, Text, View} from 'react-native';
import {VLCPlayerView, VLCPlayer} from 'react-native-vlc-media-player';

export default function App() {
  console.log("PlayerView: ", VLCPlayerView)
  console.log("P: ", VLCPlayer)
  const [pause, setPause] = React.useState(false)

  return (
      <>
        <ActivityIndicator style={styles.activityIndicator} size={'large'} />
        <VLCPlayer
            source={{
              // uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
              uri: "https://sample.vodobox.net/skate_phantom_flex_4k/skate_phantom_flex_4k.m3u8",
              type: "m3u8",
              // uri: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
              // type: 'mpd',
            }}
            style={[
              {
                flex: 1,
              },
            ]}
            onPaused={() => console.log("Paused")}
            onEnded={() => {
              console.log("End reached");
            }}
            // onProgress={console.log}
            paused={pause}
            seek={0.98}
            rate={1}
            repeat={true}
        />
        <Button title={"Pause"} onPress={() => setPause(!pause)} />
      </>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  activityIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
});
