import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
  Alert,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Bell, BellOff } from "lucide-react-native";
import * as SecureStore from "expo-secure-store";
import { registerPushToken, clearPushToken, NOTIF_PREF_KEY } from "../lib/notifications";

export default function SettingsScreen() {
  const router = useRouter();

  const [notifOn, setNotifOn]         = useState(false);
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
    <ScrollView className="flex-1 bg-gray-950" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View className="bg-gray-900 px-5 pt-14 pb-4 border-b border-gray-800 flex-row items-center gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-gray-800 rounded-xl items-center justify-center"
        >
          <ArrowLeft size={20} color="#9ca3af" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Configurações</Text>
      </View>

      <View className="px-5 mt-6">
        {/* Notifications */}
        <Text className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">
          Notificações
        </Text>
        <View className="bg-gray-900 rounded-2xl overflow-hidden mb-6 border border-gray-800">
          <View className="flex-row items-center p-4">
            <View className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${notifOn ? "bg-primary-900/40" : "bg-gray-800"}`}>
              {notifOn ? <Bell size={16} color="#f97316" /> : <BellOff size={16} color="#6b7280" />}
            </View>
            <View className="flex-1">
              <Text className="text-white text-sm font-semibold">Notificações push</Text>
              <Text className="text-gray-500 text-xs mt-0.5">
                {notifOn ? "Ativas — você receberá avisos em tempo real" : "Desativadas"}
              </Text>
            </View>
            {notifLoading ? (
              <ActivityIndicator size="small" color="#f97316" />
            ) : (
              <Switch
                value={notifOn}
                onValueChange={handleNotifToggle}
                trackColor={{ false: "#374151", true: "#f97316" }}
                thumbColor={notifOn ? "#ffffff" : "#9ca3af"}
              />
            )}
          </View>
        </View>

      </View>
    </ScrollView>
  );
}
