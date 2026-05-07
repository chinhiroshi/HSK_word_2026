import { useSyncExternalStore } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useIsFocused } from "@react-navigation/native";

let currentActive = AppState.currentState === "active";
const listeners = new Set<() => void>();
let appStateSub: { remove: () => void } | null = null;

function ensureSubscribed() {
  if (appStateSub) return;
  appStateSub = AppState.addEventListener("change", (s: AppStateStatus) => {
    const next = s === "active";
    if (next === currentActive) return;
    currentActive = next;
    listeners.forEach((l) => l());
  });
}

function subscribe(cb: () => void): () => void {
  ensureSubscribed();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): boolean {
  return currentActive;
}

export function useIsAppActive(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useShouldAnimate(): boolean {
  const focused = useIsFocused();
  const active = useIsAppActive();
  return focused && active;
}
