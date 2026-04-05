import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** useHeaderHeight() が初回レンダリング時に 0 を返す場合のフォールバック付きヘッダー高さ */
export function useSafeHeaderPadding(): number {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  return headerHeight > 0 ? headerHeight : insets.top + 56;
}
