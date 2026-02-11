import { pinyin } from "pinyin-pro";

export function getPinyin(chinese: string): string {
  if (!chinese) return "";
  try {
    return pinyin(chinese, { toneType: "symbol", type: "string" });
  } catch {
    return "";
  }
}
