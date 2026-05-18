const { withAppBuildGradle } = require("expo/config-plugins");

module.exports = function withAndroidLintFix(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (!src.includes("// withAndroidLintFix")) {
      const lintBlock = `
    // withAndroidLintFix
    lint {
        abortOnError false
        checkReleaseBuilds false
        disable 'ExtraTranslation', 'MissingTranslation'
    }
`;
      src = src.replace(/android\s*\{/, (m) => `${m}\n${lintBlock}`);
      cfg.modResults.contents = src;
    }
    return cfg;
  });
};
