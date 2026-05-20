import React from "react";
import {
  View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { LogOut, Shield, Building2, Mail, ChevronRight, QrCode, Settings } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/auth";
import { getResident } from "../../lib/residents";

let QRCode: any = null;
try { QRCode = require("react-native-qrcode-svg").default; } catch {}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const hasResident = !!user?.residentId;

  const { data: residentData, isLoading: loadingQr } = useQuery({
    queryKey: ["resident", user?.residentId],
    queryFn: () => getResident(user!.residentId!),
    enabled: hasResident,
  });

  const confirmLogout = () => {
    Alert.alert("Sair da conta", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => { await logout(); router.replace("/(auth)/login"); },
      },
    ]);
  };

  const initials = user?.name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View className="bg-orange-500 pt-14 pb-10 px-5 items-center rounded-b-[40px]">
        <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-3 border-4 border-white/30">
          <Text className="text-white text-2xl font-bold">{initials}</Text>
        </View>
        <Text className="text-white text-xl font-bold">{user?.name}</Text>
        <Text className="text-white/80 text-sm mt-0.5">{user?.email}</Text>
        <View className="mt-3 px-3 py-1 rounded-full bg-white/20">
          <Text className="text-white text-xs font-bold">Morador</Text>
        </View>
      </View>

      <View className="px-5 mt-6">
        {/* QR Code for package pickup */}
        {hasResident && (
          <View className="mb-6">
            <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">
              QR Code de retirada
            </Text>
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-5 items-center border border-gray-100 dark:border-gray-700 shadow-sm">
              {loadingQr ? (
                <ActivityIndicator color="#f97316" size="large" style={{ marginVertical: 40 }} />
              ) : residentData?.qrToken && QRCode ? (
                <>
                  <View className="p-3 bg-white border border-gray-100 rounded-2xl mb-3">
                    <QRCode
                      value={residentData.qrToken}
                      size={180}
                      color="#1f2937"
                      backgroundColor="white"
                    />
                  </View>
                  <View className="flex-row items-center gap-1.5 mt-1 px-4">
                    <QrCode size={13} color="#f97316" />
                    <Text className="text-orange-500 text-xs font-semibold text-center flex-1">
                      Mostre este código ao porteiro para retirar sua encomenda
                    </Text>
                  </View>
                  {residentData?.unit && (
                    <Text className="text-gray-400 text-xs mt-1">
                      Apto {residentData.unit.number}
                      {residentData.unit.block ? ` · Bloco ${residentData.unit.block}` : ""}
                    </Text>
                  )}
                </>
              ) : (
                <Text className="text-gray-400 text-sm py-8">QR Code não disponível</Text>
              )}
            </View>
          </View>
        )}

        {/* Account info */}
        <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">
          Informações da conta
        </Text>

        <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden mb-4 border border-gray-100 dark:border-gray-700 shadow-sm">
          <View className="flex-row items-center p-4 border-b border-gray-100 dark:border-gray-700">
            <View className="w-9 h-9 bg-orange-50 dark:bg-orange-900/20 rounded-xl items-center justify-center mr-3">
              <Mail size={16} color="#f97316" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-400 text-xs">E-mail</Text>
              <Text className="text-gray-900 dark:text-white text-sm font-semibold mt-0.5">{user?.email}</Text>
            </View>
          </View>

          <View className="flex-row items-center p-4 border-b border-gray-100 dark:border-gray-700">
            <View className="w-9 h-9 bg-violet-50 dark:bg-violet-900/20 rounded-xl items-center justify-center mr-3">
              <Shield size={16} color="#8b5cf6" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-400 text-xs">Função</Text>
              <Text className="text-gray-900 dark:text-white text-sm font-semibold mt-0.5">Morador</Text>
            </View>
          </View>

          {user?.condoId && (
            <View className="flex-row items-center p-4">
              <View className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 rounded-xl items-center justify-center mr-3">
                <Building2 size={16} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-400 text-xs">Condomínio</Text>
                <Text className="text-gray-900 dark:text-white text-sm font-semibold mt-0.5" numberOfLines={1}>
                  {residentData?.condo?.name ?? user.condoId}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Settings */}
        <TouchableOpacity
          onPress={() => router.push("/settings")}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex-row items-center mb-3 border border-gray-100 dark:border-gray-700 shadow-sm active:opacity-80"
        >
          <View className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-xl items-center justify-center mr-3">
            <Settings size={16} color="#6b7280" />
          </View>
          <Text className="text-gray-900 dark:text-white text-sm font-semibold flex-1">Configurações</Text>
          <ChevronRight size={16} color="#d1d5db" />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          onPress={confirmLogout}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex-row items-center border border-gray-100 dark:border-gray-700 shadow-sm active:opacity-80"
        >
          <View className="w-9 h-9 bg-red-50 dark:bg-red-900/20 rounded-xl items-center justify-center mr-3">
            <LogOut size={16} color="#ef4444" />
          </View>
          <Text className="text-red-500 font-bold flex-1">Sair da conta</Text>
          <ChevronRight size={16} color="#fca5a5" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
