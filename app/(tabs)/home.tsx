import React from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Package2, Megaphone, CalendarCheck, DollarSign, AlertCircle, ChevronRight } from "lucide-react-native";
import { useAuthStore } from "../../store/auth";
import { getMyPackages } from "../../lib/packages";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAnnouncements } from "../../lib/announcements";
import { getMyCondoFees } from "../../lib/condoFees";

function SummaryCard({ icon, label, value, accentColor, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.summaryCard} activeOpacity={0.75}>
      <View style={[styles.summaryIcon, { backgroundColor: accentColor + "20" }]}>
        {icon}
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
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

  const firstName = user?.name?.split(" ")[0];

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refPkging} onRefresh={refPkg} tintColor="#f97316" />}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerSub}>Olá,</Text>
        <Text style={styles.headerName}>{firstName}</Text>
      </View>

      {/* Summary cards */}
      <View style={styles.summaryGrid}>
        <SummaryCard
          icon={<Package2 size={20} color="#f97316" />}
          label="Encomendas"
          value={loadPkg ? "—" : pendingPackages.length}
          accentColor="#f97316"
          onPress={() => router.push("/(tabs)/packages")}
        />
        <SummaryCard
          icon={<Megaphone size={20} color="#3b82f6" />}
          label="Avisos novos"
          value={loadAnn ? "—" : unreadAnnouncements.length}
          accentColor="#3b82f6"
          onPress={() => router.push("/(tabs)/announcements")}
        />
        <SummaryCard
          icon={<DollarSign size={20} color={pendingFees.length > 0 ? "#ef4444" : "#22c55e"} />}
          label="Cobranças"
          value={loadFees ? "—" : pendingFees.length}
          accentColor={pendingFees.length > 0 ? "#ef4444" : "#22c55e"}
          onPress={() => router.push("/(tabs)/financial")}
        />
        <SummaryCard
          icon={<CalendarCheck size={20} color="#8b5cf6" />}
          label="Reservas"
          value="—"
          accentColor="#8b5cf6"
          onPress={() => router.push("/(tabs)/reservations")}
        />
      </View>

      {/* Alert: pending fees */}
      {pendingFees.length > 0 && (
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/financial")}
          style={styles.alertBanner}
          activeOpacity={0.8}
        >
          <AlertCircle size={18} color="#f87171" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.alertTitle}>
              {pendingFees.length} cobrança{pendingFees.length > 1 ? "s" : ""} pendente{pendingFees.length > 1 ? "s" : ""}
            </Text>
            <Text style={styles.alertSub}>Toque para ver e pagar</Text>
          </View>
          <ChevronRight size={16} color="#f87171" />
        </TouchableOpacity>
      )}

      {/* Recent announcements */}
      {unreadAnnouncements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ÚLTIMOS AVISOS</Text>
          {unreadAnnouncements.slice(0, 3).map((a: any) => (
            <TouchableOpacity
              key={a.id}
              onPress={() => router.push("/(tabs)/announcements")}
              style={styles.announcementCard}
              activeOpacity={0.75}
            >
              <View style={styles.announcementDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.announcementTitle} numberOfLines={1}>{a.title}</Text>
                <Text style={styles.announcementBody} numberOfLines={2}>{a.body}</Text>
              </View>
              <ChevronRight size={14} color="#5a5a5a" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#111111",
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerSub: {
    fontSize: 14,
    color: "#9a9a9a",
    fontWeight: "500",
  },
  headerName: {
    fontSize: 32,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 16,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#9a9a9a",
    marginTop: 2,
    fontWeight: "500",
  },
  alertBanner: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#ef444415",
    borderWidth: 1,
    borderColor: "#ef444430",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f87171",
  },
  alertSub: {
    fontSize: 11,
    color: "#f8717180",
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#535353",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  announcementCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderLeftWidth: 3,
    borderLeftColor: "#f97316",
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  announcementDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#f97316",
    flexShrink: 0,
  },
  announcementTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  announcementBody: {
    fontSize: 12,
    color: "#9a9a9a",
    marginTop: 2,
  },
});
