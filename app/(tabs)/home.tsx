import React from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Package2, Megaphone, CalendarCheck, DollarSign, AlertCircle } from "lucide-react-native";
import { useAuthStore } from "../../store/auth";
import { getMyPackages } from "../../lib/packages";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAnnouncements } from "../../lib/announcements";
import { getMyCondoFees } from "../../lib/condoFees";

function SummaryCard({ icon, label, value, color, onPress }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm active:opacity-80"
    >
      <View className="w-10 h-10 rounded-xl items-center justify-center mb-3" style={{ backgroundColor: color + "20" }}>
        {icon}
      </View>
      <Text className="text-2xl font-bold text-gray-900 dark:text-white">{value}</Text>
      <Text className="text-xs text-gray-500 mt-0.5">{label}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const { data: packages = [], isLoading: loadPkg, refetch: refPkg, isRefetching: refPkging } = useQuery({
    queryKey: ["my-packages"],
    queryFn: getMyPackages,
  });

  const { data: announcements = [], isLoading: loadAnn } = useQuery({
    queryKey: ["announcements", user?.condoId],
    queryFn: () => getAnnouncements(user?.condoId ?? undefined),
  });

  const { data: fees = [], isLoading: loadFees } = useQuery({
    queryKey: ["my-condo-fees"],
    queryFn: getMyCondoFees,
  });

  const pendingPackages = packages.filter((p: any) => p.status === "PENDING");
  const unreadAnnouncements = announcements.filter((a: any) => !a.reads?.length);
  const pendingFees = fees.filter((f: any) => f.status === "PENDING" || f.status === "OVERDUE");

  const isRefreshing = refPkging;

  return (
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refPkg} tintColor="#f97316" />}
    >
      <View className="px-4 pb-4" style={{ paddingTop: insets.top + 12 }}>
        <Text className="text-gray-500 dark:text-gray-400 text-sm">Olá,</Text>
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">{user?.name?.split(" ")[0]} 👋</Text>
      </View>

      <View className="px-4 mb-6">
        <View className="flex-row gap-3">
          <SummaryCard
            icon={<Package2 size={20} color="#f97316" />}
            label="Encomendas aguardando"
            value={loadPkg ? "—" : pendingPackages.length}
            color="#f97316"
            onPress={() => router.push("/(tabs)/packages")}
          />
          <SummaryCard
            icon={<Megaphone size={20} color="#3b82f6" />}
            label="Avisos não lidos"
            value={loadAnn ? "—" : unreadAnnouncements.length}
            color="#3b82f6"
            onPress={() => router.push("/(tabs)/announcements")}
          />
        </View>
        <View className="flex-row gap-3 mt-3">
          <SummaryCard
            icon={<DollarSign size={20} color={pendingFees.length > 0 ? "#ef4444" : "#22c55e"} />}
            label="Cobranças pendentes"
            value={loadFees ? "—" : pendingFees.length}
            color={pendingFees.length > 0 ? "#ef4444" : "#22c55e"}
            onPress={() => router.push("/(tabs)/financial")}
          />
          <SummaryCard
            icon={<CalendarCheck size={20} color="#8b5cf6" />}
            label="Reservas ativas"
            value="—"
            color="#8b5cf6"
            onPress={() => router.push("/(tabs)/reservations")}
          />
        </View>
      </View>

      {pendingFees.length > 0 && (
        <View className="mx-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex-row items-center gap-3">
          <AlertCircle size={20} color="#ef4444" />
          <View className="flex-1">
            <Text className="font-semibold text-red-700 dark:text-red-400 text-sm">
              {pendingFees.length} cobrança{pendingFees.length > 1 ? "s" : ""} pendente{pendingFees.length > 1 ? "s" : ""}
            </Text>
            <Text className="text-xs text-red-500 mt-0.5">Toque para ver e pagar</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/(tabs)/financial")} className="bg-red-500 px-3 py-1.5 rounded-lg">
            <Text className="text-white text-xs font-semibold">Ver</Text>
          </TouchableOpacity>
        </View>
      )}

      {unreadAnnouncements.length > 0 && (
        <View className="mx-4 mb-6">
          <Text className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Últimos avisos</Text>
          {unreadAnnouncements.slice(0, 3).map((a: any) => (
            <TouchableOpacity
              key={a.id}
              onPress={() => router.push("/(tabs)/announcements")}
              className="bg-white dark:bg-gray-800 rounded-xl p-3 mb-2 flex-row items-start gap-2"
            >
              <View className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
              <View className="flex-1">
                <Text className="font-medium text-gray-900 dark:text-white text-sm" numberOfLines={1}>{a.title}</Text>
                <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={2}>{a.body}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
