module.exports = ({ config }) => {
  const apiKey = process.env.REVENUECAT_API_KEY || "";
  const safeApiKey = apiKey.startsWith("test_") ? "" : apiKey;
  return {
    ...config,
    extra: {
      ...config.extra,
      revenueCatApiKey: safeApiKey,
    },
  };
};
