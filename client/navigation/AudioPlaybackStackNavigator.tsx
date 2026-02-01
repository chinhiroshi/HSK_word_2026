import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AudioPlaybackScreen from "@/screens/AudioPlaybackScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";

export type AudioPlaybackStackParamList = {
  AudioPlayback: undefined;
};

const Stack = createNativeStackNavigator<AudioPlaybackStackParamList>();

export default function AudioPlaybackStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="AudioPlayback"
        component={AudioPlaybackScreen}
        options={{
          headerTitle: () => <HeaderTitle title="音声再生" />,
        }}
      />
    </Stack.Navigator>
  );
}
