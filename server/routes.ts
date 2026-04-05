import type { Express } from "express";
import { createServer, type Server } from "node:http";

const VERSION_CONFIG = {
  latest: "2.1.3",
  minimum: "1.0.0",
  storeUrl: {
    ios: "https://apps.apple.com/jp/app/id6745029930",
    android: "https://play.google.com/store/apps/details?id=com.hskhsk.app",
  },
};

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/version", (_req, res) => {
    res.json(VERSION_CONFIG);
  });

  const httpServer = createServer(app);

  return httpServer;
}
