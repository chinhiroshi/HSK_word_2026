import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import VideosScreen from "@/screens/VideosScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type VideosStackParamList = {
  Videos: undefined;
};

const Stack = createNativeStackNavigator<VideosStackParamList>();

export default function VideosStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Videos"
        component={VideosScreen}
        options={{
          headerTitle: "動画",
        }}
      />
    </Stack.Navigator>
  );
}
