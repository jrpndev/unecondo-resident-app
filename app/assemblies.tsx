import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Vote, X, Check, Minus } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { getAssemblies, castVote, Assembly } from "../lib/assemblies";
import { useAuthStore } from "../store/auth";

const STATUS_LABELS: Record<string, string> = { DRAFT: "Rascunho", OPEN: "Aberta para votação", CLOSED: "Encerrada" };
const STATUS_COLORS: Record<string, string> = { DRAFT: "#6b7280", OPEN: "#22c55e", CLOSED: "#3b82f6" };

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
    const resident = (user as any).resident;
    const unitId = resident?.unitId ?? "";
    if (!unitId) return Toast.show({ type: "error", text1: "Sem unidade associada" });

    setVoting(true);
    try {
      await castVote(itemId, choice, unitId);
      await load();
      const updated = assemblies.find(a => a.agendaItems.some(i => i.id === itemId));
      if (updated) {
        const fresh = await getAssemblies();
        setAssemblies(fresh);
        setSelected(fresh.find(a => a.id === updated.id) ?? null);
      }
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
    <View className="flex-1 bg-gray-950" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-4 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1.5 rounded-xl bg-gray-800 active:opacity-70">
          <ArrowLeft size={18} color="white" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white text-lg font-bold">Assembleias</Text>
          <Text className="text-gray-400 text-xs">Votações e assembleias virtuais</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#f97316" /></View>
      ) : assemblies.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Vote size={48} color="#374151" />
          <Text className="text-gray-500 text-base font-semibold mt-4">Nenhuma assembleia</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 10 }}>
          {assemblies.map(a => (
            <TouchableOpacity key={a.id} onPress={() => setSelected(a)} activeOpacity={0.75}
              className="bg-gray-900 rounded-2xl border border-gray-800 p-4 active:border-primary-800">
              <View className="flex-row items-center gap-2 mb-2">
                <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[a.status] + "22" }}>
                  <Text style={{ color: STATUS_COLORS[a.status], fontSize: 10, fontWeight: "700" }}>{STATUS_LABELS[a.status]}</Text>
                </View>
                <Text className="text-gray-500 text-xs">{a.agendaItems.length} pautas</Text>
              </View>
              <Text className="text-white text-sm font-bold">{a.title}</Text>
              <Text className="text-gray-400 text-xs mt-1">
                {new Date(a.scheduledAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Detail modal */}
      <Modal visible={!!selected} transparent animationType="slide">
        <View className="flex-1 bg-gray-950" style={{ paddingTop: insets.top }}>
          <View className="flex-row items-center px-4 py-4 border-b border-gray-800">
            <TouchableOpacity onPress={() => setSelected(null)} className="mr-3 p-1.5 rounded-xl bg-gray-800 active:opacity-70">
              <ArrowLeft size={18} color="white" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-white font-bold text-base" numberOfLines={1}>{selected?.title}</Text>
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
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12 }}>
              <View className="bg-gray-900 rounded-xl p-3 border border-gray-800">
                <Text className="text-gray-400 text-xs">
                  📅 {new Date(selected.scheduledAt).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}
                </Text>
                {selected.description && <Text className="text-gray-300 text-sm mt-2">{selected.description}</Text>}
              </View>

              {selected.agendaItems.map((item, i) => {
                const s = voteSummary(item.votes);
                const canVote = selected.status === "OPEN" && !s.myVote;
                return (
                  <View key={item.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
                    <Text className="text-gray-500 text-xs font-bold mb-1">PAUTA {i + 1}</Text>
                    <Text className="text-white text-sm font-semibold mb-3">{item.title}</Text>
                    {item.description && <Text className="text-gray-400 text-xs mb-3">{item.description}</Text>}

                    {/* Vote results bar */}
                    {s.total > 0 && (
                      <View className="mb-3">
                        <View className="flex-row rounded-full overflow-hidden h-2 bg-gray-800">
                          <View style={{ flex: s.yes, backgroundColor: "#22c55e" }} />
                          <View style={{ flex: s.no, backgroundColor: "#ef4444" }} />
                          <View style={{ flex: s.abs, backgroundColor: "#6b7280" }} />
                        </View>
                        <View className="flex-row justify-between mt-1.5">
                          <Text className="text-green-400 text-xs font-semibold">✓ {s.yes}</Text>
                          <Text className="text-red-400 text-xs font-semibold">✗ {s.no}</Text>
                          <Text className="text-gray-500 text-xs">— {s.abs}</Text>
                          <Text className="text-gray-500 text-xs">{s.total} votos</Text>
                        </View>
                      </View>
                    )}

                    {s.myVote && (
                      <View className="bg-primary-900/20 border border-primary-800/30 rounded-xl p-2.5 flex-row items-center gap-2">
                        <Check size={14} color="#f97316" />
                        <Text className="text-primary-400 text-xs font-semibold">
                          Seu voto: {s.myVote === "YES" ? "Sim" : s.myVote === "NO" ? "Não" : "Abstenção"}
                        </Text>
                      </View>
                    )}

                    {canVote && (
                      <View className="flex-row gap-2 mt-1">
                        {(["YES", "NO", "ABSTAIN"] as const).map(choice => (
                          <TouchableOpacity key={choice} onPress={() => handleVote(item.id, choice)} disabled={voting}
                            activeOpacity={0.75}
                            className={`flex-1 py-2.5 rounded-xl items-center ${choice === "YES" ? "bg-green-600" : choice === "NO" ? "bg-red-600" : "bg-gray-700"}`}>
                            <Text className="text-white text-xs font-bold">
                              {choice === "YES" ? "Sim" : choice === "NO" ? "Não" : "Abstenção"}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {selected.status === "DRAFT" && (
                      <Text className="text-gray-600 text-xs text-center mt-1">Votação ainda não aberta</Text>
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
