const { withDangerousMod } = require('@expo/config-plugins');
const generateCode = require('@expo/config-plugins/build/utils/generateCode');
const path = require('path');
const fs = require('fs');

// Single source of truth for the VLC version: the "vlc" field in package.json.
// react-native-vlc-media-player.podspec and android/build.gradle read the same field.
const { vlc } = require('../../package.json');

const withMobileVlcKit = (config, options) => {
  // No need if you are running RN 0.61 and up
  if (!options?.ios?.includeVLCKit) {
    return config;
  }

  return withDangerousMod(config, [
    'ios',
    (config) => {
      const filePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );

      const contents = fs.readFileSync(filePath, 'utf-8');

      const newCode = generateCode.mergeContents({
        tag: 'withVlcMediaPlayer',
        src: contents,
        newSrc: `  pod 'MobileVLCKit', '${vlc.ios}'`,
        anchor: /use_expo_modules!/i,
        offset: 3,
        comment: '  #',
      });

      fs.writeFileSync(filePath, newCode.contents);

      return config;
    },
  ]);
};

module.exports = withMobileVlcKit;
