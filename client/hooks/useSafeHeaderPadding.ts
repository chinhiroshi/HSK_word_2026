import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * 透明ヘッダーのコンテンツ上部パディング用フック。
 * useHeaderHeight() がセーフエリアを含まない値(44px)を返す端末(iPhone14/15 等)でも
 * コンテンツがヘッダーに隠れないよう Math.max で下限を保証する。
 */
export function useSafeHeaderPadding(): number {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  // headerHeight がセーフエリアを含まない場合(= insets.top + 44 未満)でも安全な値を返す
  return Math.max(headerHeight, insets.top + 44);
}
