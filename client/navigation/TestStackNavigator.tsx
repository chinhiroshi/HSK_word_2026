import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TestSelectScreen from "@/screens/TestSelectScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type TestStackParamList = {
  TestSelect: undefined;
};

const Stack = createNativeStackNavigator<TestStackParamList>();

export default function TestStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="TestSelect"
        component={TestSelectScreen}
        options={{
          headerTitle: "テスト",
        }}
      />
    </Stack.Navigator>
  );
}
