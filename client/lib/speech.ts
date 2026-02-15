import * as Speech from "expo-speech";
import { Platform } from "react-native";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

      Speech.speak(text, options);
    } catch (e) {
      console.warn("Speech.speak threw:", e);
      resolve();
    }
  });
}

export async function speakWithLanguage(text: string, language: string, rate: number = 0.8): Promise<void> {
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
      Speech.speak(text, {
        language,
        rate,
        pitch: 1.0,
        onDone: () => resolve(),
        onError: (error) => {
          console.warn("Speech error:", error);
          resolve();
        },
        onStopped: () => resolve(),
      });
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
