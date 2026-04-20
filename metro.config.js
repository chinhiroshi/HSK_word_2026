const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const ignored = [
  /\/\.local\/.*/,
  /\/node_modules\/.cache\/.*/,
  /\/\.git\/.*/,
];

config.resolver = config.resolver || {};
config.resolver.blockList = ignored;
config.watcher = config.watcher || {};
config.watcher.additionalExts = config.watcher.additionalExts || [];
config.watcher.watchman = config.watcher.watchman || {};
config.watcher.healthCheck = config.watcher.healthCheck || {};
config.watcher.unstable_autoSaveCache = false;
config.watchFolders = (config.watchFolders || []).filter(
  (p) => !p.includes("/.local")
);

module.exports = config;
