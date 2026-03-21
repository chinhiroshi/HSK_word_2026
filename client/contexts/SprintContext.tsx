import React, { createContext, useContext, useState, useCallback } from "react";
import { SprintData, SprintSessionType, Word } from "@/types";
import { getSprintData, saveSprintData, resetSprintData } from "@/lib/storage";

const DEFAULT_TOTAL_CELLS = 29;

// Fixed cell types — each position's session type is explicitly declared.
// Pattern per 7-cell cycle: study, study, review, study, study, review, test
const CELL_SESSION_TYPES: SprintSessionType[] = [
  "flag",                                                                    // 0
  "study", "study", "review", "study", "study", "review", "test",           // 1–7
  "study", "study", "review", "study", "study", "review", "test",           // 8–14
  "study", "study", "review", "study", "study", "review", "test",           // 15–21
  "study", "study", "review", "study", "study", "review", "test",           // 22–28
];

function getSessionType(position: number): SprintSessionType {
  if (position < 0 || position >= CELL_SESSION_TYPES.length) return "study";
  return CELL_SESSION_TYPES[position];
}

function calcWordsPerDay(minutes: number): number {
  return Math.max(5, Math.floor(minutes * (2 / 3)));
}

function calcReviewCount(wordsPerDay: number): number {
  return Math.max(3, Math.floor(wordsPerDay / 3));
}

function calcTotalCells(totalWords: number, wordsPerDay: number): number {
  const studySessionsNeeded = Math.ceil(totalWords / Math.max(1, wordsPerDay));
  const fullCycles = Math.max(1, Math.ceil(studySessionsNeeded / 4));
  return 1 + fullCycles * 7;
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
function getStudyWordOffsetForCell(position: number): number {
  let count = 0;
  for (let i = 1; i < position; i++) {
    if (CELL_SESSION_TYPES[i % CELL_SESSION_TYPES.length] === "study") count++;
  }
  return count;
}

function canSkipSession(
  words: Word[],
  sprintData: SprintData,
  sessionType: SprintSessionType
): boolean {
  if (sessionType === "flag") return false;
  if (sessionType === "review" || sessionType === "test") {
    const unmemorized = words.filter(
      (w) => (w.textUnmemorizedCount || 0) > 0 || (w.audioUnmemorizedCount || 0) > 0
    );
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
  loadSprint: () => Promise<void>;
  setupSprint: (minutes: number, totalWords?: number) => Promise<void>;
  completeSession: (isSpecial?: boolean) => Promise<void>;
  completePhase: (phase: "text" | "audio" | "both", targetCell?: number) => Promise<boolean>;
  skipSession: () => Promise<void>;
  resetSprint: () => Promise<void>;
  getSessionType: (position: number) => SprintSessionType;
  canSkipCurrentSession: (words: Word[]) => boolean;
  getStudyWords: (words: Word[], cellIndex?: number) => Word[];
  getReviewWords: (words: Word[]) => Word[];
  getCellPhaseProgress: (position: number) => { text: boolean; audio: boolean };
  totalCells: number;
}

const SprintContext = createContext<SprintContextType>({
  sprintData: null,
  loading: true,
  loadSprint: async () => {},
  setupSprint: async () => {},
  completeSession: async () => {},
  completePhase: async (_p, _t) => false,
  skipSession: async () => {},
  resetSprint: async () => {},
  getSessionType,
  canSkipCurrentSession: () => false,
  getStudyWords: () => [],
  getReviewWords: () => [],
  getCellPhaseProgress: () => ({ text: false, audio: false }),
  totalCells: DEFAULT_TOTAL_CELLS,
});

export function useSprint() {
  return useContext(SprintContext);
}

export function SprintProvider({ children }: { children: React.ReactNode }) {
  const [sprintData, setSprintData] = useState<SprintData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSprint = useCallback(async () => {
    setLoading(true);
    const data = await getSprintData();
    setSprintData(data);
    setLoading(false);
  }, []);

  const setupSprint = useCallback(async (minutes: number, totalWords: number = 150) => {
    const wordsPerDay = calcWordsPerDay(minutes);
    const reviewCount = calcReviewCount(wordsPerDay);
    const totalCells = calcTotalCells(totalWords, wordsPerDay);
    const today = getTodayString();
    const newData: SprintData = {
      hasSetup: true,
      studyMinutes: minutes,
      wordsPerDay,
      reviewCount,
      currentPosition: 1,
      studiedWordCount: 0,
      lastStudyDate: null,
      streakCount: 0,
      specialStamps: [],
      setupDate: today,
      completedDates: {},
      totalCells,
    };
    await saveSprintData(newData);
    setSprintData(newData);
  }, []);

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

      const sessionType = getSessionType(sprintData.currentPosition);
      const isStudySession = sessionType === "study";
      const newStudiedWordCount = isStudySession
        ? sprintData.studiedWordCount + sprintData.wordsPerDay
        : sprintData.studiedWordCount;

      const dynTotal = sprintData.totalCells ?? DEFAULT_TOTAL_CELLS;
      const nextPosition = sprintData.currentPosition + 1;
      const newPosition = nextPosition >= dynTotal ? 1 : nextPosition;
      const newSpecialStamps = isSpecial
        ? [...sprintData.specialStamps, sprintData.currentPosition]
        : sprintData.specialStamps;

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
        setupDate: sprintData.setupDate ?? today,
        completedDates: newCompletedDates,
      };
      await saveSprintData(updated);
      setSprintData(updated);
    },
    [sprintData]
  );

  const completePhase = useCallback(
    async (phase: "text" | "audio" | "both", targetCell?: number): Promise<boolean> => {
      if (!sprintData) return false;

      // Use the explicitly-provided cell index, or fall back to currentPosition.
      const position = targetCell ?? sprintData.currentPosition;
      const phaseProgress = sprintData.cellPhaseProgress ?? {};
      const current = phaseProgress[position] ?? { text: false, audio: false };

      const newText = phase === "text" || phase === "both" ? true : current.text;
      const newAudio = phase === "audio" || phase === "both" ? true : current.audio;
      const bothDone = newText && newAudio;

      const newPhaseProgress = {
        ...phaseProgress,
        [position]: { text: newText, audio: newAudio },
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

        // Only advance the sprint pointer when the user finishes the CURRENT cell.
        const isCurrentCell = position === sprintData.currentPosition;
        const sessionType = getSessionType(position);
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
        await saveSprintData(updated);
        setSprintData(updated);
        return true;
      } else {
        const updated: SprintData = {
          ...sprintData,
          cellPhaseProgress: newPhaseProgress,
        };
        await saveSprintData(updated);
        setSprintData(updated);
        return false;
      }
    },
    [sprintData]
  );

  const skipSession = useCallback(async () => {
    await completeSession(false);
  }, [completeSession]);

  const resetSprint = useCallback(async () => {
    await resetSprintData();
    setSprintData(null);
  }, []);

  const canSkipCurrentSession = useCallback(
    (words: Word[]) => {
      if (!sprintData) return false;
      const sessionType = getSessionType(sprintData.currentPosition);
      return canSkipSession(words, sprintData, sessionType);
    },
    [sprintData]
  );

  const getStudyWords = useCallback(
    (words: Word[], cellIndex?: number) => {
      if (!sprintData) return [];
      // If a specific cell is provided, derive its word offset from its position
      // in the study-cell sequence (independent of studiedWordCount).
      if (cellIndex !== undefined) {
        const studyIndex = getStudyWordOffsetForCell(cellIndex);
        const wordOffset = (studyIndex * sprintData.wordsPerDay) % Math.max(1, words.length);
        return getSessionWords(words, wordOffset, sprintData.wordsPerDay);
      }
      return getSessionWords(words, sprintData.studiedWordCount, sprintData.wordsPerDay);
    },
    [sprintData]
  );

  const getReviewWords = useCallback(
    (words: Word[]) => {
      if (!sprintData) return [];
      const unmemorized = words.filter(
        (w) => (w.textUnmemorizedCount || 0) > 0 || (w.audioUnmemorizedCount || 0) > 0
      );
      const shuffled = [...unmemorized].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, sprintData.reviewCount);
    },
    [sprintData]
  );

  const getCellPhaseProgress = useCallback(
    (position: number): { text: boolean; audio: boolean } => {
      if (!sprintData) return { text: false, audio: false };
      return (sprintData.cellPhaseProgress ?? {})[position] ?? { text: false, audio: false };
    },
    [sprintData]
  );

  return (
    <SprintContext.Provider
      value={{
        sprintData,
        loading,
        loadSprint,
        setupSprint,
        completeSession,
        completePhase,
        skipSession,
        resetSprint,
        getSessionType,
        canSkipCurrentSession,
        getStudyWords,
        getReviewWords,
        getCellPhaseProgress,
        totalCells: sprintData?.totalCells ?? DEFAULT_TOTAL_CELLS,
      }}
    >
      {children}
    </SprintContext.Provider>
  );
}
