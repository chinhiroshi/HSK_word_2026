import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AudioLearningScreen from "@/screens/AudioLearningScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";

export type AudioLearningStackParamList = {
  AudioLearning: undefined;
};

const Stack = createNativeStackNavigator<AudioLearningStackParamList>();

export default function AudioLearningStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="AudioLearning"
        component={AudioLearningScreen}
        options={{
          headerTitle: () => <HeaderTitle title="音声学習" />,
        }}
      />
    </Stack.Navigator>
  );
}
