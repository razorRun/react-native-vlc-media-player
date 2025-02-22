const { withAppBuildGradle } = require("@expo/config-plugins");
const generateCode = require("@expo/config-plugins/build/utils/generateCode");

const resolveAppGradleString = (options) => {
    // for React Native 0.71, the file value now contains "jetified-react-android" instead of "jetified-react-native"
    const rnJetifierName = options?.android?.legacyJetifier ? "jetified-react-native" : "jetified-react-android";

    const gradleString = `tasks.whenTaskAdded((tas -> {
        // when task is 'mergeLocalDebugNativeLibs' or 'mergeLocalReleaseNativeLibs'
        if (tas.name.contains("merge") && tas.name.contains("NativeLibs")) {
            tasks.named(tas.name) {it
                doFirst {
                    java.nio.file.Path notNeededDirectory = it.externalLibNativeLibs
                            .getFiles()
                            .stream()
                            .filter(file -> file.toString().contains("${rnJetifierName}"))
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
    }))`;

    return gradleString;
};

const withGradleTasks = (config, options) => {
    if(!options || !options.android){
        return config;
    }
    return withAppBuildGradle(config, (config) => {
        const newCode = generateCode.mergeContents({
            tag: "withVlcMediaPlayer",
            src: config.modResults.contents,
            newSrc: resolveAppGradleString(options),
            anchor: /applyNativeModulesAppBuildGradle\(project\)/i,
            offset: 2,
            comment: "//",
        });

        config.modResults.contents = newCode.contents;

        return config;
    });
};

module.exports = withGradleTasks;
