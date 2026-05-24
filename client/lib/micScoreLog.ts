import AsyncStorage from "@react-native-async-storage/async-storage";

import type { HskLevel } from "@/types";

const STORAGE_KEY_WORD = "@chinese_master_mic_word_v1";
const STORAGE_KEY_SPRINT = "@chinese_master_mic_sprint_cell_v1";
const STORAGE_KEY_ATTEMPTS = "@chinese_master_mic_attempts_v1";
const MAX_ATTEMPTS_RETAINED = 500;

export type MicSource =
  | "study"
  | "audio"
  | "word-detail"
  | "audio-list"
  | "sprint-study"
  | "sprint-audio";

interface CountSum {
  count: number;
  sumScore: number;
}

export interface MicStats {
  count: number;
  avg: number;
}

type WordStore = Record<string, CountSum>;
type SprintStore = Record<string, CountSum>;

export interface MicAttempt {
  ts: number;
  score: number;
  source: MicSource;
  wordId?: string;
  hskLevel?: HskLevel;
  sprintCellIndex?: number;
}

let wordCache: WordStore = {};
let sprintCache: SprintStore = {};
let attemptsCache: MicAttempt[] = [];
let loadedPromise: Promise<void> | null = null;
let writeChain: Promise<void> = Promise.resolve();

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {}
  });
}

export function subscribeMicStats(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export async function loadMicScoreLog(): Promise<void> {
  if (loadedPromise) return loadedPromise;
  loadedPromise = (async () => {
    try {
      const [wRaw, sRaw, aRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_WORD),
        AsyncStorage.getItem(STORAGE_KEY_SPRINT),
        AsyncStorage.getItem(STORAGE_KEY_ATTEMPTS),
      ]);
      if (wRaw) {
        const parsed = JSON.parse(wRaw);
        if (parsed && typeof parsed === "object") {
          // Sum persisted with any in-flight increments that happened during load.
          for (const [k, v] of Object.entries(parsed as WordStore)) {
            const cur = wordCache[k];
            wordCache[k] = cur
              ? { count: cur.count + v.count, sumScore: cur.sumScore + v.sumScore }
              : v;
          }
        }
      }
      if (sRaw) {
        const parsed = JSON.parse(sRaw);
        if (parsed && typeof parsed === "object") {
          for (const [k, v] of Object.entries(parsed as SprintStore)) {
            const cur = sprintCache[k];
            sprintCache[k] = cur
              ? { count: cur.count + v.count, sumScore: cur.sumScore + v.sumScore }
              : v;
          }
        }
      }
      if (aRaw) {
        const parsed = JSON.parse(aRaw);
        if (Array.isArray(parsed)) {
          // Prepend persisted history before any in-flight attempts.
          attemptsCache = [...(parsed as MicAttempt[]), ...attemptsCache].slice(
            -MAX_ATTEMPTS_RETAINED,
          );
        }
      }
    } catch {}
    notify();
  })();
  return loadedPromise;
}

function sprintKey(hsk: HskLevel, cellIndex: number): string {
  return `${hsk}-${cellIndex}`;
}

function persistWord() {
  writeChain = writeChain.then(() =>
    AsyncStorage.setItem(STORAGE_KEY_WORD, JSON.stringify(wordCache)).catch(() => {}),
  );
}
function persistSprint() {
  writeChain = writeChain.then(() =>
    AsyncStorage.setItem(STORAGE_KEY_SPRINT, JSON.stringify(sprintCache)).catch(() => {}),
  );
}
function persistAttempts() {
  writeChain = writeChain.then(() =>
    AsyncStorage.setItem(STORAGE_KEY_ATTEMPTS, JSON.stringify(attemptsCache)).catch(() => {}),
  );
}

interface RecordOpts {
  score: number;
  wordId?: string;
  hskLevel?: HskLevel;
  source: MicSource;
  sprintCellIndex?: number;
}

export function recordMicAttempt(opts: RecordOpts): void {
  const { score, wordId, hskLevel, sprintCellIndex, source } = opts;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  if (wordId) {
    const prev = wordCache[wordId] ?? { count: 0, sumScore: 0 };
    wordCache[wordId] = { count: prev.count + 1, sumScore: prev.sumScore + clamped };
    persistWord();
  }

  if (typeof sprintCellIndex === "number" && hskLevel) {
    const key = sprintKey(hskLevel, sprintCellIndex);
    const prev = sprintCache[key] ?? { count: 0, sumScore: 0 };
    sprintCache[key] = { count: prev.count + 1, sumScore: prev.sumScore + clamped };
    persistSprint();
  }

  attemptsCache.push({
    ts: Date.now(),
    score: clamped,
    source,
    wordId,
    hskLevel,
    sprintCellIndex,
  });
  if (attemptsCache.length > MAX_ATTEMPTS_RETAINED) {
    attemptsCache = attemptsCache.slice(-MAX_ATTEMPTS_RETAINED);
  }
  persistAttempts();

  notify();
}

export function getMicAttempts(): MicAttempt[] {
  return attemptsCache.slice();
}

export function getMicStatsForWordIds(wordIds: string[]): MicStats {
  let count = 0;
  let sum = 0;
  for (const id of wordIds) {
    const entry = wordCache[id];
    if (!entry) continue;
    count += entry.count;
    sum += entry.sumScore;
  }
  return { count, avg: count > 0 ? Math.round(sum / count) : 0 };
}

export function getSprintCellMicStats(hsk: HskLevel, cellIndex: number): MicStats {
  const entry = sprintCache[sprintKey(hsk, cellIndex)];
  if (!entry || entry.count === 0) return { count: 0, avg: 0 };
  return { count: entry.count, avg: Math.round(entry.sumScore / entry.count) };
}
