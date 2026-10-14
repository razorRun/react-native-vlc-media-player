// `EXAMPLE_ARCH=old` prebuilds against the Legacy Architecture. React Native 0.81
// is the last release where that switch still does anything: 0.82 removed the
// Legacy Architecture, so the four-configuration CI matrix is pinned to 0.81.
const newArchEnabled = process.env.EXAMPLE_ARCH !== 'old';

module.exports = {
  expo: {
    name: 'VLC Media Player Example',
    slug: 'react-native-vlc-media-player-example',
    version: '1.0.0',
    orientation: 'default',
    newArchEnabled,
    ios: {
      bundleIdentifier: 'com.reactnativevlcmediaplayer.example',
      supportsTablet: true,
    },
    android: {
      package: 'com.reactnativevlcmediaplayer.example',
      permissions: ['android.permission.INTERNET'],
    },
    plugins: [
      [
        'react-native-vlc-media-player',
        {
          android: { legacyJetifier: false },
          ios: { includeVLCKit: false },
        },
      ],
      [
        'expo-build-properties',
        {
          // The library declares minSdk 26 in android/build.gradle, above the
          // Expo template default of 24. Without this the manifest merger fails
          // with "minSdkVersion 24 cannot be smaller than version 26".
          android: { minSdkVersion: 26 },
        },
      ],
    ],
  },
};
