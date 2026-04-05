import React from "react";
import {
  Modal,
  View,
  StyleSheet,
  Linking,
  Platform,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/constants/theme";

interface UpdateModalProps {
  visible: boolean;
  required: boolean;
  latestVersion: string;
  storeUrl: { ios: string; android: string };
  onDismiss: () => void;
}

export default function UpdateModal({
  visible,
  required,
  latestVersion,
  storeUrl,
  onDismiss,
}: UpdateModalProps) {
  const theme = useTheme();

  const handleUpdate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = Platform.OS === "ios" ? storeUrl.ios : storeUrl.android;
    try {
      await Linking.openURL(url);
    } catch {
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${theme.primary}18` }]}>
            <Feather name="arrow-up-circle" size={36} color={theme.primary} />
          </View>

          <ThemedText style={styles.title}>
            {required ? "アップデートが必要です" : "新しいバージョンが公開されました"}
          </ThemedText>

          <ThemedText style={[styles.version, { color: theme.textSecondary }]}>
            バージョン {latestVersion}
          </ThemedText>

          <ThemedText style={[styles.desc, { color: theme.textSecondary }]}>
            {required
              ? "このバージョンは利用できません。アップデートしてご利用ください。"
              : "最新版では新機能や改善が含まれています。ぜひアップデートしてください。"}
          </ThemedText>

          <Pressable
            style={[styles.updateBtn, { backgroundColor: theme.primary }]}
            onPress={handleUpdate}
          >
            <Feather name="download" size={16} color="#fff" />
            <ThemedText style={styles.updateBtnText}>
              アップデートする
            </ThemedText>
          </Pressable>

          {!required && (
            <Pressable style={styles.laterBtn} onPress={onDismiss}>
              <ThemedText style={[styles.laterText, { color: theme.textSecondary }]}>
                今はしない
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
    marginBottom: 6,
  },
  version: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    marginBottom: 12,
  },
  desc: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  updateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    justifyContent: "center",
    marginBottom: 8,
  },
  updateBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
  },
  laterBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  laterText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
  },
});
