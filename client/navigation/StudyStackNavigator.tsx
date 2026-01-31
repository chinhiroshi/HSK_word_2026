import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import StudyScreen from "@/screens/StudyScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type StudyStackParamList = {
  Study: undefined;
};

const Stack = createNativeStackNavigator<StudyStackParamList>();

export default function StudyStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Study"
        component={StudyScreen}
        options={{
          headerTitle: () => <HeaderTitle title="中国語マスター" />,
        }}
      />
    </Stack.Navigator>
  );
}
