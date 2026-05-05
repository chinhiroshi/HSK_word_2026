import * as Speech from "expo-speech";
import { Platform } from "react-native";
import { setAudioModeAsync } from "expo-audio";
import { getSilentModeAudio } from "./storage";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Cached silent-mode preference so every speak() call doesn't hit AsyncStorage.
let cachedSilentMode: boolean | null = null;

async function refreshSilentMode(): Promise<boolean> {
  try {
    cachedSilentMode = await getSilentModeAudio();
  } catch (e) {
    console.warn("getSilentModeAudio failed:", e);
    cachedSilentMode = false;
  }
  return cachedSilentMode;
}

export function invalidateSilentModeCache(): void {
  cachedSilentMode = null;
}

async function applyAudioMode(): Promise<boolean> {
  // Always refresh from storage so the toggle takes effect immediately.
  const playsInSilent = await refreshSilentMode();
  if (Platform.OS !== "ios") return playsInSilent;
  try {
    // Configure the shared audio session category. This affects expo-audio
    // players and any speech that uses the application's audio session.
    await setAudioModeAsync({ playsInSilentMode: playsInSilent });
  } catch (e) {
    console.warn("setAudioMode failed:", e);
  }
  return playsInSilent;
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

function findChineseVoice(): string | undefined {
  if (availableVoices.length === 0) return undefined;
  const zhVoice = availableVoices.find(
    (v) => v.language === "zh-CN" || v.language === "zh_CN" || v.language.startsWith("zh")
  );
  return zhVoice?.identifier;
}

export async function speakChinese(text: string): Promise<void> {
  const playsInSilent = await applyAudioMode();
  try {
    const isSpeaking = await Speech.isSpeakingAsync();
    if (isSpeaking) {
      await Speech.stop();
      await delay(200);
    }
  } catch (e) {
    console.warn("Speech stop check failed:", e);
  }

  if (availableVoices.length === 0) {
    await loadVoices();
  }

  const voiceId = findChineseVoice();

  return new Promise((resolve) => {
    try {
      const options: Speech.SpeechOptions = {
        language: "zh-CN",
        rate: 0.8,
        pitch: 1.0,
        onDone: () => resolve(),
        onError: (error) => {
          console.warn("Speech error:", error);
          resolve();
        },
        onStopped: () => resolve(),
      };

      if (voiceId && Platform.OS !== "web") {
        options.voice = voiceId;
      }

      // iOS only: when the user enabled "play in silent mode", make
      // AVSpeechSynthesizer use its OWN audio session (.playback by default)
      // so the hardware silent switch does not mute the speech.
      if (Platform.OS === "ios" && playsInSilent) {
        options.useApplicationAudioSession = false;
      }

      Speech.speak(text, options);
    } catch (e) {
      console.warn("Speech.speak threw:", e);
      resolve();
    }
  });
}

export async function speakWithLanguage(text: string, language: string, rate: number = 0.8): Promise<void> {
  const playsInSilent = await applyAudioMode();
  try {
    const isSpeaking = await Speech.isSpeakingAsync();
    if (isSpeaking) {
      await Speech.stop();
      await delay(200);
    }
  } catch (e) {
    console.warn("Speech stop check failed:", e);
  }

  return new Promise((resolve) => {
    try {
      const options: Speech.SpeechOptions = {
        language,
        rate,
        pitch: 1.0,
        onDone: () => resolve(),
        onError: (error) => {
          console.warn("Speech error:", error);
          resolve();
        },
        onStopped: () => resolve(),
      };
      if (Platform.OS === "ios" && playsInSilent) {
        options.useApplicationAudioSession = false;
      }
      Speech.speak(text, options);
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
