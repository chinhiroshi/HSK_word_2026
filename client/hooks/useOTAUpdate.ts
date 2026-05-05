import { useEffect } from "react";
import * as Updates from "expo-updates";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { capture } from "@/lib/analytics";

const OTA_STATUS_KEY = "@hskhsk_ota_status_v1";

export type OtaStatusResult =
  | "no_update"
  | "fetched_reloading"
  | "error"
  | "skipped_dev"
  | "skipped_disabled";

export type OtaStatus = {
  lastCheckedAt: string;
  result: OtaStatusResult;
  errorMessage?: string;
  manifestUpdateId?: string;
};

async function persist(s: OtaStatus) {
  try {
    await AsyncStorage.setItem(OTA_STATUS_KEY, JSON.stringify(s));
  } catch {
    // best-effort persistence
  }
}

export async function getOtaStatus(): Promise<OtaStatus | null> {
  try {
    const raw = await AsyncStorage.getItem(OTA_STATUS_KEY);
    return raw ? (JSON.parse(raw) as OtaStatus) : null;
  } catch {
    return null;
  }
}

/**
 * Manually trigger an OTA check + fetch + reload. Returns the resulting
 * OtaStatus (or throws if reload happens). Safe to call from UI.
 */
export async function forceCheckOTA(): Promise<OtaStatus> {
  const startedAt = new Date().toISOString();
  if (__DEV__) {
    const s: OtaStatus = { lastCheckedAt: startedAt, result: "skipped_dev" };
    await persist(s);
    return s;
  }
  if (!Updates.isEnabled) {
    const s: OtaStatus = { lastCheckedAt: startedAt, result: "skipped_disabled" };
    await persist(s);
    return s;
  }
  try {
    capture("ota_check_started", {
      runtime_version: Updates.runtimeVersion,
      channel: Updates.channel,
      manual: true,
    });
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) {
      const s: OtaStatus = { lastCheckedAt: startedAt, result: "no_update" };
      await persist(s);
      capture("ota_check_result", { is_available: false, manual: true });
      return s;
    }
    const manifestUpdateId =
      (check as { manifest?: { id?: string } }).manifest?.id ?? "";
    capture("ota_check_result", {
      is_available: true,
      manifest_update_id: manifestUpdateId,
      manual: true,
    });
    await Updates.fetchUpdateAsync();
    const s: OtaStatus = {
      lastCheckedAt: startedAt,
      result: "fetched_reloading",
      manifestUpdateId,
    };
    await persist(s);
    capture("ota_fetch_succeeded", { manifest_update_id: manifestUpdateId, manual: true });
    await Updates.reloadAsync();
    return s;
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.warn("[OTA] force check failed:", errorMessage);
    const s: OtaStatus = {
      lastCheckedAt: startedAt,
      result: "error",
      errorMessage,
    };
    await persist(s);
    capture("ota_check_failed", { error: errorMessage, manual: true });
    return s;
  }
}

export function useOTAUpdate() {
  useEffect(() => {
    const startedAt = new Date().toISOString();

    if (__DEV__) {
      void persist({ lastCheckedAt: startedAt, result: "skipped_dev" });
      return;
    }
    if (!Updates.isEnabled) {
      void persist({ lastCheckedAt: startedAt, result: "skipped_disabled" });
      return;
    }

    (async () => {
      try {
        capture("ota_check_started", {
          runtime_version: Updates.runtimeVersion,
          channel: Updates.channel,
          manual: false,
        });
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) {
          await persist({ lastCheckedAt: startedAt, result: "no_update" });
          capture("ota_check_result", { is_available: false, manual: false });
          return;
        }
        const manifestUpdateId =
          (check as { manifest?: { id?: string } }).manifest?.id ?? "";
        capture("ota_check_result", {
          is_available: true,
          manifest_update_id: manifestUpdateId,
          manual: false,
        });
        await Updates.fetchUpdateAsync();
        await persist({
          lastCheckedAt: startedAt,
          result: "fetched_reloading",
          manifestUpdateId,
        });
        capture("ota_fetch_succeeded", {
          manifest_update_id: manifestUpdateId,
          manual: false,
        });
        await Updates.reloadAsync();
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.warn("[OTA] check/fetch failed:", errorMessage);
        await persist({
          lastCheckedAt: startedAt,
          result: "error",
          errorMessage,
        });
        capture("ota_check_failed", { error: errorMessage, manual: false });
      }
    })();
  }, []);
}
