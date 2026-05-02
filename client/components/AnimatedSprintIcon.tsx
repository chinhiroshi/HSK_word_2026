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

export type SprintIconAnim = "wobble" | "float" | "pulse" | "twinkle";

interface Props {
  type: SprintIconAnim;
  seed?: number;
  children: React.ReactNode;
}

const DURATIONS: Record<SprintIconAnim, number> = {
  wobble: 750,
  float: 1200,
  pulse: 650,
  twinkle: 1050,
};

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
    const duration = DURATIONS[type];
    const delay = computeDelay(seed, duration);
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, {
          duration,
          easing: Easing.inOut(Easing.sin),
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
      default:
        return {};
    }
  });

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
