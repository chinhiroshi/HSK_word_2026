import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AudioLearningScreen from "@/screens/AudioLearningScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useI18n } from "@/contexts/LanguageContext";

export type AudioLearningStackParamList = {
  AudioLearning: undefined;
};

const Stack = createNativeStackNavigator<AudioLearningStackParamList>();

export default function AudioLearningStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useI18n();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="AudioLearning"
        component={AudioLearningScreen}
        options={{
          headerTitle: () => <HeaderTitle title={t("audio_learning_header")} />,
        }}
      />
    </Stack.Navigator>
  );
}
