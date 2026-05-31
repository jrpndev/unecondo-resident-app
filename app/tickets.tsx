import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, Modal, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, AlertCircle, Plus, Send, X } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { getTickets, createTicket, addTicketMessage, Ticket } from "../lib/tickets";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberto", IN_PROGRESS: "Em andamento", RESOLVED: "Resolvido", CLOSED: "Fechado",
};
const STATUS_COLORS: Record<string, string> = {
  OPEN: "#eab308", IN_PROGRESS: "#3b82f6", RESOLVED: "#22c55e", CLOSED: "#6b7280",
};
const CATEGORIES = ["Geral", "Estrutura", "Barulho", "Segurança", "Limpeza", "Outro"];

export default function TicketsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ title: "", description: "", category: "Geral", priority: "MEDIUM" });
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const load = () => getTickets().then(setTickets).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.description) {
      return Toast.show({ type: "error", text1: "Preencha todos os campos" });
    }
    setSaving(true);
    try {
      await createTicket(form);
      await load();
      setCreateModal(false);
      setForm({ title: "", description: "", category: "Geral", priority: "MEDIUM" });
      Toast.show({ type: "success", text1: "Ocorrência aberta" });
    } catch {
      Toast.show({ type: "error", text1: "Erro ao abrir ocorrência" });
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!selected || !message.trim()) return;
    const body = message.trim();
    setMessage("");
    try {
      const msg = await addTicketMessage(selected.id, body);
      setSelected(prev => prev ? { ...prev, messages: [...prev.messages, msg] } : null);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      Toast.show({ type: "error", text1: "Erro ao enviar mensagem" });
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={18} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Ocorrências</Text>
          <Text style={styles.headerSub}>Seus chamados e solicitações</Text>
        </View>
        <TouchableOpacity onPress={() => setCreateModal(true)} style={styles.addBtn}>
          <Plus size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#f97316" /></View>
      ) : tickets.length === 0 ? (
        <View style={styles.center}>
          <AlertCircle size={48} color="#2a2a2a" />
          <Text style={styles.emptyTitle}>Nenhuma ocorrência</Text>
          <Text style={styles.emptySub}>Abra uma solicitação usando o botão +</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent}>
          {tickets.map(t => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setSelected(t)}
              activeOpacity={0.75}
              style={styles.card}
            >
              <View style={styles.cardRow}>
                <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[t.status] + "22" }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[t.status] }]}>
                    {STATUS_LABELS[t.status]}
                  </Text>
                </View>
                <Text style={styles.categoryText}>{t.category}</Text>
              </View>
              <Text style={styles.cardTitle}>{t.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={1}>{t.description}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardMeta}>{new Date(t.createdAt).toLocaleDateString("pt-BR")}</Text>
                <Text style={styles.cardMeta}>{t.messages.length} mensagens</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Create Modal */}
      <Modal visible={createModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalOverlayWrap}>
            <View style={styles.modalBackdrop} />
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Nova ocorrência</Text>
                <TouchableOpacity onPress={() => setCreateModal(false)} style={styles.closeBtn}>
                  <X size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>TÍTULO</Text>
              <TextInput
                value={form.title}
                onChangeText={t => setForm(f => ({ ...f, title: t }))}
                placeholder="Ex: Vazamento na garagem"
                placeholderTextColor="#535353"
                style={styles.textInput}
              />

              <Text style={styles.fieldLabel}>DESCRIÇÃO</Text>
              <TextInput
                value={form.description}
                onChangeText={t => setForm(f => ({ ...f, description: t }))}
                placeholder="Descreva o problema em detalhes"
                placeholderTextColor="#535353"
                multiline
                numberOfLines={3}
                style={[styles.textInput, styles.textArea]}
              />

              <Text style={styles.fieldLabel}>CATEGORIA</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                <View style={styles.chipRow}>
                  {CATEGORIES.map(c => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setForm(f => ({ ...f, category: c }))}
                      style={[styles.chip, form.category === c && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, form.category === c && styles.chipTextActive]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity
                onPress={handleCreate}
                disabled={saving}
                activeOpacity={0.8}
                style={styles.submitBtn}
              >
                <Text style={styles.submitBtnText}>
                  {saving ? "Abrindo..." : "Abrir ocorrência"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Ticket detail modal */}
      <Modal visible={!!selected} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={[styles.root, { paddingTop: insets.top }]}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
                <ArrowLeft size={18} color="#ffffff" />
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
              <>
                <View style={styles.descCard}>
                  <Text style={styles.descText}>{selected.description}</Text>
                </View>

                <ScrollView
                  ref={scrollRef}
                  style={{ flex: 1, paddingHorizontal: 16, marginTop: 12 }}
                  contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
                >
                  {selected.messages.length === 0 && (
                    <Text style={styles.noMsgs}>Sem mensagens ainda</Text>
                  )}
                  {selected.messages.map(msg => (
                    <View
                      key={msg.id}
                      style={[styles.msgRow, msg.isAdmin ? styles.msgLeft : styles.msgRight]}
                    >
                      <View style={[
                        styles.bubble,
                        msg.isAdmin ? styles.bubbleAdmin : styles.bubbleMine,
                      ]}>
                        {msg.isAdmin && (
                          <Text style={styles.adminLabel}>Administração</Text>
                        )}
                        <Text style={styles.bubbleText}>{msg.body}</Text>
                        <Text style={styles.bubbleTime}>
                          {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {selected.status !== "CLOSED" && selected.status !== "RESOLVED" && (
                  <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    <TextInput
                      value={message}
                      onChangeText={setMessage}
                      placeholder="Mensagem..."
                      placeholderTextColor="#535353"
                      style={styles.messageInput}
                    />
                    <TouchableOpacity
                      onPress={handleSend}
                      disabled={!message.trim()}
                      style={[styles.sendBtn, !message.trim() && { opacity: 0.4 }]}
                    >
                      <Send size={18} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </KeyboardAvoidingView>
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
  addBtn: {
    width: 36, height: 36, backgroundColor: "#f97316",
    borderRadius: 12, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#ffffff" },
  headerSub: { fontSize: 12, color: "#9a9a9a", marginTop: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: "#535353" },
  emptySub: { fontSize: 13, color: "#535353", textAlign: "center" },
  listContent: { padding: 16, gap: 10 },
  card: {
    backgroundColor: "#1a1a1a", borderRadius: 16,
    borderWidth: 1, borderColor: "#2a2a2a", padding: 16,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: "700" },
  categoryText: { color: "#535353", fontSize: 11 },
  cardTitle: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  cardDesc: { color: "#9a9a9a", fontSize: 12, marginTop: 4 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  cardMeta: { color: "#535353", fontSize: 11 },
  // Modal
  modalOverlayWrap: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    backgroundColor: "#1a1a1a", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24,
  },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20,
  },
  sheetTitle: { color: "#ffffff", fontSize: 17, fontWeight: "700" },
  closeBtn: {
    padding: 6, backgroundColor: "#2a2a2a", borderRadius: 8,
  },
  fieldLabel: {
    color: "#9a9a9a", fontSize: 11, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#242424", color: "#ffffff", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 14,
    marginBottom: 16, borderWidth: 1, borderColor: "#2a2a2a",
  },
  textArea: { textAlignVertical: "top", minHeight: 72 },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: "#2a2a2a",
  },
  chipActive: { backgroundColor: "#f97316" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#9a9a9a" },
  chipTextActive: { color: "#ffffff" },
  submitBtn: {
    backgroundColor: "#f97316", borderRadius: 999,
    paddingVertical: 16, alignItems: "center",
  },
  submitBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  // Detail
  detailTitle: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  descCard: {
    backgroundColor: "#1a1a1a", marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#2a2a2a",
  },
  descText: { color: "#e5e5e5", fontSize: 13 },
  noMsgs: { color: "#535353", fontSize: 12, textAlign: "center", paddingVertical: 16 },
  msgRow: { flexDirection: "row" },
  msgLeft: { justifyContent: "flex-start" },
  msgRight: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: "80%", borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  bubbleAdmin: {
    backgroundColor: "#1a1a1a", borderTopLeftRadius: 4,
    borderWidth: 1, borderColor: "#2a2a2a",
  },
  bubbleMine: { backgroundColor: "#f97316", borderTopRightRadius: 4 },
  adminLabel: { color: "#f97316", fontSize: 10, fontWeight: "700", marginBottom: 4 },
  bubbleText: { color: "#ffffff", fontSize: 13 },
  bubbleTime: { color: "#9a9a9a", fontSize: 10, marginTop: 4 },
  inputBar: {
    paddingHorizontal: 16, paddingTop: 12,
    flexDirection: "row", gap: 8,
    borderTopWidth: 1, borderTopColor: "#2a2a2a",
    backgroundColor: "#111111",
  },
  messageInput: {
    flex: 1, backgroundColor: "#242424",
    borderWidth: 1, borderColor: "#2a2a2a",
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    color: "#ffffff", fontSize: 14,
  },
  sendBtn: {
    width: 44, height: 44, backgroundColor: "#f97316",
    borderRadius: 22, alignItems: "center", justifyContent: "center",
    alignSelf: "flex-end",
  },
});
