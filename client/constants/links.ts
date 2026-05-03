import { Platform } from "react-native";

export const APP_STORE_URL = "https://apps.apple.com/jp/app/id6758777391";
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=app.replit.hskhsk";

export function getStoreUrl(): string {
  return Platform.OS === "android" ? PLAY_STORE_URL : APP_STORE_URL;
}
