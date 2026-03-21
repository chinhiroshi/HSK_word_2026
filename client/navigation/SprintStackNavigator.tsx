import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";

import SprintScreen from "@/screens/SprintScreen";
import SprintSetupScreen from "@/screens/SprintSetupScreen";
import SprintStudySessionScreen from "@/screens/SprintStudySessionScreen";
import SprintTestScreen from "@/screens/SprintTestScreen";

export type SprintStackParamList = {
  SprintHome: undefined;
  SprintSetup: undefined;
  SprintStudySession: { mode: "study" | "text-only" | "audio-only"; cellIndex: number };
  SprintTest: undefined;
};

const Stack = createNativeStackNavigator<SprintStackParamList>();

export default function SprintStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="SprintHome"
        component={SprintScreen}
        options={{ headerTitle: "スプリント" }}
      />
      <Stack.Screen
        name="SprintSetup"
        component={SprintSetupScreen}
        options={{ headerTitle: "スプリント設定" }}
      />
      <Stack.Screen
        name="SprintStudySession"
        component={SprintStudySessionScreen}
        options={({ route }) => ({
          headerTitle:
            route.params?.mode === "audio-only" ? "音声学習" :
            route.params?.mode === "text-only" ? "文字学習" : "学習セッション",
        })}
      />
      <Stack.Screen
        name="SprintTest"
        component={SprintTestScreen}
        options={{ headerTitle: "週次テスト" }}
      />
    </Stack.Navigator>
  );
}
