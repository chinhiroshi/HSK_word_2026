import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useI18n } from "@/contexts/LanguageContext";

import SprintScreen from "@/screens/SprintScreen";
import SprintSetupScreen from "@/screens/SprintSetupScreen";
import SprintStudySessionScreen from "@/screens/SprintStudySessionScreen";
import SprintTestScreen from "@/screens/SprintTestScreen";
import SprintAudioPlaybackScreen from "@/screens/SprintAudioPlaybackScreen";
import SprintStampGalleryScreen from "@/screens/SprintStampGalleryScreen";

export type SprintStackParamList = {
  SprintHome: undefined;
  SprintSetup: { isChange?: boolean } | undefined;
  SprintStudySession: { mode: "study" | "text-only" | "audio-only" | "audio-cards-only"; cellIndex: number };
  SprintTest: undefined;
  SprintAudioPlayback: { cellIndex: number };
  SprintStampGallery: undefined;
};

const Stack = createNativeStackNavigator<SprintStackParamList>();

export default function SprintStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useI18n();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="SprintHome"
        component={SprintScreen}
        options={{ headerTitle: t("sprint_header") }}
      />
      <Stack.Screen
        name="SprintSetup"
        component={SprintSetupScreen}
        options={{ headerTitle: t("sprint_setup_header") }}
      />
      <Stack.Screen
        name="SprintStudySession"
        component={SprintStudySessionScreen}
        options={({ route }) => ({
          headerTitle:
            route.params?.mode === "audio-only" ? t("audio_learning_header") :
            route.params?.mode === "text-only" ? t("tab_study") :
            route.params?.mode === "audio-cards-only" ? t("audio_cards") : t("session_type_study"),
        })}
      />
      <Stack.Screen
        name="SprintTest"
        component={SprintTestScreen}
        options={{ headerTitle: t("sprint_test_header") }}
      />
      <Stack.Screen
        name="SprintAudioPlayback"
        component={SprintAudioPlaybackScreen}
        options={{ headerTitle: t("sprint_audio_header") }}
      />
      <Stack.Screen
        name="SprintStampGallery"
        component={SprintStampGalleryScreen}
        options={{ headerTitle: t("stamp_gallery_header") }}
      />
    </Stack.Navigator>
  );
}
