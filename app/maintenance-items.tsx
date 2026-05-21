import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Wrench, Calendar, CheckCircle } from "lucide-react-native";
import { getMaintenanceItems, MaintenanceItem } from "../lib/condoMaintenance";

export default function MaintenanceItemsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMaintenanceItems().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const upcoming = items.filter(i => !i.isDone && new Date(i.scheduledDate) >= new Date());
  const overdue  = items.filter(i => !i.isDone && new Date(i.scheduledDate) < new Date());
  const done     = items.filter(i => i.isDone);

  return (
    <View className="flex-1 bg-gray-950" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-4 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1.5 rounded-xl bg-gray-800 active:opacity-70">
          <ArrowLeft size={18} color="white" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white text-lg font-bold">Manutenções</Text>
          <Text className="text-gray-400 text-xs">Preventivas e corretivas</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#f97316" /></View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Wrench size={48} color="#374151" />
          <Text className="text-gray-500 text-base font-semibold mt-4">Nenhuma manutenção</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {overdue.length > 0 && (
            <View className="bg-red-900/20 border border-red-800/30 rounded-xl p-3 mb-4 flex-row items-center gap-2">
              <Wrench size={16} color="#ef4444" />
              <Text className="text-red-400 text-sm font-semibold">{overdue.length} manutenção(ões) em atraso</Text>
            </View>
          )}
          {upcoming.length > 0 && (
            <Section title="Próximas" items={upcoming} color="#f97316" />
          )}
          {overdue.length > 0 && (
            <Section title="Em atraso" items={overdue} color="#ef4444" />
          )}
          {done.length > 0 && (
            <Section title="Concluídas" items={done} color="#22c55e" />
          )}
        </ScrollView>
      )}
    </View>
  );
}

function Section({ title, items, color }: { title: string; items: MaintenanceItem[]; color: string }) {
  return (
    <View className="mb-6">
      <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">{title}</Text>
      <View className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
        {items.map((item, i) => (
          <View key={item.id} className={`px-4 py-3.5 flex-row items-start gap-3 ${i < items.length - 1 ? "border-b border-gray-800" : ""}`}>
            <View className="w-9 h-9 rounded-xl items-center justify-center mt-0.5" style={{ backgroundColor: color + "22" }}>
              {item.isDone ? <CheckCircle size={16} color={color} /> : <Wrench size={16} color={color} />}
            </View>
            <View className="flex-1">
              <Text className="text-white text-sm font-semibold">{item.title}</Text>
              {item.location && <Text className="text-gray-500 text-xs mt-0.5">📍 {item.location}</Text>}
              <View className="flex-row items-center gap-3 mt-1">
                <View className="flex-row items-center gap-1">
                  <Calendar size={11} color="#6b7280" />
                  <Text className="text-gray-500 text-xs">{new Date(item.scheduledDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</Text>
                </View>
                {item.recurrence && item.recurrence !== "Única" && (
                  <Text className="text-gray-600 text-xs">🔄 {item.recurrence}</Text>
                )}
              </View>
              {item.description && <Text className="text-gray-500 text-xs mt-1" numberOfLines={2}>{item.description}</Text>}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
