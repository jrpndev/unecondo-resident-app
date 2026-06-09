import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, StyleSheet } from "react-native";
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
      <View style={styles.loading}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Encomendas" />

      {/* Search + filters */}
      <View style={styles.filterArea}>
        <View style={styles.searchBar}>
          <Search size={15} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar código, origem..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.chips}>
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.value;
            return (
              <TouchableOpacity
                key={f.label}
                onPress={() => setStatusFilter(f.value)}
                style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <PackageCard
            pkg={item}
            onPress={() => router.push(`/package/${item.id}`)}
            showOriginBadge
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Package2 size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Nenhuma encomenda encontrada</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loading: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  filterArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#f5f5f5",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipActive: {
    backgroundColor: "#ffffff",
  },
  chipInactive: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#111827",
  },
  chipTextInactive: {
    color: "#6b7280",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 100,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: "#9ca3af",
    fontWeight: "500",
  },
});
