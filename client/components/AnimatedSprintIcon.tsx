import React, { useEffect, useRef, useState } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";

export type SprintIconAnim = "wobble" | "float" | "pulse" | "twinkle" | "hop";
type TieredAnim = Exclude<SprintIconAnim, "hop">;

interface Props {
  type: SprintIconAnim;
  seed?: number;
  children: React.ReactNode;
}

// Tiers cycle randomly every 5s. Two "static" slots mean ~50% of cells
// are paused at any given moment, contrasting with the moving ones for
// a more lively, less uniform feel.
const DURATION_TIERS: Record<TieredAnim, number>[] = [
  { wobble: 0, float: 0, pulse: 0, twinkle: 0 },
  { wobble: 0, float: 0, pulse: 0, twinkle: 0 },
  { wobble: 1100, float: 1800, pulse: 900, twinkle: 1500 },
  { wobble: 520, float: 840, pulse: 460, twinkle: 740 },
];

// Monster hop: never static, much faster + bigger than the previous pass
// so it actually reads as bouncing on the test cells.
const HOP_DURATIONS = [220, 280, 340, 400, 460];
const HOP_AMPLITUDE = 26;

const TIER_CYCLE_MS = 5000;

// Pick a duration deterministically from (seed, type, cycleTick). Re-rolling
// the tick every 5s lets each cell switch between stop / medium / fast over
// time without losing per-cell variety.
function pickDuration(
  seed: number,
  type: SprintIconAnim,
  tick: number,
): number {
  const base = Math.abs(Math.floor(seed));
  const typeSalt = type.charCodeAt(0) * 131 + type.charCodeAt(1) * 17;
  const tickSalt = tick * 2654435761;
  const scrambled =
    (base * 374761393 + typeSalt + tickSalt) ^ (base << 7) ^ (base >>> 4);
  if (type === "hop") {
    return HOP_DURATIONS[Math.abs(scrambled) % HOP_DURATIONS.length];
  }
  const tierIndex = Math.abs(scrambled) % DURATION_TIERS.length;
  return DURATION_TIERS[tierIndex][type];
}

// Per-seed phase offset used only on first mount, so cells don't all
// crest together right at app launch.
function computeDelay(seed: number, duration: number): number {
  const base = Math.abs(Math.floor(seed));
  const scrambled = (base * 2654435761) ^ (base << 5) ^ (base >>> 3);
  return Math.abs(scrambled) % duration;
}

export function AnimatedSprintIcon({ type, seed = 0, children }: Props) {
  const progress = useSharedValue(0);
  const [tick, setTick] = useState(0);
  const isFirstRunRef = useRef(true);

  // Stagger first tier-swap per cell (0..5s) so cells don't all re-roll
  // on the same wall-clock instant.
  useEffect(() => {
    const offset = Math.abs(Math.floor(seed) * 73) % TIER_CYCLE_MS;
    let interval: ReturnType<typeof setInterval> | null = null;
    const initial = setTimeout(() => {
      setTick((t) => t + 1);
      interval = setInterval(() => setTick((t) => t + 1), TIER_CYCLE_MS);
    }, offset);
    return () => {
      clearTimeout(initial);
      if (interval) clearInterval(interval);
    };
  }, [seed]);

  useEffect(() => {
    const duration = pickDuration(seed, type, tick);
    cancelAnimation(progress);

    if (duration === 0) {
      // Ease back to neutral so the icon doesn't snap mid-motion when it
      // transitions from moving to stopped.
      progress.value = withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    // Delay only on the very first run so cells phase-offset at app launch.
    // On tier swaps we restart immediately from the current progress value
    // (smooth visual continuation, no freeze).
    const delay = isFirstRunRef.current ? computeDelay(seed, duration) : 0;
    isFirstRunRef.current = false;

    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, {
          duration,
          easing:
            type === "hop" ? Easing.out(Easing.quad) : Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      ),
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [type, seed, tick]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    switch (type) {
      case "pulse": {
        const scale = 1 + p * 0.13;
        return { transform: [{ scale }] };
      }
      case "float": {
        const tx = (p - 0.5) * 10;
        return { transform: [{ translateX: tx }] };
      }
      case "wobble": {
        const rot = (p - 0.5) * 10;
        return { transform: [{ rotate: `${rot}deg` }] };
      }
      case "twinkle": {
        const scale = 0.9 + p * 0.2;
        const rot = (p - 0.5) * 20;
        return { transform: [{ scale }, { rotate: `${rot}deg` }] };
      }
      case "hop": {
        // sin(πp) traces a parabolic arc 0 → peak → 0 across one leg, and
        // withRepeat(reverse=true) plays another arc on the way back, so
        // the icon bounces twice per cycle.
        const ty = -HOP_AMPLITUDE * Math.sin(p * Math.PI);
        return { transform: [{ translateY: ty }] };
      }
      default:
        return {};
    }
  });

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
