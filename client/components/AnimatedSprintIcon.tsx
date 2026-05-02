import React, { useEffect, useState } from "react";
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

// Tempo tiers indexed 0..3: stop / slow / medium / fast.
const DURATION_TIERS: Record<TieredAnim, number>[] = [
  { wobble: 0, float: 0, pulse: 0, twinkle: 0 },
  { wobble: 1260, float: 2100, pulse: 980, twinkle: 1680 },
  { wobble: 770, float: 1260, pulse: 630, twinkle: 1050 },
  { wobble: 360, float: 590, pulse: 320, twinkle: 520 },
];

// Each deco icon breathes through this 35-second pattern. The bookend STOPs
// concatenate across loops, giving a ~10s rest period between active windows.
const PHASE_PATTERN = [0, 1, 2, 3, 2, 1, 0]; // STOP→SLOW→MED→FAST→MED→SLOW→STOP
const PHASE_DURATION_MS = 5000;
const FULL_CYCLE_MS = PHASE_PATTERN.length * PHASE_DURATION_MS;

// Monster swing tempos: only fast or medium, never stopped or slow.
const SWING_DURATIONS = [320, 380, 460, 540, 620, 700, 770];

function hashSeed(seed: number, salt: number): number {
  const base = Math.abs(Math.floor(seed));
  return Math.abs((base * 374761393 + salt) ^ (base << 7) ^ (base >>> 4));
}

export function AnimatedSprintIcon({ type, seed = 0, children }: Props) {
  if (type === "hop") {
    return <MonsterSwing seed={seed}>{children}</MonsterSwing>;
  }
  return (
    <DecoCycle type={type} seed={seed}>
      {children}
    </DecoCycle>
  );
}

// Test-cell monster: picks one fast/medium swing tempo per seed and stays.
function MonsterSwing({
  seed,
  children,
}: {
  seed: number;
  children: React.ReactNode;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const duration =
      SWING_DURATIONS[hashSeed(seed, 7919) % SWING_DURATIONS.length];
    const delay = hashSeed(seed, 1009) % duration;
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
    return () => {
      cancelAnimation(progress);
      progress.value = 0;
    };
  }, [seed]);

  const animatedStyle = useAnimatedStyle(() => {
    const tx = (progress.value - 0.5) * 28;
    const rot = (progress.value - 0.5) * 8;
    return { transform: [{ translateX: tx }, { rotate: `${rot}deg` }] };
  });

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

// Deco icon: cycles through STOP/SLOW/MED/FAST/MED/SLOW/STOP every 35s,
// starting at a deterministic random offset so the map is always a mix
// of stopped and moving cells at varied tempos.
function DecoCycle({
  type,
  seed,
  children,
}: {
  type: TieredAnim;
  seed: number;
  children: React.ReactNode;
}) {
  const progress = useSharedValue(0);

  const [phaseIdx, setPhaseIdx] = useState(() => {
    const offsetMs = hashSeed(seed, 12345) % FULL_CYCLE_MS;
    return Math.floor(offsetMs / PHASE_DURATION_MS);
  });

  // Drive phase progression. First tick aligns to the time remaining in
  // the initial (random-offset) phase; subsequent ticks fire every 5s.
  useEffect(() => {
    const offsetMs = hashSeed(seed, 12345) % FULL_CYCLE_MS;
    const timeIntoPhase = offsetMs % PHASE_DURATION_MS;
    const firstTickMs = PHASE_DURATION_MS - timeIntoPhase;

    let timeoutId: ReturnType<typeof setTimeout>;
    const advance = () => {
      setPhaseIdx((prev) => (prev + 1) % PHASE_PATTERN.length);
      timeoutId = setTimeout(advance, PHASE_DURATION_MS);
    };
    timeoutId = setTimeout(advance, firstTickMs);

    return () => clearTimeout(timeoutId);
  }, [seed]);

  // React to phase change: swap the animation tempo or ease back to rest.
  useEffect(() => {
    const tierIdx = PHASE_PATTERN[phaseIdx];
    const duration = DURATION_TIERS[tierIdx][type];
    cancelAnimation(progress);
    if (duration === 0) {
      progress.value = withTiming(0, {
        duration: 800,
        easing: Easing.inOut(Easing.sin),
      });
    } else {
      progress.value = withRepeat(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    }
    return () => {
      cancelAnimation(progress);
    };
  }, [phaseIdx, type]);

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
