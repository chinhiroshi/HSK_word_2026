import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import WordDetailScreen from "@/screens/WordDetailScreen";
import TestScreen from "@/screens/TestScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { TestType } from "@/types";

export type RootStackParamList = {
  Main: undefined;
  WordDetail: { wordId: string };
  Test: { testType: TestType };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WordDetail"
        component={WordDetailScreen}
        options={{
          presentation: "card",
          headerTitle: "",
        }}
      />
      <Stack.Screen
        name="Test"
        component={TestScreen}
        options={{
          presentation: "card",
          headerTitle: "テスト",
        }}
      />
    </Stack.Navigator>
  );
}
