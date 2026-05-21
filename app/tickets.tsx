import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, AlertCircle, Plus, Send, X } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { getTickets, createTicket, addTicketMessage, Ticket } from "../lib/tickets";

const STATUS_LABELS: Record<string, string> = { OPEN: "Aberto", IN_PROGRESS: "Em andamento", RESOLVED: "Resolvido", CLOSED: "Fechado" };
const STATUS_COLORS: Record<string, string> = { OPEN: "#eab308", IN_PROGRESS: "#3b82f6", RESOLVED: "#22c55e", CLOSED: "#6b7280" };
const PRIORITY_LABELS: Record<string, string> = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta" };
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
    if (!form.title || !form.description) return Toast.show({ type: "error", text1: "Preencha todos os campos" });
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
    <View className="flex-1 bg-gray-950" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-4 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1.5 rounded-xl bg-gray-800 active:opacity-70">
          <ArrowLeft size={18} color="white" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white text-lg font-bold">Ocorrências</Text>
          <Text className="text-gray-400 text-xs">Seus chamados e solicitações</Text>
        </View>
        <TouchableOpacity onPress={() => setCreateModal(true)} className="p-2 bg-primary-500 rounded-xl active:opacity-70">
          <Plus size={18} color="white" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#f97316" /></View>
      ) : tickets.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <AlertCircle size={48} color="#374151" />
          <Text className="text-gray-500 text-base font-semibold mt-4 text-center">Nenhuma ocorrência</Text>
          <Text className="text-gray-600 text-sm mt-1 text-center">Abra uma solicitação usando o botão +</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 10 }}>
          {tickets.map(t => (
            <TouchableOpacity key={t.id} onPress={() => setSelected(t)} activeOpacity={0.75}
              className="bg-gray-900 rounded-2xl border border-gray-800 p-4 active:border-primary-800">
              <View className="flex-row items-center gap-2 mb-2">
                <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[t.status] + "22" }}>
                  <Text style={{ color: STATUS_COLORS[t.status], fontSize: 10, fontWeight: "700" }}>{STATUS_LABELS[t.status]}</Text>
                </View>
                <Text className="text-gray-500 text-xs">{t.category}</Text>
              </View>
              <Text className="text-white text-sm font-semibold">{t.title}</Text>
              <Text className="text-gray-400 text-xs mt-1" numberOfLines={1}>{t.description}</Text>
              <View className="flex-row justify-between mt-2">
                <Text className="text-gray-600 text-xs">{new Date(t.createdAt).toLocaleDateString("pt-BR")}</Text>
                <Text className="text-gray-600 text-xs">{t.messages.length} mensagens</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Create Modal */}
      <Modal visible={createModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
          <View className="flex-1 justify-end">
            <View className="absolute inset-0 bg-black/60" />
            <View className="bg-gray-900 rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 16 }}>
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-white text-lg font-bold">Nova ocorrência</Text>
                <TouchableOpacity onPress={() => setCreateModal(false)} className="p-1.5 bg-gray-800 rounded-xl">
                  <X size={16} color="white" />
                </TouchableOpacity>
              </View>
              <Text className="text-gray-400 text-xs font-bold mb-1.5">TÍTULO</Text>
              <TextInput value={form.title} onChangeText={t => setForm(f => ({ ...f, title: t }))}
                placeholder="Ex: Vazamento na garagem"
                placeholderTextColor="#6b7280"
                className="bg-gray-800 text-white rounded-xl px-4 py-3 text-sm mb-4 border border-gray-700" />
              <Text className="text-gray-400 text-xs font-bold mb-1.5">DESCRIÇÃO</Text>
              <TextInput value={form.description} onChangeText={t => setForm(f => ({ ...f, description: t }))}
                placeholder="Descreva o problema em detalhes"
                placeholderTextColor="#6b7280" multiline numberOfLines={3}
                className="bg-gray-800 text-white rounded-xl px-4 py-3 text-sm mb-4 border border-gray-700"
                style={{ textAlignVertical: "top", minHeight: 72 }} />
              <View className="flex-row gap-3 mb-5">
                <View className="flex-1">
                  <Text className="text-gray-400 text-xs font-bold mb-1.5">CATEGORIA</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      {CATEGORIES.map(c => (
                        <TouchableOpacity key={c} onPress={() => setForm(f => ({ ...f, category: c }))}
                          className={`px-3 py-1.5 rounded-xl ${form.category === c ? "bg-primary-500" : "bg-gray-800 border border-gray-700"}`}>
                          <Text className={`text-xs font-semibold ${form.category === c ? "text-white" : "text-gray-400"}`}>{c}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
              <TouchableOpacity onPress={handleCreate} disabled={saving} activeOpacity={0.8}
                className="bg-primary-500 rounded-2xl py-3.5 items-center">
                <Text className="text-white font-bold">{saving ? "Abrindo..." : "Abrir ocorrência"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Ticket detail modal */}
      <Modal visible={!!selected} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
          <View className="flex-1 bg-gray-950" style={{ paddingTop: insets.top }}>
            <View className="flex-row items-center px-4 py-4 border-b border-gray-800">
              <TouchableOpacity onPress={() => setSelected(null)} className="mr-3 p-1.5 rounded-xl bg-gray-800 active:opacity-70">
                <ArrowLeft size={18} color="white" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-white font-bold text-sm" numberOfLines={1}>{selected?.title}</Text>
                {selected && (
                  <View className="flex-row items-center gap-1 mt-0.5">
                    <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[selected.status] + "22" }}>
                      <Text style={{ color: STATUS_COLORS[selected.status], fontSize: 10, fontWeight: "700" }}>{STATUS_LABELS[selected.status]}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {selected && (
              <>
                <View className="bg-gray-900 mx-4 mt-3 rounded-xl p-3 border border-gray-800">
                  <Text className="text-gray-300 text-sm">{selected.description}</Text>
                </View>

                <ScrollView ref={scrollRef} className="flex-1 px-4 mt-3" contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
                  {selected.messages.map(msg => (
                    <View key={msg.id} className={`flex-row ${msg.isAdmin ? "justify-start" : "justify-end"}`}>
                      <View className={`max-w-[80%] rounded-2xl px-3 py-2 ${msg.isAdmin ? "bg-gray-800 rounded-tl-sm" : "bg-primary-600 rounded-tr-sm"}`}>
                        {msg.isAdmin && <Text className="text-primary-400 text-[10px] font-bold mb-1">Administração</Text>}
                        <Text className="text-white text-sm">{msg.body}</Text>
                        <Text className="text-gray-500 text-[10px] mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {selected.messages.length === 0 && (
                    <Text className="text-gray-600 text-xs text-center py-4">Sem mensagens ainda</Text>
                  )}
                </ScrollView>

                {selected.status !== "CLOSED" && selected.status !== "RESOLVED" && (
                  <View className="px-4 pb-4 flex-row gap-2" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
                    <TextInput value={message} onChangeText={setMessage}
                      placeholder="Mensagem..."
                      placeholderTextColor="#6b7280"
                      className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm" />
                    <TouchableOpacity onPress={handleSend} disabled={!message.trim()}
                      className="w-11 h-11 bg-primary-500 rounded-xl items-center justify-center active:opacity-70">
                      <Send size={18} color="white" />
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
