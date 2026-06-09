const { withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

module.exports = function withGradleWrapper(config) {
  // Step 1: pin Gradle wrapper to 8.14.3
  config = withDangerousMod(config, [
    "android",
    (config) => {
      const gradleWrapperPath = path.join(
        config.modRequest.platformProjectRoot,
        "gradle/wrapper/gradle-wrapper.properties"
      );

      let content = fs.readFileSync(gradleWrapperPath, "utf8");
      content = content.replace(
        /distributionUrl=.+/,
        "distributionUrl=https\\://services.gradle.org/distributions/gradle-8.14.3-bin.zip"
      );
      fs.writeFileSync(gradleWrapperPath, content);

      return config;
    },
  ]);

  // Step 2: fix hermesCommand — react-native 0.73+ bundles hermesc inside itself,
  // there is no longer a separate 'hermes-compiler' npm package.
  // Removing the hermesCommand line lets the com.facebook.react plugin use its
  // own default: ${reactNativeDir}/sdks/hermesc/%OS-BIN%/hermesc
  config = withDangerousMod(config, [
    "android",
    (config) => {
      const buildGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        "app/build.gradle"
      );

      let content = fs.readFileSync(buildGradlePath, "utf8");
      content = content.replace(
        /^[ \t]*hermesCommand = .*hermes-compiler.*\r?\n/m,
        ""
      );
      fs.writeFileSync(buildGradlePath, content);

      return config;
    },
  ]);

  // Step 3: limitar arquiteturas a arm64-v8a — x86/x86_64 são só p/ emulador
  // Windows e quebram (e tornam lento) o build no WSL/Linux.
  config = withDangerousMod(config, [
    "android",
    (config) => {
      const gradlePropsPath = path.join(
        config.modRequest.platformProjectRoot,
        "gradle.properties"
      );

      let content = fs.readFileSync(gradlePropsPath, "utf8");
      content = content.replace(
        /^reactNativeArchitectures=.*$/m,
        "reactNativeArchitectures=arm64-v8a"
      );
      fs.writeFileSync(gradlePropsPath, content);

      return config;
    },
  ]);

  return config;
};
