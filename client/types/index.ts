export type HskLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface Word {
  id: string;
  hskLevel: HskLevel;
  word: string;
  pinyin: string;
  translation: string;
  exampleSentence: string;
  examplePinyin: string;
  exampleTranslation: string;
  exampleEnglish?: string;
  longExample?: string;
  longExampleTranslation?: string;
  isMemorized: boolean;
  unmemorizedCount: number;
  textMemorized: boolean;
  audioMemorized: boolean;
  textUnmemorizedCount: number;
  audioUnmemorizedCount: number;
  videoIds: string[];
}

export interface Video {
  id: string;
  wordId: string;
  thumbnailUrl: string;
  videoUrl: string;
  title: string;
}

export interface UserProgress {
  totalWords: number;
  memorizedCount: number;
  percentage: number;
}

export type TestType = "word" | "sentence";

export interface TestQuestion {
  word: Word;
  type: TestType;
  options: string[];
  correctAnswer: string;
}

export type SprintSessionType = "flag" | "study" | "test";

export interface SprintData {
  hasSetup: boolean;
  studyMinutes: number;
  wordsPerDay: number;
  reviewCount: number;
  currentPosition: number;
  studiedWordCount: number;
  lastStudyDate: string | null;
  streakCount: number;
  specialStamps: number[];
  setupDate: string | null;
  completedDates: Record<number, string>;
  cellPhaseProgress?: Record<number, { text: boolean; audio: boolean }>;
  totalCells?: number;
}
