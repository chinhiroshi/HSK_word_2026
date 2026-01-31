import AsyncStorage from "@react-native-async-storage/async-storage";
import { Word } from "@/types";
import { mockWords } from "@/data/mockData";

const WORDS_KEY = "@chinese_master_words";
const DATA_VERSION_KEY = "@chinese_master_data_version";
const CURRENT_DATA_VERSION = "2";

export async function initializeData(): Promise<void> {
  const dataVersion = await AsyncStorage.getItem(DATA_VERSION_KEY);
  if (dataVersion !== CURRENT_DATA_VERSION) {
    await AsyncStorage.setItem(WORDS_KEY, JSON.stringify(mockWords));
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
    await AsyncStorage.setItem(WORDS_KEY, JSON.stringify(words));
    return words[index];
  }
  return undefined;
}

export async function resetProgress(): Promise<void> {
  const words = await getWords();
  const resetWords = words.map((w) => ({ ...w, isMemorized: false }));
  await AsyncStorage.setItem(WORDS_KEY, JSON.stringify(resetWords));
}
