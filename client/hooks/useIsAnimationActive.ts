import { useContext, useEffect, useState } from "react";
import { NavigationContext } from "@react-navigation/native";
import { useIsAppActive } from "@/hooks/useIsAppActive";

// Drop-in replacement for `useIsFocused` that tolerates being called outside
// of a React Navigation context. The stock `useIsFocused` throws when there
// is no parent navigator; here we read the context directly and assume
// "focused = true" when no navigator exists, so the hook stays safe to use
// from generic components that might one day be rendered in a Storybook /
// preview / modal harness.
function useSafeIsFocused(): boolean {
  const navigation = useContext(NavigationContext);
  const [isFocused, setIsFocused] = useState<boolean>(() =>
    navigation ? navigation.isFocused() : true,
  );

  useEffect(() => {
    if (!navigation) {
      setIsFocused(true);
      return;
    }
    setIsFocused(navigation.isFocused());
    const unsubFocus = navigation.addListener("focus", () =>
      setIsFocused(true),
    );
    const unsubBlur = navigation.addListener("blur", () =>
      setIsFocused(false),
    );
    return () => {
      unsubFocus();
      unsubBlur();
    };
  }, [navigation]);

  return isFocused;
}

// True only when the app is in the foreground AND the consuming component's
// screen has navigation focus. Use this to gate any infinite Reanimated loops
// so we don't keep the GPU compositor busy while:
//   - the app is backgrounded / Control Center is open,
//   - the user switched to a different tab,
//   - the user pushed a new screen on top of the current one.
export function useIsAnimationActive(): boolean {
  const isAppActive = useIsAppActive();
  const isFocused = useSafeIsFocused();
  return isAppActive && isFocused;
}
