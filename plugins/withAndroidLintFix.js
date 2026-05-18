const { withAppBuildGradle } = require("expo/config-plugins");

module.exports = function withAndroidLintFix(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (!src.includes("// withAndroidLintFix")) {
      const lintBlock = `
    // withAndroidLintFix: scoped suppression of iOS-only locale keys
    // (locales/*.json contains CFBundleDisplayName for iOS InfoPlist which
    // Expo prebuild also emits into Android values-*/strings.xml, tripping
    // ExtraTranslation/MissingTranslation lint). All other release lint
    // checks remain enabled (abortOnError stays at the AGP default = true).
    lint {
        disable 'ExtraTranslation', 'MissingTranslation'
    }
`;
      src = src.replace(/android\s*\{/, (m) => `${m}\n${lintBlock}`);
      cfg.modResults.contents = src;
    }
    return cfg;
  });
};
