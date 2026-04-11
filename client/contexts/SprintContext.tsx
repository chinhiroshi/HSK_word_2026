import React, { createContext, useContext, useState, useCallback } from "react";
import { SprintData, SprintSessionType, Word, HskLevel } from "@/types";
import { getSprintData, saveSprintData, resetSprintData, getSelectedHskLevel } from "@/lib/storage";

const DEFAULT_TOTAL_CELLS = 29;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// V1 (original, no review cells): N study + 1 test per cycle
function getSessionTypeV1(position: number, wordsPerDay: number = 10): SprintSessionType {
  if (position <= 0) return "flag";
  const N = Math.max(1, Math.ceil(50 / Math.max(1, wordsPerDay)));
  const cycleLen = N + 1;
  const posInCycle = (position - 1) % cycleLen;
  return posInCycle < N ? "study" : "test";
}

// V2 (schemaVersion ≥ 2): macro-cycles of [ (N study + 1 test) × 4 ] + 1 review
//   N = ceil(50 / wordsPerDay)  →  each regular cycle covers 50 words
//   4 regular cycles = 200 words  →  then 1 review test
//   useReview=false falls back to V1 logic for backward compatibility
export function getSessionType(position: number, wordsPerDay: number = 10, useReview = true): SprintSessionType {
  if (!useReview) return getSessionTypeV1(position, wordsPerDay);
  if (position <= 0) return "flag";
  const N = Math.max(1, Math.ceil(50 / Math.max(1, wordsPerDay)));
  const regularCycleLen = N + 1;               // N study + 1 test
  const macroCycleLen = 4 * regularCycleLen + 1; // 4 regular cycles + 1 review

  const p = position - 1; // 0-indexed
  const posInMacro = p % macroCycleLen;

  if (posInMacro === macroCycleLen - 1) return "review";
  const posInCycle = posInMacro % regularCycleLen;
  return posInCycle < N ? "study" : "test";
}

function calcWordsPerDay(minutes: number): number {
  return Math.max(5, Math.floor(minutes * (2 / 3)));
}

// calcTotalCells (V2): insert a review cell only after each complete group of 4 regular cycles
// (i.e., only when studying ≥200 words). Remaining regular cycles at the end get no review.
function calcTotalCells(totalWords: number, wordsPerDay: number): number {
  const N = Math.max(1, Math.ceil(50 / Math.max(1, wordsPerDay)));
  const regularCycleLen = N + 1;
  const macroCycleLen = 4 * regularCycleLen + 1;
  const studySessionsNeeded = Math.ceil(totalWords / Math.max(1, wordsPerDay));
  const fullCycles = Math.max(1, Math.ceil(studySessionsNeeded / N));
  // Only complete groups of 4 cycles get a review cell — use floor (not ceil/max)
  const fullMacroCycles = Math.floor(fullCycles / 4);
  const remainingCycles = fullCycles % 4;
  return 1 + fullMacroCycles * macroCycleLen + remainingCycles * regularCycleLen;
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getSessionWords(words: Word[], studiedWordCount: number, count: number): Word[] {
  if (words.length === 0) return [];
  const result: Word[] = [];
  for (let i = 0; i < count; i++) {
    result.push(words[(studiedWordCount + i) % words.length]);
  }
  return result;
}

// Count how many STUDY cells come before `position` to derive that cell's word offset.
function getStudyWordOffsetForCell(position: number, wordsPerDay: number, useReview = true): number {
  let count = 0;
  for (let i = 1; i < position; i++) {
    if (getSessionType(i, wordsPerDay, useReview) === "study") count++;
  }
  return count;
}

function canSkipSession(
  words: Word[],
  sprintData: SprintData,
  sessionType: SprintSessionType
): boolean {
  if (sessionType === "flag") return false;
  if (sessionType === "review") return false;
  if (sessionType === "test") {
    const unmemorized = words.filter((w) => !w.audioMemorized);
    return unmemorized.length === 0;
  }
  const sessionWords = getSessionWords(words, sprintData.studiedWordCount, sprintData.wordsPerDay);
  const labeled = sessionWords.filter(
    (w) =>
      w.textMemorized ||
      (w.textUnmemorizedCount || 0) > 0 ||
      w.audioMemorized ||
      (w.audioUnmemorizedCount || 0) > 0
  );
  return labeled.length >= Math.ceil(sessionWords.length * 0.7);
}

interface SprintContextType {
  sprintData: SprintData | null;
  loading: boolean;
  currentLevel: number;
  loadSprint: () => Promise<void>;
  setupSprint: (wordsPerDay: number, totalWords?: number) => Promise<void>;
  completeSession: (isSpecial?: boolean) => Promise<void>;
  completePhase: (phase: "text" | "audio" | "audioCards" | "both", targetCell?: number) => Promise<boolean>;
  skipSession: () => Promise<void>;
  resetSprint: () => Promise<void>;
  getSessionType: (position: number) => SprintSessionType;
  canSkipCurrentSession: (words: Word[]) => boolean;
  getStudyWords: (words: Word[], cellIndex?: number) => Word[];
  getTestWords: (words: Word[]) => Word[];
  getReviewTestWords: (words: Word[]) => Word[];
  getTodayStudyWords: (words: Word[]) => Word[];
  getCellPhaseProgress: (position: number) => { text: boolean; audio: boolean; audioCards: boolean };
  totalCells: number;
}

const SprintContext = createContext<SprintContextType>({
  sprintData: null,
  loading: true,
  currentLevel: 1,
  loadSprint: async () => {},
  setupSprint: async () => {},
  completeSession: async () => {},
  completePhase: async (_p, _t) => false,
  skipSession: async () => {},
  resetSprint: async () => {},
  getSessionType: (pos) => getSessionType(pos, 10),
  canSkipCurrentSession: () => false,
  getStudyWords: () => [],
  getTestWords: () => [],
  getReviewTestWords: () => [],
  getTodayStudyWords: () => [],
  getCellPhaseProgress: () => ({ text: false, audio: false, audioCards: false }),
  totalCells: DEFAULT_TOTAL_CELLS,
});

export function useSprint() {
  return useContext(SprintContext);
}

export function SprintProvider({ children }: { children: React.ReactNode }) {
  const [sprintData, setSprintData] = useState<SprintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLevel, setCurrentLevel] = useState<HskLevel>(4);

  const loadSprint = useCallback(async () => {
    setLoading(true);
    const level = await getSelectedHskLevel();
    setCurrentLevel(level);
    const data = await getSprintData(level);
    setSprintData(data);
    setLoading(false);
  }, []);

  const setupSprint = useCallback(async (wordsPerDay: number, totalWords: number = 150) => {
    const totalCells = calcTotalCells(totalWords, wordsPerDay);
    const today = getTodayString();
    const newData: SprintData = {
      hasSetup: true,
      studyMinutes: Math.round(wordsPerDay * 1.5),
      wordsPerDay,
      reviewCount: 0,
      currentPosition: 1,
      studiedWordCount: 0,
      lastStudyDate: null,
      streakCount: 0,
      specialStamps: [],
      setupDate: today,
      completedDates: {},
      totalCells,
      schemaVersion: 2,
    };
    await saveSprintData(newData, currentLevel);
    setSprintData(newData);
  }, [currentLevel]);

  const completeSession = useCallback(
    async (isSpecial = false) => {
      if (!sprintData) return;

      const today = getTodayString();
      const yesterday = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })();

      let newStreak = sprintData.streakCount;
      if (sprintData.lastStudyDate === today) {
        // same day, no streak change
      } else if (sprintData.lastStudyDate === yesterday) {
        newStreak = sprintData.streakCount + 1;
      } else {
        newStreak = 1;
      }

      const useReview = (sprintData.schemaVersion ?? 1) >= 2;
      const sessionType = getSessionType(sprintData.currentPosition, sprintData.wordsPerDay, useReview);
      const isStudySession = sessionType === "study";
      const newStudiedWordCount = isStudySession
        ? sprintData.studiedWordCount + sprintData.wordsPerDay
        : sprintData.studiedWordCount;

      const dynTotal = sprintData.totalCells ?? DEFAULT_TOTAL_CELLS;
      const nextPosition = sprintData.currentPosition + 1;
      const newPosition = nextPosition >= dynTotal ? 1 : nextPosition;
      const isReviewSession = sessionType === "review";
      const newSpecialStamps = isSpecial
        ? [...sprintData.specialStamps, sprintData.currentPosition]
        : sprintData.specialStamps;
      const newReviewStamps = isSpecial && isReviewSession
        ? [...(sprintData.reviewStamps ?? []), sprintData.currentPosition]
        : (sprintData.reviewStamps ?? []);

      const newCompletedDates = {
        ...(sprintData.completedDates ?? {}),
        [sprintData.currentPosition]: today,
      };

      const updated: SprintData = {
        ...sprintData,
        currentPosition: newPosition,
        studiedWordCount: newStudiedWordCount,
        lastStudyDate: today,
        streakCount: newStreak,
        specialStamps: newSpecialStamps,
        reviewStamps: newReviewStamps,
        setupDate: sprintData.setupDate ?? today,
        completedDates: newCompletedDates,
      };
      await saveSprintData(updated, currentLevel);
      setSprintData(updated);
    },
    [sprintData, currentLevel]
  );

  const completePhase = useCallback(
    async (phase: "text" | "audio" | "audioCards" | "both", targetCell?: number): Promise<boolean> => {
      if (!sprintData) return false;

      const position = targetCell ?? sprintData.currentPosition;
      const phaseProgress = sprintData.cellPhaseProgress ?? {};
      const current = phaseProgress[position] ?? { text: false, audio: false, audioCards: false };

      const newText = phase === "text" || phase === "both" ? true : current.text;
      const newAudio = phase === "audio" || phase === "both" ? true : current.audio;
      const newAudioCards = phase === "audioCards" ? true : (current.audioCards ?? false);
      const bothDone = newText && newAudio && newAudioCards;

      const newPhaseProgress = {
        ...phaseProgress,
        [position]: { text: newText, audio: newAudio, audioCards: newAudioCards },
      };

      if (bothDone) {
        const today = getTodayString();
        const yesterday = (() => {
          const d = new Date();
          d.setDate(d.getDate() - 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        })();
        let newStreak = sprintData.streakCount;
        if (sprintData.lastStudyDate === today) {
          // same day, no change
        } else if (sprintData.lastStudyDate === yesterday) {
          newStreak = sprintData.streakCount + 1;
        } else {
          newStreak = 1;
        }

        const newCompletedDates = {
          ...(sprintData.completedDates ?? {}),
          [position]: today,
        };

        const isCurrentCell = position === sprintData.currentPosition;
        const useReview2 = (sprintData.schemaVersion ?? 1) >= 2;
        const sessionType = getSessionType(position, sprintData.wordsPerDay, useReview2);
        const newStudiedWordCount =
          isCurrentCell && sessionType === "study"
            ? sprintData.studiedWordCount + sprintData.wordsPerDay
            : sprintData.studiedWordCount;
        const dynTotal2 = sprintData.totalCells ?? DEFAULT_TOTAL_CELLS;
        const newCurrentPosition = isCurrentCell
          ? (sprintData.currentPosition + 1 >= dynTotal2 ? 1 : sprintData.currentPosition + 1)
          : sprintData.currentPosition;

        const updated: SprintData = {
          ...sprintData,
          currentPosition: newCurrentPosition,
          studiedWordCount: newStudiedWordCount,
          lastStudyDate: today,
          streakCount: newStreak,
          setupDate: sprintData.setupDate ?? today,
          completedDates: newCompletedDates,
          cellPhaseProgress: newPhaseProgress,
        };
        await saveSprintData(updated, currentLevel);
        setSprintData(updated);
        return true;
      } else {
        const updated: SprintData = {
          ...sprintData,
          cellPhaseProgress: newPhaseProgress,
        };
        await saveSprintData(updated, currentLevel);
        setSprintData(updated);
        return false;
      }
    },
    [sprintData, currentLevel]
  );

  const skipSession = useCallback(async () => {
    await completeSession(false);
  }, [completeSession]);

  const resetSprint = useCallback(async () => {
    await resetSprintData(currentLevel);
    setSprintData(null);
  }, [currentLevel]);

  const boundGetSessionType = useCallback(
    (position: number): SprintSessionType => {
      const useReview = (sprintData?.schemaVersion ?? 1) >= 2;
      return getSessionType(position, sprintData?.wordsPerDay ?? 10, useReview);
    },
    [sprintData]
  );

  const canSkipCurrentSession = useCallback(
    (words: Word[]) => {
      if (!sprintData) return false;
      const useReview = (sprintData.schemaVersion ?? 1) >= 2;
      const sessionType = getSessionType(sprintData.currentPosition, sprintData.wordsPerDay, useReview);
      return canSkipSession(words, sprintData, sessionType);
    },
    [sprintData]
  );

  const getStudyWords = useCallback(
    (words: Word[], cellIndex?: number) => {
      if (!sprintData) return [];
      if (cellIndex !== undefined) {
        const useReview = (sprintData.schemaVersion ?? 1) >= 2;
        const studyIndex = getStudyWordOffsetForCell(cellIndex, sprintData.wordsPerDay, useReview);
        const wordOffset = (studyIndex * sprintData.wordsPerDay) % Math.max(1, words.length);
        return getSessionWords(words, wordOffset, sprintData.wordsPerDay);
      }
      return getSessionWords(words, sprintData.studiedWordCount, sprintData.wordsPerDay);
    },
    [sprintData]
  );

  // レビューテストセル用: 直前200語のうち苦手語から最大50語をランダム選択
  const getReviewTestWords = useCallback(
    (words: Word[]): Word[] => {
      if (!sprintData || words.length === 0) return [];
      const total = words.length;
      const studied = sprintData.studiedWordCount;
      const batchSize = Math.min(200, studied);
      if (batchSize === 0) return [];

      // Get last batchSize studied words (oldest first)
      const batchWords: Word[] = [];
      for (let i = batchSize - 1; i >= 0; i--) {
        const idx = ((studied - 1 - i) % total + total) % total;
        batchWords.push(words[idx]);
      }

      // Filter for 苦手 words (has unmemorized counter or not memorized)
      const difficult = batchWords.filter(
        (w) =>
          (w.textUnmemorizedCount || 0) > 0 ||
          (w.audioUnmemorizedCount || 0) > 0 ||
          !w.textMemorized ||
          !w.audioMemorized
      );

      // Shuffle all difficult words; if ≥50 pick 50
      const shuffledDifficult = shuffleArray(difficult);
      if (shuffledDifficult.length >= 50) return shuffledDifficult.slice(0, 50);

      // Backfill from unlearned words (words outside the last 200 studied)
      const batchIdSet = new Set(batchWords.map((w) => w.id));
      const unlearned = shuffleArray(words.filter((w) => !batchIdSet.has(w.id)));
      const backfill = unlearned.slice(0, 50 - shuffledDifficult.length);
      return [...shuffledDifficult, ...backfill];
    },
    [sprintData]
  );

  // テストセルの直前50語を取得し、苦手単語を優先して返す
  const getTestWords = useCallback(
    (words: Word[]): Word[] => {
      if (!sprintData || words.length === 0) return [];
      const totalWords = words.length;
      const studied = sprintData.studiedWordCount;
      const count = Math.min(50, totalWords);
      // studiedWordCount は次の学習開始位置を指すため、直前 count 語 = [studied-count, studied) の範囲
      const recent: Word[] = [];
      for (let i = count - 1; i >= 0; i--) {
        const idx = ((studied - 1 - i) % totalWords + totalWords) % totalWords;
        recent.push(words[idx]);
      }
      if (recent.length === 0) return [];
      // テスト対象は全単語（苦手フィルタなし）
      return recent;
    },
    [sprintData]
  );

  const getTodayStudyWords = useCallback(
    (words: Word[]): Word[] => {
      if (!sprintData || words.length === 0) return [];
      const today = getTodayString();
      const completedDates = sprintData.completedDates ?? {};
      const wPD = sprintData.wordsPerDay;
      const seen = new Set<string>();
      const result: Word[] = [];

      const addCellWords = (pos: number) => {
        const studyIdx = getStudyWordOffsetForCell(pos, wPD, useReview);
        const wordOffset = (studyIdx * wPD) % Math.max(1, words.length);
        const cellWords = getSessionWords(words, wordOffset, wPD);
        for (const w of cellWords) {
          if (!seen.has(w.id)) {
            seen.add(w.id);
            result.push(w);
          }
        }
      };

      const useReview = (sprintData.schemaVersion ?? 1) >= 2;

      // All study cells completed today
      for (const posStr of Object.keys(completedDates)) {
        const pos = Number(posStr);
        if (completedDates[pos] === today && getSessionType(pos, wPD, useReview) === "study") {
          addCellWords(pos);
        }
      }

      // Current cell if it's a study cell and not yet completed today
      const currentPos = sprintData.currentPosition;
      if (
        getSessionType(currentPos, wPD, useReview) === "study" &&
        completedDates[currentPos] !== today
      ) {
        addCellWords(currentPos);
      }

      return result;
    },
    [sprintData]
  );

  const getCellPhaseProgress = useCallback(
    (position: number): { text: boolean; audio: boolean; audioCards: boolean } => {
      if (!sprintData) return { text: false, audio: false, audioCards: false };
      const p = (sprintData.cellPhaseProgress ?? {})[position];
      return p ? { text: p.text, audio: p.audio, audioCards: p.audioCards ?? false } : { text: false, audio: false, audioCards: false };
    },
    [sprintData]
  );

  return (
    <SprintContext.Provider
      value={{
        sprintData,
        loading,
        currentLevel,
        loadSprint,
        setupSprint,
        completeSession,
        completePhase,
        skipSession,
        resetSprint,
        getSessionType: boundGetSessionType,
        canSkipCurrentSession,
        getStudyWords,
        getTestWords,
        getReviewTestWords,
        getTodayStudyWords,
        getCellPhaseProgress,
        totalCells: sprintData?.totalCells ?? DEFAULT_TOTAL_CELLS,
      }}
    >
      {children}
    </SprintContext.Provider>
  );
}
