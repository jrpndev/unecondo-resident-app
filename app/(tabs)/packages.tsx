import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Search, Package2 } from "lucide-react-native";
import { getMyPackages } from "../../lib/packages";
import { PackageCard } from "../../components/PackageCard";
import { PackageStatus } from "../../types";
import { ScreenHeader } from "../../components/ScreenHeader";

const STATUS_FILTERS: { label: string; value: PackageStatus | undefined }[] = [
  { label: "Todos",      value: undefined   },
  { label: "Pendentes",  value: "PENDING"   },
  { label: "Entregues",  value: "DELIVERED" },
  { label: "Devolvidos", value: "RETURNED"  },
];

export default function PackagesScreen() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<PackageStatus | undefined>(undefined);
  const [search, setSearch] = useState("");

  const { data = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["myPackages", statusFilter, search],
    queryFn: () => getMyPackages({ status: statusFilter, search: search || undefined }),
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScreenHeader title="Minhas Encomendas" />
      <View className="px-4 pb-3 bg-gray-50 dark:bg-gray-900">
        <View className="flex-row items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-3 mb-3">
          <Search size={16} color="#9ca3af" />
          <TextInput
            className="flex-1 py-3 px-2 text-gray-900 dark:text-white text-sm"
            placeholder="Buscar código, origem..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View className="flex-row gap-2">
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.label}
              onPress={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-full ${
                statusFilter === f.value ? "bg-orange-500" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              }`}
            >
              <Text className={`text-xs font-semibold ${statusFilter === f.value ? "text-white" : "text-gray-500 dark:text-gray-400"}`}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <PackageCard
            pkg={item}
            onPress={() => router.push(`/package/${item.id}`)}
            showOriginBadge
          />
        )}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Package2 size={40} color="#d1d5db" />
            <Text className="text-gray-400 mt-3 text-base">Nenhuma encomenda encontrada</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />
        }
      />
    </View>
  );
}
