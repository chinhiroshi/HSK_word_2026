export interface Word {
  id: string;
  word: string;
  pinyin: string;
  translation: string;
  exampleSentence: string;
  examplePinyin: string;
  exampleTranslation: string;
  exampleEnglish?: string;
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
