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

export type SprintIconAnim =
  | "wobble"
  | "float"
  | "drift"
  | "pulse"
  | "twinkle"
  | "hop";
type TieredAnim = Exclude<SprintIconAnim, "hop">;

interface Props {
  type: SprintIconAnim;
  seed?: number;
  children: React.ReactNode;
}

// Tempo tiers indexed 0..3: stop / slow / medium / fast.
const DURATION_TIERS: Record<TieredAnim, number>[] = [
  { wobble: 0, float: 0, drift: 0, pulse: 0, twinkle: 0 },
  { wobble: 880, float: 1470, drift: 2800, pulse: 980, twinkle: 1180 },
  { wobble: 540, float: 880, drift: 1700, pulse: 630, twinkle: 740 },
  { wobble: 250, float: 410, drift: 950, pulse: 320, twinkle: 360 },
];

// Each deco icon breathes through this pattern. The bookend STOPs concatenate
// across loops, giving a ~6s rest period between active windows.
const PHASE_PATTERN = [0, 1, 2, 3, 2, 1, 0]; // STOP→SLOW→MED→FAST→MED→SLOW→STOP
// Per-position duration. FAST is held 4x longer than the other phases so the
// peak energy moment lingers, while STOP/SLOW/MED stay snappy.
const PHASE_DURATIONS_MS = [3000, 3000, 3000, 12000, 3000, 3000, 3000];
const FULL_CYCLE_MS = PHASE_DURATIONS_MS.reduce((a, b) => a + b, 0);

function phaseAtOffset(offsetMs: number): { idx: number; remainingMs: number } {
  let acc = 0;
  for (let i = 0; i < PHASE_DURATIONS_MS.length; i++) {
    const next = acc + PHASE_DURATIONS_MS[i];
    if (offsetMs < next) {
      return { idx: i, remainingMs: next - offsetMs };
    }
    acc = next;
  }
  return { idx: 0, remainingMs: PHASE_DURATIONS_MS[0] };
}

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

  const [phaseIdx, setPhaseIdx] = useState(
    () => phaseAtOffset(hashSeed(seed, 12345) % FULL_CYCLE_MS).idx,
  );

  // Drive phase progression. First tick aligns to the time remaining in
  // the initial (random-offset) phase; subsequent ticks fire after the
  // duration of whatever phase we just entered.
  useEffect(() => {
    const offsetMs = hashSeed(seed, 12345) % FULL_CYCLE_MS;
    const { remainingMs: firstTickMs } = phaseAtOffset(offsetMs);

    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleNext = (currentIdx: number) => {
      const nextIdx = (currentIdx + 1) % PHASE_PATTERN.length;
      timeoutId = setTimeout(() => {
        setPhaseIdx(nextIdx);
        scheduleNext(nextIdx);
      }, PHASE_DURATIONS_MS[nextIdx]);
    };

    const initialIdx = phaseAtOffset(offsetMs).idx;
    timeoutId = setTimeout(() => {
      const nextIdx = (initialIdx + 1) % PHASE_PATTERN.length;
      setPhaseIdx(nextIdx);
      scheduleNext(nextIdx);
    }, firstTickMs);

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
      case "drift": {
        // Clouds: gentle, wider horizontal drift than `float`.
        const tx = (p - 0.5) * 14;
        return { transform: [{ translateX: tx }] };
      }
      case "wobble": {
        // Wider sway plus a subtle scale pump — feels alive, like a plant
        // catching a gust of wind rather than gently nodding.
        const rot = (p - 0.5) * 26;
        const scale = 0.96 + p * 0.08;
        return { transform: [{ scale }, { rotate: `${rot}deg` }] };
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
