import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import {
  CalendarCheck, DollarSign, User, ChevronRight, LogOut,
  QrCode, Settings,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/auth";

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  sub: string;
  color: string;
  onPress: () => void;
}

function MenuRow({ icon, label, sub, color, onPress }: MenuItem) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center bg-white dark:bg-gray-800 px-4 py-3.5 border-b border-gray-100 dark:border-gray-700 active:opacity-70"
    >
      <View
        className="w-10 h-10 rounded-2xl items-center justify-center mr-4"
        style={{ backgroundColor: color + "18" }}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-gray-900 dark:text-white text-sm font-semibold">{label}</Text>
        <Text className="text-gray-400 text-xs mt-0.5">{sub}</Text>
      </View>
      <ChevronRight size={16} color="#d1d5db" />
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const confirmLogout = () => {
    Alert.alert("Sair da conta", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* User header */}
      <View className="bg-orange-500 pb-8 px-5 items-center" style={{ paddingTop: insets.top + 20 }}>
        <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center mb-2 border-2 border-white/30">
          <Text className="text-white text-xl font-bold">{initials}</Text>
        </View>
        <Text className="text-white text-base font-bold">{user?.name}</Text>
        <Text className="text-white/70 text-xs mt-0.5">{user?.email}</Text>
      </View>

      <View className="mt-5 mx-4">
        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
          Serviços
        </Text>
        <View className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
          <MenuRow
            icon={<CalendarCheck size={20} color="#8b5cf6" />}
            label="Reservas"
            sub="Áreas comuns do condomínio"
            color="#8b5cf6"
            onPress={() => router.push("/(tabs)/reservations")}
          />
          <MenuRow
            icon={<DollarSign size={20} color="#22c55e" />}
            label="Financeiro"
            sub="Boletos e cobranças"
            color="#22c55e"
            onPress={() => router.push("/(tabs)/financial")}
          />
        </View>
      </View>

      <View className="mt-5 mx-4">
        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
          Conta
        </Text>
        <View className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
          <MenuRow
            icon={<User size={20} color="#f97316" />}
            label="Perfil"
            sub="QR Code, unidade e dados"
            color="#f97316"
            onPress={() => router.push("/(tabs)/profile")}
          />
          <MenuRow
            icon={<Settings size={20} color="#6b7280" />}
            label="Configurações"
            sub="Notificações e preferências"
            color="#6b7280"
            onPress={() => router.push("/settings")}
          />
        </View>
      </View>

      <View className="mt-5 mx-4">
        <View className="rounded-2xl overflow-hidden border border-red-100 dark:border-red-900/30 shadow-sm">
          <TouchableOpacity
            onPress={confirmLogout}
            activeOpacity={0.7}
            className="flex-row items-center bg-white dark:bg-gray-800 px-4 py-3.5"
          >
            <View className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-900/20 items-center justify-center mr-4">
              <LogOut size={20} color="#ef4444" />
            </View>
            <Text className="text-red-500 font-bold flex-1">Sair da conta</Text>
            <ChevronRight size={16} color="#fca5a5" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
