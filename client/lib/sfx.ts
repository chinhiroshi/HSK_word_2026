import { Platform } from "react-native";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

import { getSilentModeAudio } from "./storage";

const passSource = require("../assets/sounds/pass.wav");
const failSource = require("../assets/sounds/fail.wav");

let passPlayer: AudioPlayer | null = null;
let failPlayer: AudioPlayer | null = null;

function getPassPlayer(): AudioPlayer | null {
  if (!passPlayer) {
    try {
      passPlayer = createAudioPlayer(passSource);
      passPlayer.volume = 0.7;
    } catch (e) {
      console.warn("sfx: failed to init pass player:", e);
      return null;
    }
  }
  return passPlayer;
}

function getFailPlayer(): AudioPlayer | null {
  if (!failPlayer) {
    try {
      failPlayer = createAudioPlayer(failSource);
      failPlayer.volume = 0.7;
    } catch (e) {
      console.warn("sfx: failed to init fail player:", e);
      return null;
    }
  }
  return failPlayer;
}

async function applySilentModePreference(): Promise<void> {
  if (Platform.OS !== "ios") return;
  const playsInSilent = await getSilentModeAudio();
  await setAudioModeAsync({
    playsInSilentMode: playsInSilent,
    interruptionMode: "mixWithOthers",
  });
}

async function playSfx(player: AudioPlayer | null): Promise<void> {
  if (!player) return;
  try {
    await applySilentModePreference();
    player.seekTo(0);
    player.play();
  } catch (e) {
    console.warn("sfx playback failed:", e);
  }
}

export function playPassSfx(): void {
  void playSfx(getPassPlayer());
}

export function playFailSfx(): void {
  void playSfx(getFailPlayer());
}
