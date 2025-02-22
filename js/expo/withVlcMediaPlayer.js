const withGradleTasks = require("./android/withGradleTasks");
const withMobileVlcKit = require("./ios/withMobileVlcKit");

/**
 * Adds required native code to work with expo development build
 *
 * @param {object} config - Expo native configuration
 * @param {object} options - Plugin options
 * @param {boolean} options.ios.includeVLCKit - If `true`, it will include VLC Kit on PodFile (No need if you are running RN 0.61 and up)
 * @param {boolean} options.android.legacyJetifier - Must be `true`, if react-native version lower than 0.71 to replace jetifier name on from react native libs
 *
 * @returns resolved expo configuration
 */
const withVlcMediaPlayer = (config, options) => {
    config = withGradleTasks(config, options);
    config = withMobileVlcKit(config, options);

    return config;
};

module.exports = withVlcMediaPlayer;
