export interface Word {
  id: string;
  word: string;
  translation: string;
  pronunciation?: string;
  isMemorized: boolean;
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
