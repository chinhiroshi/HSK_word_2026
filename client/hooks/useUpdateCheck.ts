import { useState, useEffect, useCallback } from "react";
import Constants from "expo-constants";

const BUNDLE_ID = "app.replit.hskhsk";
const ITUNES_URL = `https://itunes.apple.com/lookup?bundleId=${BUNDLE_ID}&country=jp`;

function parseVersion(v: string): number[] {
  return v.split(".").map((n) => parseInt(n, 10) || 0);
}

function isNewer(latest: string, current: string): boolean {
  const l = parseVersion(latest);
  const c = parseVersion(current);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lv = l[i] ?? 0;
    const cv = c[i] ?? 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

export interface UpdateInfo {
  available: boolean;
  latestVersion: string | null;
  storeUrl: string | null;
}

export function useUpdateCheck() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    available: false,
    latestVersion: null,
    storeUrl: null,
  });

  const check = useCallback(async (): Promise<UpdateInfo> => {
    try {
      const currentVersion = Constants.expoConfig?.version ?? "0.0.0";
      const res = await fetch(ITUNES_URL);
      const json = await res.json();
      if (json.resultCount > 0) {
        const result = json.results[0];
        const latestVersion: string = result.version;
        const storeUrl: string = result.trackViewUrl;
        const info: UpdateInfo = {
          available: isNewer(latestVersion, currentVersion),
          latestVersion,
          storeUrl,
        };
        setUpdateInfo(info);
        return info;
      }
    } catch {
      // Network error or not yet on App Store — silently ignore
    }
    return { available: false, latestVersion: null, storeUrl: null };
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return { updateInfo, recheckUpdate: check };
}
