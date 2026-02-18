import AsyncStorage from "@react-native-async-storage/async-storage";
import { Word, HskLevel } from "@/types";
import { mockWords } from "@/data/mockData";

const HSK_LEVEL_KEY = "@chinese_master_hsk_level";
const DATA_VERSION_PREFIX = "@chinese_master_data_version_hsk";
const WORDS_KEY_PREFIX = "@chinese_master_words_hsk";
const CURRENT_DATA_VERSION = "9";

const OLD_WORDS_KEY = "@chinese_master_words";
const OLD_DATA_VERSION_KEY = "@chinese_master_data_version";

function getWordsKey(level: HskLevel): string {
  return `${WORDS_KEY_PREFIX}${level}`;
}

function getVersionKey(level: HskLevel): string {
  return `${DATA_VERSION_PREFIX}${level}`;
}

export async function getSelectedHskLevel(): Promise<HskLevel> {
  try {
    const level = await AsyncStorage.getItem(HSK_LEVEL_KEY);
    if (level) {
      const parsed = parseInt(level, 10) as HskLevel;
      if (parsed >= 1 && parsed <= 6) return parsed;
    }
  } catch {}
  return 4;
}

export async function setSelectedHskLevel(level: HskLevel): Promise<void> {
  await AsyncStorage.setItem(HSK_LEVEL_KEY, String(level));
  await initializeData(level);
}

export async function initializeData(level?: HskLevel): Promise<void> {
  const currentLevel = level ?? await getSelectedHskLevel();

  await migrateOldData(currentLevel);

  const versionKey = getVersionKey(currentLevel);
  const dataVersion = await AsyncStorage.getItem(versionKey);
  if (dataVersion !== CURRENT_DATA_VERSION) {
    const levelWords = mockWords.filter(w => w.hskLevel === currentLevel);

    const existingData = await AsyncStorage.getItem(getWordsKey(currentLevel));
    let existingMap: Record<string, Word> = {};
    if (existingData) {
      try {
        const parsed: Word[] = JSON.parse(existingData);
        parsed.forEach(w => { existingMap[w.id] = w; });
      } catch {}
    }

    const initializedWords = levelWords.map(w => {
      const existing = existingMap[w.id];
      if (existing) {
        return {
          ...w,
          exampleEnglish: w.exampleEnglish ?? '',
          textMemorized: existing.textMemorized ?? false,
          audioMemorized: existing.audioMemorized ?? false,
          textUnmemorizedCount: existing.textUnmemorizedCount ?? 0,
          audioUnmemorizedCount: existing.audioUnmemorizedCount ?? 0,
          isMemorized: existing.isMemorized ?? false,
          unmemorizedCount: existing.unmemorizedCount ?? 0,
        };
      }
      return {
        ...w,
        exampleEnglish: w.exampleEnglish ?? '',
        textMemorized: false,
        audioMemorized: false,
        textUnmemorizedCount: 0,
        audioUnmemorizedCount: 0,
      };
    });

    await AsyncStorage.setItem(getWordsKey(currentLevel), JSON.stringify(initializedWords));
    await AsyncStorage.setItem(versionKey, CURRENT_DATA_VERSION);
  }
}

async function migrateOldData(currentLevel: HskLevel): Promise<void> {
  try {
    const oldVersion = await AsyncStorage.getItem(OLD_DATA_VERSION_KEY);
    if (!oldVersion) return;

    const oldData = await AsyncStorage.getItem(OLD_WORDS_KEY);
    if (oldData) {
      const existingLevelData = await AsyncStorage.getItem(getWordsKey(currentLevel));
      if (!existingLevelData) {
        await AsyncStorage.setItem(getWordsKey(currentLevel), oldData);
      }
    }

    await AsyncStorage.removeItem(OLD_WORDS_KEY);
    await AsyncStorage.removeItem(OLD_DATA_VERSION_KEY);
  } catch {}
}

export async function getWords(): Promise<Word[]> {
  try {
    const level = await getSelectedHskLevel();
    const data = await AsyncStorage.getItem(getWordsKey(level));
    if (data) {
      return JSON.parse(data);
    }
    return mockWords.filter(w => w.hskLevel === level);
  } catch {
    const level = await getSelectedHskLevel();
    return mockWords.filter(w => w.hskLevel === level);
  }
}

export async function getWord(id: string): Promise<Word | undefined> {
  const words = await getWords();
  return words.find((w) => w.id === id);
}

async function saveWords(words: Word[]): Promise<void> {
  const level = await getSelectedHskLevel();
  await AsyncStorage.setItem(getWordsKey(level), JSON.stringify(words));
}

export async function updateWord(updatedWord: Word): Promise<void> {
  const words = await getWords();
  const index = words.findIndex((w) => w.id === updatedWord.id);
  if (index !== -1) {
    words[index] = updatedWord;
    await saveWords(words);
  }
}

export async function toggleMemorized(wordId: string): Promise<Word | undefined> {
  const words = await getWords();
  const index = words.findIndex((w) => w.id === wordId);
  if (index !== -1) {
    words[index].isMemorized = !words[index].isMemorized;
    if (words[index].isMemorized) {
      words[index].unmemorizedCount = 0;
    }
    await saveWords(words);
    return words[index];
  }
  return undefined;
}

export type MemorizationType = "text" | "audio";

export async function markAsUnmemorized(wordId: string, type: MemorizationType = "text"): Promise<Word | undefined> {
  const words = await getWords();
  const index = words.findIndex((w) => w.id === wordId);
  if (index !== -1) {
    if (type === "text") {
      words[index].textUnmemorizedCount = (words[index].textUnmemorizedCount || 0) + 1;
      words[index].textMemorized = false;
    } else {
      words[index].audioUnmemorizedCount = (words[index].audioUnmemorizedCount || 0) + 1;
      words[index].audioMemorized = false;
    }
    words[index].unmemorizedCount = (words[index].unmemorizedCount || 0) + 1;
    words[index].isMemorized = false;
    await saveWords(words);
    return words[index];
  }
  return undefined;
}

export async function clearUnmemorizedMark(wordId: string, type: MemorizationType = "text"): Promise<Word | undefined> {
  const words = await getWords();
  const index = words.findIndex((w) => w.id === wordId);
  if (index !== -1) {
    if (type === "text") {
      words[index].textUnmemorizedCount = 0;
      words[index].textMemorized = true;
    } else {
      words[index].audioUnmemorizedCount = 0;
      words[index].audioMemorized = true;
    }
    words[index].unmemorizedCount = 0;
    words[index].isMemorized = true;
    await saveWords(words);
    return words[index];
  }
  return undefined;
}

export async function markAsMemorized(wordId: string, type: MemorizationType = "text"): Promise<Word | undefined> {
  const words = await getWords();
  const index = words.findIndex((w) => w.id === wordId);
  if (index !== -1) {
    if (type === "text") {
      words[index].textMemorized = true;
      words[index].textUnmemorizedCount = 0;
    } else {
      words[index].audioMemorized = true;
      words[index].audioUnmemorizedCount = 0;
    }
    words[index].isMemorized = true;
    words[index].unmemorizedCount = 0;
    await saveWords(words);
    return words[index];
  }
  return undefined;
}

export async function resetProgress(): Promise<void> {
  const words = await getWords();
  const resetWords = words.map((w) => ({ 
    ...w, 
    isMemorized: false, 
    unmemorizedCount: 0,
    textMemorized: false,
    audioMemorized: false,
    textUnmemorizedCount: 0,
    audioUnmemorizedCount: 0,
  }));
  await saveWords(resetWords);
}
