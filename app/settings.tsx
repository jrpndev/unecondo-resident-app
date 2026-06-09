import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  Switch, Alert, Linking, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Bell, BellOff } from "lucide-react-native";
import * as SecureStore from "expo-secure-store";
import { registerPushToken, clearPushToken, NOTIF_PREF_KEY } from "../lib/notifications";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [notifOn, setNotifOn] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const Notifications = require("expo-notifications");
        const [{ status }, pref] = await Promise.all([
          Notifications.getPermissionsAsync(),
          SecureStore.getItemAsync(NOTIF_PREF_KEY),
        ]);
        setNotifOn(status === "granted" && pref !== "false");
      } catch {}
    })();
  }, []);

  const handleNotifToggle = async (value: boolean) => {
    setNotifLoading(true);
    try {
      if (value) {
        const Notifications = require("expo-notifications");
        const { status } = await Notifications.getPermissionsAsync();
        if (status === "denied") {
          Alert.alert(
            "Notificações bloqueadas",
            "Permita notificações nas configurações do dispositivo.",
            [
              { text: "Cancelar", style: "cancel" },
              { text: "Abrir configurações", onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }
        await SecureStore.setItemAsync(NOTIF_PREF_KEY, "true");
        await registerPushToken();
        const { status: newStatus } = await Notifications.getPermissionsAsync();
        setNotifOn(newStatus === "granted");
      } else {
        await SecureStore.setItemAsync(NOTIF_PREF_KEY, "false");
        await clearPushToken();
        setNotifOn(false);
      }
    } finally {
      setNotifLoading(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={18} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionLabel}>NOTIFICAÇÕES</Text>
        <View style={styles.settingCard}>
          <View style={[styles.settingIcon, { backgroundColor: notifOn ? "#f9731618" : "#e5e7eb" }]}>
            {notifOn ? <Bell size={18} color="#f97316" /> : <BellOff size={18} color="#9ca3af" />}
          </View>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Notificações push</Text>
            <Text style={styles.settingSub}>
              {notifOn ? "Ativas — avisos em tempo real" : "Desativadas"}
            </Text>
          </View>
          {notifLoading ? (
            <ActivityIndicator size="small" color="#f97316" />
          ) : (
            <Switch
              value={notifOn}
              onValueChange={handleNotifToggle}
              trackColor={{ false: "#d1d5db", true: "#f97316" }}
              thumbColor="#ffffff"
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: "#e5e7eb", gap: 14,
  },
  backBtn: {
    width: 36, height: 36, backgroundColor: "#ffffff",
    borderRadius: 18, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  body: { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: {
    fontSize: 10, fontWeight: "700", color: "#9ca3af",
    letterSpacing: 1.5, marginBottom: 10,
  },
  settingCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f5f5f5", borderRadius: 16,
    borderWidth: 1, borderColor: "#e5e7eb", padding: 16, gap: 14,
  },
  settingIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  settingText: { flex: 1 },
  settingTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  settingSub: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
});
