import { useEffect } from "react";
import * as Updates from "expo-updates";

export function useOTAUpdate() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } catch {
        // OTA チェック失敗はサイレントに無視（ネットワーク不可など）
      }
    })();
  }, []);
}
