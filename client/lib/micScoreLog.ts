import AsyncStorage from "@react-native-async-storage/async-storage";

import type { HskLevel } from "@/types";

const STORAGE_KEY_WORD = "@chinese_master_mic_word_v1";
const STORAGE_KEY_SPRINT = "@chinese_master_mic_sprint_cell_v1";

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

let wordCache: WordStore = {};
let sprintCache: SprintStore = {};
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
      const [wRaw, sRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_WORD),
        AsyncStorage.getItem(STORAGE_KEY_SPRINT),
      ]);
      if (wRaw) {
        const parsed = JSON.parse(wRaw);
        if (parsed && typeof parsed === "object") {
          // Merge so any increments that happened during load are preserved.
          for (const [k, v] of Object.entries(parsed as WordStore)) {
            if (!wordCache[k]) wordCache[k] = v;
          }
        }
      }
      if (sRaw) {
        const parsed = JSON.parse(sRaw);
        if (parsed && typeof parsed === "object") {
          for (const [k, v] of Object.entries(parsed as SprintStore)) {
            if (!sprintCache[k]) sprintCache[k] = v;
          }
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

interface RecordOpts {
  score: number;
  wordId?: string;
  hskLevel?: HskLevel;
  source: MicSource;
  sprintCellIndex?: number;
}

export function recordMicAttempt(opts: RecordOpts): void {
  const { score, wordId, hskLevel, sprintCellIndex } = opts;
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

  notify();
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
