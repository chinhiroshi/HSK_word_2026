import { createContext, useContext } from "react";
import { UpdateInfo } from "@/hooks/useUpdateCheck";

export interface AppUpdateContextValue {
  updateInfo: UpdateInfo;
  recheckUpdate: () => Promise<UpdateInfo>;
}

export const AppUpdateContext = createContext<AppUpdateContextValue>({
  updateInfo: { available: false, latestVersion: null, storeUrl: null },
  recheckUpdate: async () => ({ available: false, latestVersion: null, storeUrl: null }),
});

export function useAppUpdate() {
  return useContext(AppUpdateContext);
}
