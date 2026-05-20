const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

const SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;

module.exports = function withNetworkSecurityConfig(config) {
  // Step 1: write res/xml/network_security_config.xml
  config = withDangerousMod(config, [
    "android",
    (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        "app/src/main/res/xml"
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, "network_security_config.xml"),
        SECURITY_CONFIG_XML
      );
      return config;
    },
  ]);

  // Step 2: add android:networkSecurityConfig to <application> in AndroidManifest
  config = withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0].$;
    app["android:networkSecurityConfig"] = "@xml/network_security_config";
    return config;
  });

  return config;
};
