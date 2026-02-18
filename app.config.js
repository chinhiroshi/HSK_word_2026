module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      revenueCatApiKey: process.env.REVENUECAT_API_KEY || "",
    },
  };
};
