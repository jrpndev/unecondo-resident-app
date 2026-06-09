import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Vote, Check } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { getAssemblies, castVote, Assembly } from "../lib/assemblies";
import { useAuthStore } from "../store/auth";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho", OPEN: "Aberta para votação", CLOSED: "Encerrada",
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#6b7280", OPEN: "#22c55e", CLOSED: "#3b82f6",
};

export default function AssembliesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Assembly | null>(null);
  const [voting, setVoting] = useState(false);

  const load = () => getAssemblies().then(setAssemblies).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleVote = async (itemId: string, choice: "YES" | "NO" | "ABSTAIN") => {
    if (!user?.residentId) return Toast.show({ type: "error", text1: "Cadastro incompleto" });
    setVoting(true);
    try {
      await castVote(itemId, choice);
      const fresh = await getAssemblies();
      setAssemblies(fresh);
      setSelected(prev => prev ? (fresh.find(a => a.id === prev.id) ?? null) : null);
      Toast.show({ type: "success", text1: "Voto registrado" });
    } catch {
      Toast.show({ type: "error", text1: "Erro ao votar" });
    } finally {
      setVoting(false);
    }
  };

  const voteSummary = (votes: Assembly["agendaItems"][0]["votes"]) => ({
    yes: votes.filter(v => v.choice === "YES").length,
    no: votes.filter(v => v.choice === "NO").length,
    abs: votes.filter(v => v.choice === "ABSTAIN").length,
    total: votes.length,
    myVote: votes.find(v => v.userId === user?.id)?.choice,
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={18} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Assembleias</Text>
          <Text style={styles.headerSub}>Votações e assembleias virtuais</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#f97316" /></View>
      ) : assemblies.length === 0 ? (
        <View style={styles.center}>
          <Vote size={48} color="#d1d5db" />
          <Text style={styles.emptyTitle}>Nenhuma assembleia</Text>
          <Text style={styles.emptySub}>As assembleias virtuais aparecerão aqui</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent}>
          {assemblies.map(a => (
            <TouchableOpacity
              key={a.id}
              onPress={() => setSelected(a)}
              activeOpacity={0.75}
              style={styles.card}
            >
              <View style={styles.cardRow}>
                <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[a.status] + "22" }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[a.status] }]}>
                    {STATUS_LABELS[a.status]}
                  </Text>
                </View>
                <Text style={styles.cardMeta}>{a.agendaItems.length} pautas</Text>
              </View>
              <Text style={styles.cardTitle}>{a.title}</Text>
              <Text style={styles.cardDate}>
                {new Date(a.scheduledAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Detail modal */}
      <Modal visible={!!selected} transparent animationType="slide">
        <View style={[styles.root, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
              <ArrowLeft size={18} color="#111827" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailTitle} numberOfLines={1}>{selected?.title}</Text>
              {selected && (
                <View style={styles.cardRow}>
                  <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[selected.status] + "22" }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[selected.status] }]}>
                      {STATUS_LABELS[selected.status]}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {selected && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.detailContent}>
              <View style={styles.infoCard}>
                <Text style={styles.infoDate}>
                  📅 {new Date(selected.scheduledAt).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}
                </Text>
                {selected.description && (
                  <Text style={styles.infoDesc}>{selected.description}</Text>
                )}
              </View>

              {selected.agendaItems.map((item, i) => {
                const s = voteSummary(item.votes);
                const canVote = selected.status === "OPEN" && !s.myVote;
                return (
                  <View key={item.id} style={styles.agendaCard}>
                    <Text style={styles.agendaLabel}>PAUTA {i + 1}</Text>
                    <Text style={styles.agendaTitle}>{item.title}</Text>
                    {item.description && (
                      <Text style={styles.agendaDesc}>{item.description}</Text>
                    )}

                    {s.total > 0 && (
                      <View style={styles.voteBar}>
                        <View style={styles.voteTrack}>
                          <View style={[styles.voteSegment, { flex: s.yes, backgroundColor: "#22c55e" }]} />
                          <View style={[styles.voteSegment, { flex: s.no, backgroundColor: "#ef4444" }]} />
                          <View style={[styles.voteSegment, { flex: s.abs, backgroundColor: "#6b7280" }]} />
                        </View>
                        <View style={styles.voteNumbers}>
                          <Text style={[styles.voteNum, { color: "#4ade80" }]}>✓ {s.yes}</Text>
                          <Text style={[styles.voteNum, { color: "#f87171" }]}>✗ {s.no}</Text>
                          <Text style={[styles.voteNum, { color: "#6b7280" }]}>— {s.abs}</Text>
                          <Text style={[styles.voteNum, { color: "#6b7280" }]}>{s.total} votos</Text>
                        </View>
                      </View>
                    )}

                    {s.myVote && (
                      <View style={styles.myVoteBox}>
                        <Check size={14} color="#f97316" />
                        <Text style={styles.myVoteText}>
                          Seu voto: {s.myVote === "YES" ? "Sim" : s.myVote === "NO" ? "Não" : "Abstenção"}
                        </Text>
                      </View>
                    )}

                    {canVote && (
                      <View style={styles.voteActions}>
                        {(["YES", "NO", "ABSTAIN"] as const).map(choice => (
                          <TouchableOpacity
                            key={choice}
                            onPress={() => handleVote(item.id, choice)}
                            disabled={voting}
                            activeOpacity={0.75}
                            style={[
                              styles.voteBtn,
                              choice === "YES" && styles.voteBtnYes,
                              choice === "NO" && styles.voteBtnNo,
                            ]}
                          >
                            <Text style={[styles.voteBtnText, (choice === "YES" || choice === "NO") && styles.voteBtnTextActive]}>
                              {choice === "YES" ? "Sim" : choice === "NO" ? "Não" : "Abstenção"}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {selected.status === "DRAFT" && (
                      <Text style={styles.draftNote}>Votação ainda não aberta</Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, backgroundColor: "#e5e7eb",
    borderRadius: 18, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  headerSub: { fontSize: 12, color: "#6b7280", marginTop: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: "#9ca3af" },
  emptySub: { fontSize: 13, color: "#9ca3af", textAlign: "center" },
  listContent: { padding: 16, gap: 10 },
  card: {
    backgroundColor: "#f5f5f5", borderRadius: 16,
    borderWidth: 1, borderColor: "#e5e7eb", padding: 16,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: "700" },
  cardTitle: { color: "#111827", fontSize: 14, fontWeight: "700" },
  cardDate: { color: "#6b7280", fontSize: 12, marginTop: 4 },
  cardMeta: { color: "#9ca3af", fontSize: 11 },
  // Detail
  detailTitle: { color: "#111827", fontWeight: "700", fontSize: 16 },
  detailContent: { padding: 16, gap: 12 },
  infoCard: {
    backgroundColor: "#f5f5f5", borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: "#e5e7eb",
  },
  infoDate: { color: "#6b7280", fontSize: 12 },
  infoDesc: { color: "#111827", fontSize: 13, marginTop: 8 },
  agendaCard: {
    backgroundColor: "#f5f5f5", borderRadius: 16,
    borderWidth: 1, borderColor: "#e5e7eb", padding: 16,
  },
  agendaLabel: {
    color: "#9ca3af", fontSize: 10, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4,
  },
  agendaTitle: { color: "#111827", fontSize: 14, fontWeight: "700", marginBottom: 8 },
  agendaDesc: { color: "#6b7280", fontSize: 12, marginBottom: 12 },
  voteBar: { marginBottom: 12 },
  voteTrack: {
    flexDirection: "row", borderRadius: 999, overflow: "hidden",
    height: 8, backgroundColor: "#ffffff",
  },
  voteSegment: {},
  voteNumbers: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  voteNum: { fontSize: 11, fontWeight: "600" },
  myVoteBox: {
    backgroundColor: "#f9731618", borderWidth: 1, borderColor: "#f9731440",
    borderRadius: 12, padding: 10,
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4,
  },
  myVoteText: { color: "#f97316", fontSize: 12, fontWeight: "600" },
  voteActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  voteBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 999,
    alignItems: "center", backgroundColor: "#ffffff",
    borderWidth: 1, borderColor: "#e5e7eb",
  },
  voteBtnYes: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  voteBtnNo: { backgroundColor: "#dc2626", borderColor: "#dc2626" },
  voteBtnText: { color: "#111827", fontSize: 12, fontWeight: "700" },
  voteBtnTextActive: { color: "#ffffff" },
  draftNote: { color: "#9ca3af", fontSize: 11, textAlign: "center", marginTop: 4 },
});
