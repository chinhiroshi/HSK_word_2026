import React, { useEffect } from "react";
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

// Four tiers: static (no motion) / slow (#10) / medium (#12) / fast (#13 sped
// up another 30%). Each cell lands on one of these so the map breathes at
// varied tempos and a quarter of the cells stay completely still — making
// the moving ones feel more alive by contrast.
const DURATION_TIERS: Record<TieredAnim, number>[] = [
  { wobble: 0, float: 0, pulse: 0, twinkle: 0 },
  { wobble: 1800, float: 3000, pulse: 1400, twinkle: 2400 },
  { wobble: 1100, float: 1800, pulse: 900, twinkle: 1500 },
  { wobble: 520, float: 840, pulse: 460, twinkle: 740 },
];

// "hop" is reserved for the test-cell monster: always hops, never static,
// at a random fast tempo per seed so different test cells bounce on
// different beats.
const HOP_DURATIONS = [380, 460, 540, 620, 700];

// Pick a duration deterministically from (seed, type). Salting by `type`
// means the same cell can still get different tiers for different animation
// kinds, but the same (seed,type) pair always picks the same value — no
// flicker on re-render and no resync between neighbors.
function pickDuration(seed: number, type: SprintIconAnim): number {
  const base = Math.abs(Math.floor(seed));
  const typeSalt = type.charCodeAt(0) * 131 + type.charCodeAt(1) * 17;
  const scrambled = (base * 374761393 + typeSalt) ^ (base << 7) ^ (base >>> 4);
  if (type === "hop") {
    return HOP_DURATIONS[Math.abs(scrambled) % HOP_DURATIONS.length];
  }
  const tierIndex = Math.abs(scrambled) % DURATION_TIERS.length;
  return DURATION_TIERS[tierIndex][type];
}

// Spread seed deterministically across the full cycle so adjacent cells
// don't end up phase-locked. Multiplying + xor shift gives us a wide range
// even when the caller passes a small seed (e.g. cell index 0..30).
function computeDelay(seed: number, duration: number): number {
  const base = Math.abs(Math.floor(seed));
  const scrambled = (base * 2654435761) ^ (base << 5) ^ (base >>> 3);
  return Math.abs(scrambled) % duration;
}

export function AnimatedSprintIcon({ type, seed = 0, children }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const duration = pickDuration(seed, type);
    if (duration === 0) {
      progress.value = 0;
      return;
    }
    const delay = computeDelay(seed, duration);
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
      progress.value = 0;
    };
  }, [type, seed]);

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
        // sin(πp) traces a parabolic arc: 0 → peak → 0 across one leg.
        // With withRepeat(reverse=true) the next leg traces another arc,
        // so the icon looks like it's bouncing once per leg.
        const ty = -14 * Math.sin(p * Math.PI);
        return { transform: [{ translateY: ty }] };
      }
      default:
        return {};
    }
  });

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
