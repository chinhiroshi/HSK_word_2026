import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Language, TranslationKey, getTranslation } from "@/lib/i18n";

const LANGUAGE_KEY = "@chinese_master_language";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => Promise<void>;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "ja",
  setLang: async () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("ja");

  useEffect(() => {
    // Detect OS locale first — Japanese OS always uses Japanese
    let osIsJapanese = false;
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? "";
      osIsJapanese = locale.startsWith("ja") || locale.includes("-JP");
    } catch {}

    if (osIsJapanese) {
      setLangState("ja");
      return;
    }

    // Non-Japanese OS: respect saved preference, default to English
    AsyncStorage.getItem(LANGUAGE_KEY).then((val) => {
      if (val === "en" || val === "ja") {
        setLangState(val);
      } else {
        setLangState("en");
      }
    });
  }, []);

  const setLang = async (newLang: Language) => {
    setLangState(newLang);
    await AsyncStorage.setItem(LANGUAGE_KEY, newLang);
  };

  const t = (key: TranslationKey): string => getTranslation(lang, key);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  return useContext(LanguageContext);
}
