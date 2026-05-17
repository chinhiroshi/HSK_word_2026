import * as Speech from "expo-speech";
import { Platform } from "react-native";
import { setAudioModeAsync } from "expo-audio";
import {
  getSilentModeAudio,
  getChineseRegionPreference,
  getPronunciationRevealPreference,
  type ChineseRegion,
  type PronunciationReveal,
} from "./storage";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function applyAudioMode(): Promise<void> {
  if (Platform.OS !== "ios") return;
  try {
    const playsInSilent = await getSilentModeAudio();
    await setAudioModeAsync({
      playsInSilentMode: playsInSilent,
      interruptionMode: "mixWithOthers",
    });
  } catch (e) {
    console.warn("setAudioMode failed:", e);
  }
}

let availableVoices: Speech.Voice[] = [];

async function loadVoices(): Promise<void> {
  try {
    availableVoices = await Speech.getAvailableVoicesAsync();
  } catch (e) {
    console.warn("Failed to load voices:", e);
  }
}

loadVoices();

let cachedRegion: ChineseRegion = "CN";
let regionLoaded = false;

async function loadRegion(): Promise<void> {
  try {
    cachedRegion = await getChineseRegionPreference();
  } catch {
    cachedRegion = "CN";
  }
  regionLoaded = true;
}

loadRegion();

export function setChineseRegionCache(region: ChineseRegion): void {
  cachedRegion = region;
  regionLoaded = true;
}

export function getCurrentChineseRegion(): ChineseRegion {
  return cachedRegion;
}

let cachedReveal: PronunciationReveal = "after";
const revealListeners = new Set<(v: PronunciationReveal) => void>();

async function loadReveal(): Promise<void> {
  try {
    cachedReveal = await getPronunciationRevealPreference();
  } catch {
    cachedReveal = "after";
  }
  revealListeners.forEach((l) => l(cachedReveal));
}

loadReveal();

export function setPronunciationRevealCache(v: PronunciationReveal): void {
  cachedReveal = v;
  revealListeners.forEach((l) => l(v));
}

export function getCurrentPronunciationReveal(): PronunciationReveal {
  return cachedReveal;
}

export function subscribePronunciationReveal(
  listener: (v: PronunciationReveal) => void,
): () => void {
  revealListeners.add(listener);
  return () => {
    revealListeners.delete(listener);
  };
}

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export type SpeakOptions = {
  wordId?: string;
  rate?: number;
};

export function resolveChineseLanguage(opts?: { wordId?: string; text?: string }): "zh-CN" | "zh-TW" {
  if (cachedRegion === "TW") return "zh-TW";
  if (cachedRegion === "CN") return "zh-CN";
  // ALTERNATE: deterministic stable per-word mapping via djb2 hash parity.
  // Same wordId (and example sentence sharing that wordId) always resolves
  // to the same region across the entire app and across restarts.
  const key = opts?.wordId || opts?.text || "";
  return hashString(key) % 2 === 0 ? "zh-CN" : "zh-TW";
}

function findVoiceForLanguage(language: string): string | undefined {
  if (availableVoices.length === 0) return undefined;
  const exact = availableVoices.find(
    (v) => v.language === language || v.language === language.replace("-", "_")
  );
  if (exact) return exact.identifier;
  const prefix = language.split("-")[0];
  const partial = availableVoices.find((v) => v.language.startsWith(prefix));
  return partial?.identifier;
}

async function ensureReady(): Promise<void> {
  if (availableVoices.length === 0) await loadVoices();
  if (!regionLoaded) await loadRegion();
}

async function stopIfSpeaking(): Promise<void> {
  try {
    const isSpeaking = await Speech.isSpeakingAsync();
    if (isSpeaking) {
      await Speech.stop();
      await delay(200);
    }
  } catch (e) {
    console.warn("Speech stop check failed:", e);
  }
}

export async function speakChinese(text: string, options?: SpeakOptions): Promise<void> {
  await applyAudioMode();
  await stopIfSpeaking();
  await ensureReady();

  const language = resolveChineseLanguage({ wordId: options?.wordId, text });
  const voiceId = findVoiceForLanguage(language);

  return new Promise((resolve) => {
    try {
      const speechOptions: Speech.SpeechOptions = {
        language,
        rate: options?.rate ?? 0.8,
        pitch: 1.0,
        onDone: () => resolve(),
        onError: (error) => {
          console.warn("Speech error:", error);
          resolve();
        },
        onStopped: () => resolve(),
      };

      if (voiceId && Platform.OS !== "web") {
        speechOptions.voice = voiceId;
      }

      Speech.speak(text, speechOptions);
    } catch (e) {
      console.warn("Speech.speak threw:", e);
      resolve();
    }
  });
}

export async function speakWithLanguage(
  text: string,
  language: string,
  rate: number = 0.8,
  options?: SpeakOptions,
): Promise<void> {
  await applyAudioMode();
  await stopIfSpeaking();
  await ensureReady();

  let resolvedLanguage = language;
  if (language === "zh-CN" || language === "zh-TW" || language === "zh") {
    resolvedLanguage = resolveChineseLanguage({ wordId: options?.wordId, text });
  }

  const voiceId = findVoiceForLanguage(resolvedLanguage);

  return new Promise((resolve) => {
    try {
      const speechOptions: Speech.SpeechOptions = {
        language: resolvedLanguage,
        rate,
        pitch: 1.0,
        onDone: () => resolve(),
        onError: (error) => {
          console.warn("Speech error:", error);
          resolve();
        },
        onStopped: () => resolve(),
      };

      if (voiceId && Platform.OS !== "web") {
        speechOptions.voice = voiceId;
      }

      Speech.speak(text, speechOptions);
    } catch (e) {
      console.warn("Speech.speak threw:", e);
      resolve();
    }
  });
}

export async function stopSpeaking(): Promise<void> {
  try {
    await Speech.stop();
  } catch (e) {
    console.warn("Speech.stop error:", e);
  }
}
