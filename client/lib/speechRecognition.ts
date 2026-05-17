import { Platform } from "react-native";
import { resolveChineseLanguage } from "@/lib/speech";

export type RecognitionLang = "zh-CN" | "zh-TW";

export type StartRecognitionOptions = {
  lang: RecognitionLang;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: { code: string; message: string }) => void;
  onEnd?: () => void;
};

export type RecognitionHandle = {
  stop: () => Promise<void> | void;
};

export function resolveRecognitionLanguage(_opts?: { wordId?: string; text?: string }): RecognitionLang {
  return "zh-CN";
}

export type RecognitionUnavailableReason =
  | "module_missing"
  | "web_unsupported"
  | "permission_denied"
  | "unknown";

export class RecognitionUnavailableError extends Error {
  reason: RecognitionUnavailableReason;
  constructor(reason: RecognitionUnavailableReason, message: string) {
    super(message);
    this.reason = reason;
  }
}

async function loadNativeModule(): Promise<any | null> {
  try {
    const mod = require("expo-speech-recognition");
    return mod;
  } catch {
    return null;
  }
}

export async function isRecognitionAvailable(): Promise<boolean> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return false;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SR;
  }
  const mod = await loadNativeModule();
  if (!mod) return false;
  const ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  if (!ExpoSpeechRecognitionModule) return false;
  try {
    if (typeof ExpoSpeechRecognitionModule.isRecognitionAvailable === "function") {
      const available = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
      return !!available;
    }
    if (typeof ExpoSpeechRecognitionModule.start !== "function") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function requestRecognitionPermissions(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  if (Platform.OS === "web") {
    return { granted: true, canAskAgain: true };
  }
  const mod = await loadNativeModule();
  if (!mod) return { granted: false, canAskAgain: false };
  const ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  try {
    const res = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return {
      granted: !!res?.granted,
      canAskAgain: res?.canAskAgain !== false,
    };
  } catch {
    return { granted: false, canAskAgain: false };
  }
}

async function startNativeRecognition(opts: StartRecognitionOptions): Promise<RecognitionHandle> {
  const mod = await loadNativeModule();
  if (!mod) {
    throw new RecognitionUnavailableError(
      "module_missing",
      "expo-speech-recognition is not available in this build.",
    );
  }
  const ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  if (!ExpoSpeechRecognitionModule) {
    throw new RecognitionUnavailableError(
      "module_missing",
      "ExpoSpeechRecognitionModule is missing.",
    );
  }

  const listeners: Array<{ remove: () => void }> = [];

  const addListener = (event: string, handler: (...args: any[]) => void) => {
    if (typeof ExpoSpeechRecognitionModule.addListener === "function") {
      const sub = ExpoSpeechRecognitionModule.addListener(event, handler);
      if (sub && typeof sub.remove === "function") listeners.push(sub);
    } else if (typeof mod.addSpeechRecognitionListener === "function") {
      const sub = mod.addSpeechRecognitionListener(event, handler);
      if (sub && typeof sub.remove === "function") listeners.push(sub);
    }
  };

  addListener("result", (e: any) => {
    try {
      const results = e?.results;
      const transcript = Array.isArray(results) && results[0]?.transcript
        ? String(results[0].transcript)
        : "";
      const isFinal = !!e?.isFinal;
      if (transcript) opts.onResult(transcript, isFinal);
    } catch {}
  });

  addListener("error", (e: any) => {
    const code = e?.error || e?.code || "unknown";
    const message = e?.message || String(code);
    opts.onError({ code: String(code), message: String(message) });
  });

  addListener("end", () => {
    listeners.forEach((l) => {
      try { l.remove(); } catch {}
    });
    if (opts.onEnd) opts.onEnd();
  });

  try {
    ExpoSpeechRecognitionModule.start({
      lang: opts.lang,
      interimResults: true,
      maxAlternatives: 1,
      continuous: false,
      requiresOnDeviceRecognition: false,
      addsPunctuation: false,
      contextualStrings: [],
    });
  } catch (e: any) {
    listeners.forEach((l) => { try { l.remove(); } catch {} });
    throw new RecognitionUnavailableError("unknown", e?.message ?? "Failed to start recognition");
  }

  const removeAll = () => {
    while (listeners.length > 0) {
      const l = listeners.pop();
      try { l?.remove(); } catch {}
    }
  };

  let stopped = false;
  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      try { ExpoSpeechRecognitionModule.stop(); } catch {}
      // Do NOT remove listeners immediately — wait for the native `end` event
      // (which itself calls removeAll + onEnd). Fallback after 2s in case the
      // platform never emits `end` so the modal can still transition state.
      setTimeout(() => {
        if (listeners.length > 0) {
          removeAll();
          if (opts.onEnd) opts.onEnd();
        }
      }, 2000);
    },
  };
}

function startWebRecognition(opts: StartRecognitionOptions): RecognitionHandle {
  if (typeof window === "undefined") {
    throw new RecognitionUnavailableError("web_unsupported", "Window is not available.");
  }
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) {
    throw new RecognitionUnavailableError(
      "web_unsupported",
      "This browser does not support speech recognition.",
    );
  }
  const recognition = new SR();
  recognition.lang = opts.lang;
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    try {
      let transcript = "";
      let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        transcript += r[0]?.transcript ?? "";
        if (r.isFinal) isFinal = true;
      }
      if (transcript) opts.onResult(transcript, isFinal);
    } catch {}
  };
  recognition.onerror = (event: any) => {
    const code = event?.error || "unknown";
    opts.onError({ code: String(code), message: String(event?.message ?? code) });
  };
  recognition.onend = () => {
    if (opts.onEnd) opts.onEnd();
  };

  try {
    recognition.start();
  } catch (e: any) {
    throw new RecognitionUnavailableError("unknown", e?.message ?? "Failed to start recognition");
  }

  return {
    stop: () => {
      try { recognition.stop(); } catch {}
    },
  };
}

export async function startRecognition(opts: StartRecognitionOptions): Promise<RecognitionHandle> {
  if (Platform.OS === "web") {
    return startWebRecognition(opts);
  }
  return startNativeRecognition(opts);
}
