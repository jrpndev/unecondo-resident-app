import React, { useCallback, useState } from "react";
import {
  View, Text, FlatList, RefreshControl,
  TouchableOpacity, ActivityIndicator, Image, Linking,
  Modal, TextInput, Switch, Alert, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pin, Plus, Pencil, X } from "lucide-react-native";
import {
  getAnnouncements, markAnnouncementRead, createAnnouncement, updateAnnouncement,
  type Announcement,
} from "../../lib/announcements";
import { useAuthStore } from "../../store/auth";
import { ScreenHeader } from "../../components/ScreenHeader";
import Toast from "react-native-toast-message";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface EditForm {
  title: string;
  body: string;
  startsAt: string;
  expiresAt: string;
  displayDurationDays: string;
  isPinned: boolean;
}

const EMPTY_FORM: EditForm = {
  title: "",
  body: "",
  startsAt: "",
  expiresAt: "",
  displayDurationDays: "",
  isPinned: false,
};

export default function AnnouncementsScreen() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const condoId = user?.condoId ?? undefined;
  const isAdmin = user?.role === "CONDO_ADMIN";

  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [form, setForm] = useState<EditForm>(EMPTY_FORM);

  const { data: announcements = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["announcements", condoId],
    queryFn: () => getAnnouncements(condoId),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => markAnnouncementRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        isPinned: form.isPinned,
        startsAt: form.startsAt.trim() || undefined,
        expiresAt: form.expiresAt.trim() || undefined,
        displayDurationDays: form.displayDurationDays ? parseInt(form.displayDurationDays) : undefined,
      };
      if (editTarget) {
        return updateAnnouncement(editTarget.id, payload);
      }
      return createAnnouncement(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      setModalVisible(false);
      setEditTarget(null);
      setForm(EMPTY_FORM);
      Toast.show({ type: "success", text1: editTarget ? "Aviso atualizado" : "Aviso publicado" });
    },
    onError: (e: any) => {
      Toast.show({ type: "error", text1: "Erro", text2: e?.response?.data?.message ?? "Não foi possível salvar" });
    },
  });

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (item: Announcement) => {
    setEditTarget(item);
    setForm({
      title: item.title,
      body: item.body,
      startsAt: item.startsAt ?? "",
      expiresAt: item.expiresAt ?? "",
      displayDurationDays: "",
      isPinned: item.isPinned,
    });
    setModalVisible(true);
  };

  const handlePress = useCallback((a: Announcement) => {
    if (!a.reads?.length) markRead.mutate(a.id);
  }, []);

  const renderItem = ({ item }: { item: Announcement }) => {
    const isRead = !!item.reads?.length;
    return (
      <TouchableOpacity onPress={() => handlePress(item)} style={styles.card} activeOpacity={0.8}>
        <View style={styles.cardTop}>
          {item.isPinned && (
            <View style={styles.pinIcon}>
              <Pin size={12} color="#f97316" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={styles.cardHeader}>
              <Text
                style={[styles.cardTitle, isRead && styles.cardTitleRead]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {!isRead && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.cardBody} numberOfLines={item.imageUrl ? 2 : 3}>
              {item.body}
            </Text>
            {item.imageUrl && (
              <TouchableOpacity onPress={() => Linking.openURL(item.imageUrl!)} activeOpacity={0.85}>
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            <View style={styles.cardFooter}>
              <Text style={styles.cardDate}>{fmtDate(item.createdAt)}</Text>
              {isAdmin && (
                <TouchableOpacity onPress={() => openEdit(item)} style={styles.editBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Pencil size={13} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Comunicados"
        right={
          isAdmin ? (
            <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
              <Plus size={18} color="#ffffff" />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <FlatList
        data={announcements}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nenhum comunicado</Text>
          </View>
        }
      />

      {/* Edit / Create Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              {/* Handle */}
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editTarget ? "Editar aviso" : "Novo aviso"}
                </Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.modalClose}
                >
                  <X size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.fieldLabel}>TÍTULO</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Ex: Manutenção na piscina"
                  placeholderTextColor="#9ca3af"
                  value={form.title}
                  onChangeText={v => setForm(f => ({ ...f, title: v }))}
                />

                <Text style={styles.fieldLabel}>TEXTO DO AVISO</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldMultiline]}
                  placeholder="Descreva o comunicado em detalhes..."
                  placeholderTextColor="#9ca3af"
                  value={form.body}
                  onChangeText={v => setForm(f => ({ ...f, body: v }))}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <Text style={styles.fieldLabel}>DATA DE INÍCIO (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Ex: 2026-06-01"
                  placeholderTextColor="#9ca3af"
                  value={form.startsAt}
                  onChangeText={v => setForm(f => ({ ...f, startsAt: v }))}
                  keyboardType="numeric"
                />

                <Text style={styles.fieldLabel}>DATA DE TÉRMINO (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Ex: 2026-06-30"
                  placeholderTextColor="#9ca3af"
                  value={form.expiresAt}
                  onChangeText={v => setForm(f => ({ ...f, expiresAt: v }))}
                  keyboardType="numeric"
                />

                <Text style={styles.fieldLabel}>DURAÇÃO EM DIAS (opcional)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Ex: 7"
                  placeholderTextColor="#9ca3af"
                  value={form.displayDurationDays}
                  onChangeText={v => setForm(f => ({ ...f, displayDurationDays: v.replace(/\D/g, "") }))}
                  keyboardType="numeric"
                />

                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>Fixar aviso</Text>
                    <Text style={styles.toggleSub}>Exibe no topo da lista</Text>
                  </View>
                  <Switch
                    value={form.isPinned}
                    onValueChange={v => setForm(f => ({ ...f, isPinned: v }))}
                    trackColor={{ false: "#d1d5db", true: "#f97316" }}
                    thumbColor="#ffffff"
                  />
                </View>

                <TouchableOpacity
                  onPress={() => {
                    if (!form.title.trim() || !form.body.trim()) {
                      return Alert.alert("Campos obrigatórios", "Preencha o título e o texto do aviso.");
                    }
                    saveMutation.mutate();
                  }}
                  disabled={saveMutation.isPending}
                  style={[styles.saveBtn, saveMutation.isPending && { opacity: 0.5 }]}
                >
                  <Text style={styles.saveBtnText}>
                    {saveMutation.isPending ? "Salvando..." : editTarget ? "Salvar alterações" : "Publicar aviso"}
                  </Text>
                </TouchableOpacity>

                <View style={{ height: 24 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f5f5" },
  loading: { flex: 1, backgroundColor: "#f5f5f5", alignItems: "center", justifyContent: "center" },
  list: { padding: 20, paddingTop: 12 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyText: { fontSize: 15, color: "#9ca3af" },
  addBtn: {
    width: 36,
    height: 36,
    backgroundColor: "#f97316",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  pinIcon: {
    width: 24,
    height: 24,
    backgroundColor: "#f9731620",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  cardTitleRead: {
    color: "#9ca3af",
    fontWeight: "500",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f97316",
    flexShrink: 0,
  },
  cardBody: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 19,
  },
  cardImage: {
    marginTop: 10,
    width: "100%",
    height: 160,
    borderRadius: 10,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  cardDate: {
    fontSize: 11,
    color: "#9ca3af",
  },
  editBtn: {
    padding: 4,
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#f5f5f5",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 32,
    maxHeight: "90%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#ffffff",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalClose: {
    width: 32,
    height: 32,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 4,
  },
  fieldInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: "#111827",
    fontSize: 14,
    marginBottom: 16,
  },
  fieldMultiline: {
    minHeight: 100,
    paddingTop: 13,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  toggleSub: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: "#f97316",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
});
