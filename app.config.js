module.exports = ({ config }) => {
  const iosKey = process.env.REVENUECAT_API_KEY || "";
  const androidKey = process.env.REVENUECAT_ANDROID_API_KEY || "";
  const safeIosKey = iosKey.startsWith("test_") ? "" : iosKey;
  const safeAndroidKey = androidKey.startsWith("test_") ? "" : androidKey;
  return {
    ...config,
    extra: {
      ...config.extra,
      revenueCatApiKey: safeIosKey,
      revenueCatAndroidApiKey: safeAndroidKey,
    },
  };
};
