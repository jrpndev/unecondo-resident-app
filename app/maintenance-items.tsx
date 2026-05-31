import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Image, Modal, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Wrench, Calendar, CheckCircle, X } from "lucide-react-native";
import { useEffect } from "react";
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
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={18} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Manutenções</Text>
          <Text style={styles.headerSub}>Preventivas e corretivas</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#f97316" /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Wrench size={48} color="#2a2a2a" />
          <Text style={styles.emptyTitle}>Nenhuma manutenção</Text>
          <Text style={styles.emptySub}>O cronograma de manutenções aparecerá aqui</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent}>
          {overdue.length > 0 && (
            <View style={styles.alertBanner}>
              <Wrench size={16} color="#ef4444" />
              <Text style={styles.alertText}>
                {overdue.length} manutenção(ões) em atraso
              </Text>
            </View>
          )}
          {upcoming.length > 0 && <Section title="Próximas" items={upcoming} color="#f97316" />}
          {overdue.length > 0  && <Section title="Em atraso" items={overdue} color="#ef4444" />}
          {done.length > 0     && <Section title="Concluídas" items={done} color="#22c55e" />}
        </ScrollView>
      )}
    </View>
  );
}

function Section({ title, items, color }: { title: string; items: MaintenanceItem[]; color: string }) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  return (
    <View style={sectionStyles.group}>
      <Text style={sectionStyles.groupLabel}>{title}</Text>
      <View style={sectionStyles.groupCard}>
        {items.map((item, i) => (
          <View
            key={item.id}
            style={[sectionStyles.itemRow, i < items.length - 1 && sectionStyles.itemRowBorder]}
          >
            <View style={[sectionStyles.iconWrap, { backgroundColor: color + "22" }]}>
              {item.isDone
                ? <CheckCircle size={16} color={color} />
                : <Wrench size={16} color={color} />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sectionStyles.itemTitle}>{item.title}</Text>
              {item.location && (
                <Text style={sectionStyles.itemLocation}>📍 {item.location}</Text>
              )}
              <View style={sectionStyles.metaRow}>
                <View style={sectionStyles.dateRow}>
                  <Calendar size={11} color="#535353" />
                  <Text style={sectionStyles.itemDate}>
                    {new Date(item.scheduledDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                  </Text>
                </View>
                {item.recurrence && item.recurrence !== "Única" && (
                  <Text style={sectionStyles.itemRecurrence}>🔄 {item.recurrence}</Text>
                )}
              </View>
              {item.description && (
                <Text style={sectionStyles.itemDesc} numberOfLines={2}>{item.description}</Text>
              )}
              {item.imageUrl && (
                <TouchableOpacity
                  onPress={() => setZoomedImage(item.imageUrl!)}
                  activeOpacity={0.85}
                  style={{ marginTop: 8 }}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={sectionStyles.itemImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>

      <Modal
        visible={!!zoomedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomedImage(null)}
      >
        <TouchableOpacity
          style={sectionStyles.zoomOverlay}
          onPress={() => setZoomedImage(null)}
          activeOpacity={1}
        >
          {zoomedImage && (
            <Image
              source={{ uri: zoomedImage }}
              style={sectionStyles.zoomedImage}
              resizeMode="contain"
            />
          )}
          <View style={sectionStyles.zoomClose}>
            <X size={20} color="#ffffff" />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#111111" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: "#2a2a2a",
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, backgroundColor: "#2a2a2a",
    borderRadius: 18, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#ffffff" },
  headerSub: { fontSize: 12, color: "#9a9a9a", marginTop: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: "#535353" },
  emptySub: { fontSize: 13, color: "#535353", textAlign: "center" },
  listContent: { padding: 16 },
  alertBanner: {
    backgroundColor: "#ef444410", borderWidth: 1, borderColor: "#ef444430",
    borderRadius: 12, padding: 12, marginBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  alertText: { color: "#f87171", fontSize: 13, fontWeight: "600" },
});

const sectionStyles = StyleSheet.create({
  group: { marginBottom: 24 },
  groupLabel: {
    color: "#535353", fontSize: 10, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12,
  },
  groupCard: {
    backgroundColor: "#1a1a1a", borderRadius: 16,
    borderWidth: 1, borderColor: "#2a2a2a", overflow: "hidden",
  },
  itemRow: {
    paddingHorizontal: 16, paddingVertical: 16,
    flexDirection: "row", alignItems: "flex-start", gap: 12,
  },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: "#2a2a2a" },
  iconWrap: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: "center", justifyContent: "center", marginTop: 2,
  },
  itemTitle: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  itemLocation: { color: "#9a9a9a", fontSize: 11, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  itemDate: { color: "#9a9a9a", fontSize: 11 },
  itemRecurrence: { color: "#535353", fontSize: 11 },
  itemDesc: { color: "#9a9a9a", fontSize: 12, marginTop: 4 },
  itemImage: { borderRadius: 12, width: "100%", height: 120 },
  zoomOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center", justifyContent: "center",
  },
  zoomedImage: { width: "95%", height: "70%" },
  zoomClose: {
    position: "absolute", top: 48, right: 16,
    backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 999, padding: 8,
  },
});
