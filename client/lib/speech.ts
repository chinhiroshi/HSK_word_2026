import * as Speech from "expo-speech";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function speakChinese(text: string): Promise<void> {
  try {
    const isSpeaking = await Speech.isSpeakingAsync();
    if (isSpeaking) {
      await Speech.stop();
      await delay(150);
    }
  } catch (e) {
    console.warn("Speech stop check failed:", e);
  }

  return new Promise((resolve) => {
    try {
      Speech.speak(text, {
        language: "zh-CN",
        rate: 0.8,
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
