import { useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

// Returns true while the app is in the foreground ("active"). Becomes false
// when the user backgrounds the app, opens Control Center, switches apps, or
// the system shows a system prompt. Used to pause infinite Reanimated loops
// so we don't burn battery while the screen isn't visible to the user.
export function useIsAppActive(): boolean {
  const [isActive, setIsActive] = useState<boolean>(
    AppState.currentState === "active",
  );

  useEffect(() => {
    const handle = (next: AppStateStatus) => {
      setIsActive(next === "active");
    };
    const sub = AppState.addEventListener("change", handle);
    setIsActive(AppState.currentState === "active");
    return () => {
      sub.remove();
    };
  }, []);

  return isActive;
}
