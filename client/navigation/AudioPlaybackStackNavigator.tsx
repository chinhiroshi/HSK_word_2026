import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AudioPlaybackScreen from "@/screens/AudioPlaybackScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useI18n } from "@/contexts/LanguageContext";

export type AudioPlaybackStackParamList = {
  AudioPlayback: undefined;
};

const Stack = createNativeStackNavigator<AudioPlaybackStackParamList>();

export default function AudioPlaybackStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useI18n();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="AudioPlayback"
        component={AudioPlaybackScreen}
        options={{
          headerTitle: () => <HeaderTitle title={t("playback_header")} />,
        }}
      />
    </Stack.Navigator>
  );
}
