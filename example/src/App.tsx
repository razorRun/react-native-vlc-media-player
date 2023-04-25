import * as React from 'react';

import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import VLC, {VLCPlayerALT, VLCPlayerView} from 'react-native-vlc-media-player';

export default function App() {
  console.log(VLC)
  console.log(VLCPlayerALT)
  console.log("Player: ", VLCPlayerView)

  return (
      <>
        <ActivityIndicator style={styles.activityIndicator} size={'large'} />
        <VLC
            source={{
              // uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
              // uri: "https://sample.vodobox.net/skate_phantom_flex_4k/skate_phantom_flex_4k.m3u8",
              // type: "m3u8",
              uri: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
              type: 'mpd',
            }}
            style={[
              {
                ...styles.fullScreen,
                // backgroundColor: "rgba(0,34,255,0.6)",
              },
              StyleSheet.absoluteFillObject,
            ]}
            onEnded={() => {
              console.log("End reached");
            }}
            paused
        />
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
