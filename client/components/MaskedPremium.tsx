import React from "react";
import { StyleSheet, View, Pressable, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface MaskedPremiumProps {
  isLocked: boolean;
  children: React.ReactNode;
  intensity?: number;
  showLabel?: boolean;
  onLockedPress?: () => void;
}

export function MaskedPremium({
  isLocked,
  children,
  intensity = 14,
  showLabel = false,
  onLockedPress,
}: MaskedPremiumProps) {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (!isLocked) return <>{children}</>;

  const handlePress = (e: any) => {
    e?.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onLockedPress) {
      onLockedPress();
    } else {
      navigation.navigate("Paywall");
    }
  };

  return (
    <View style={styles.container}>
      <View pointerEvents="none">{children}</View>
      <Pressable
        onPress={handlePress}
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel="プレミアム限定。タップしてアップグレード"
        testID="masked-premium-overlay"
      >
        {Platform.OS === "web" ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? "rgba(17, 24, 39, 0.78)"
                  : "rgba(250, 250, 249, 0.82)",
              },
            ]}
          />
        ) : (
          <BlurView
            intensity={intensity}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={styles.overlay}>
          <View
            style={[
              styles.lockBadge,
              { backgroundColor: `${Colors.light.primary}E6` },
            ]}
          >
            <Feather name="lock" size={11} color="#FFFFFF" />
            {showLabel ? (
              <ThemedText style={styles.lockLabel} lightColor="#FFFFFF" darkColor="#FFFFFF">
                プレミアム
              </ThemedText>
            ) : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  lockLabel: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
});
