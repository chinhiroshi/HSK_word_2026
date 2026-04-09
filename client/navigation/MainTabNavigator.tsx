import React, { createContext, useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";

import StudyStackNavigator from "@/navigation/StudyStackNavigator";
import AudioLearningStackNavigator from "@/navigation/AudioLearningStackNavigator";
import AudioPlaybackStackNavigator from "@/navigation/AudioPlaybackStackNavigator";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import SprintStackNavigator from "@/navigation/SprintStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { Colors } from "@/constants/theme";
import { useUpdateCheck, UpdateInfo } from "@/hooks/useUpdateCheck";

export type MainTabParamList = {
  StudyTab: undefined;
  AudioLearningTab: undefined;
  AudioPlaybackTab: undefined;
  SprintTab: undefined;
  ProfileTab: undefined;
};

const UpdateContext = createContext<{ updateInfo: UpdateInfo; recheckUpdate: () => void }>({
  updateInfo: { available: false, latestVersion: null, storeUrl: null },
  recheckUpdate: () => {},
});

export function useAppUpdate() {
  return useContext(UpdateContext);
}

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const { updateInfo, recheckUpdate } = useUpdateCheck();

  return (
    <UpdateContext.Provider value={{ updateInfo, recheckUpdate }}>
      <Tab.Navigator
        initialRouteName="StudyTab"
        screenOptions={{
          tabBarActiveTintColor: Colors.light.primary,
          tabBarInactiveTintColor: theme.tabIconDefault,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: Platform.select({
              ios: "transparent",
              android: theme.backgroundRoot,
            }),
            borderTopWidth: 0,
            elevation: 0,
          },
          tabBarBackground: () =>
            Platform.OS === "ios" ? (
              <BlurView
                intensity={100}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            ) : null,
          headerShown: false,
          tabBarLabelStyle: {
            fontFamily: "Nunito_600SemiBold",
            fontSize: 11,
          },
        }}
      >
        <Tab.Screen
          name="StudyTab"
          component={StudyStackNavigator}
          options={{
            title: "文字学習",
            tabBarIcon: ({ color, size }) => (
              <Feather name="book-open" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="AudioLearningTab"
          component={AudioLearningStackNavigator}
          options={{
            title: "音声学習",
            tabBarIcon: ({ color, size }) => (
              <Feather name="headphones" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="AudioPlaybackTab"
          component={AudioPlaybackStackNavigator}
          options={{
            title: "音声再生",
            tabBarIcon: ({ color, size }) => (
              <Feather name="play-circle" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="SprintTab"
          component={SprintStackNavigator}
          options={{
            title: "スプリント",
            tabBarIcon: ({ color, size }) => (
              <Feather name="map" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileStackNavigator}
          options={{
            title: "プロフィール",
            tabBarIcon: ({ color, size }) => (
              <Feather name="user" size={size} color={color} />
            ),
            tabBarBadge: updateInfo.available ? "" : undefined,
            tabBarBadgeStyle: {
              backgroundColor: "#EF4444",
              minWidth: 10,
              height: 10,
              borderRadius: 5,
              fontSize: 1,
              lineHeight: 10,
            },
          }}
        />
      </Tab.Navigator>
    </UpdateContext.Provider>
  );
}
