const { withAppBuildGradle } = require('@expo/config-plugins');
const generateCode = require('@expo/config-plugins/build/utils/generateCode');

const resolveAppGradleString = (options) => {
  // React Native >= 0.71 ships as `react-android`, so the jetified directory is
  // named accordingly. Apps on older React Native versions pass legacyJetifier.
  const rnJetifierName = options?.android?.legacyJetifier
    ? 'jetified-react-native'
    : 'jetified-react-android';

  // react-native and LibVLC both ship libc++_shared.so and pickFirst is not an
  // option here: LibVLC crashes with react-native's copy. So react-native's copy
  // is dropped before the merge task runs.
  return `tasks.whenTaskAdded { task ->
    if (task.name.contains("merge") && task.name.contains("NativeLibs")) {
        task.doFirst {
            def reactNativeLibDir = task.externalLibNativeLibs.getFiles().find {
                it.toString().contains("${rnJetifierName}")
            }
            // Null when react-native is consumed from source or the directory was
            // renamed upstream; nothing to strip in that case.
            if (reactNativeLibDir != null) {
                java.nio.file.Files.walk(reactNativeLibDir.toPath()).withCloseable { paths ->
                    paths.filter { it.toString().contains("libc++_shared.so") }
                         .forEach { java.nio.file.Files.delete(it) }
                }
            }
        }
    }
}`;
};

const withGradleTasks = (config, options) => {
  if (!options || !options.android) {
    return config;
  }
  return withAppBuildGradle(config, (config) => {
    const newCode = generateCode.mergeContents({
      tag: 'withVlcMediaPlayer',
      src: config.modResults.contents,
      // `applyNativeModulesAppBuildGradle(project)` was the previous anchor; it no
      // longer exists in React Native >= 0.71 / Expo templates, which made this mod
      // throw during `expo prebuild`. The React Native Gradle plugin is applied in
      // every template and is a stable anchor.
      newSrc: resolveAppGradleString(options),
      anchor: /apply plugin: ["']com\.facebook\.react["']/,
      offset: 1,
      comment: '//',
    });

    config.modResults.contents = newCode.contents;

    return config;
  });
};

module.exports = withGradleTasks;
