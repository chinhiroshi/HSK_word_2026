import * as Speech from "expo-speech";

export async function speakChinese(text: string): Promise<void> {
  const isSpeaking = await Speech.isSpeakingAsync();
  if (isSpeaking) {
    await Speech.stop();
  }

  return new Promise((resolve) => {
    Speech.speak(text, {
      language: "zh-CN",
      rate: 0.8,
      pitch: 1.0,
      onDone: () => resolve(),
      onError: () => resolve(),
    });
  });
}

export async function stopSpeaking(): Promise<void> {
  await Speech.stop();
}
