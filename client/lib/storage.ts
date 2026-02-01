import AsyncStorage from "@react-native-async-storage/async-storage";
import { Word } from "@/types";
import { mockWords } from "@/data/mockData";

const WORDS_KEY = "@chinese_master_words";
const DATA_VERSION_KEY = "@chinese_master_data_version";
const CURRENT_DATA_VERSION = "4";

export async function initializeData(): Promise<void> {
  const dataVersion = await AsyncStorage.getItem(DATA_VERSION_KEY);
  if (dataVersion !== CURRENT_DATA_VERSION) {
    const initializedWords = mockWords.map(w => ({
      ...w,
      textMemorized: w.textMemorized ?? false,
      audioMemorized: w.audioMemorized ?? false,
      textUnmemorizedCount: w.textUnmemorizedCount ?? 0,
      audioUnmemorizedCount: w.audioUnmemorizedCount ?? 0,
    }));
    await AsyncStorage.setItem(WORDS_KEY, JSON.stringify(initializedWords));
    await AsyncStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
  }
}

export async function getWords(): Promise<Word[]> {
  try {
    const data = await AsyncStorage.getItem(WORDS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return mockWords;
  } catch {
    return mockWords;
  }
}

export async function getWord(id: string): Promise<Word | undefined> {
  const words = await getWords();
  return words.find((w) => w.id === id);
}

export async function updateWord(updatedWord: Word): Promise<void> {
  const words = await getWords();
  const index = words.findIndex((w) => w.id === updatedWord.id);
  if (index !== -1) {
    words[index] = updatedWord;
    await AsyncStorage.setItem(WORDS_KEY, JSON.stringify(words));
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
    await AsyncStorage.setItem(WORDS_KEY, JSON.stringify(words));
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
    await AsyncStorage.setItem(WORDS_KEY, JSON.stringify(words));
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
    await AsyncStorage.setItem(WORDS_KEY, JSON.stringify(words));
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
    await AsyncStorage.setItem(WORDS_KEY, JSON.stringify(words));
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
  await AsyncStorage.setItem(WORDS_KEY, JSON.stringify(resetWords));
}
