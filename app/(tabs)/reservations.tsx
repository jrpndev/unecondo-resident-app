import React, { useState } from "react";
import {
  View, Text, FlatList, RefreshControl, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, ScrollView, Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Plus, X } from "lucide-react-native";
import {
  getSpaces, getMyReservations, createReservation,
  updateReservationStatus, type Space, type Reservation,
} from "../../lib/reservations";
import { useAuthStore } from "../../store/auth";
import { ScreenHeader } from "../../components/ScreenHeader";

const STATUS_LABELS = { PENDING: "Pendente", CONFIRMED: "Confirmada", CANCELLED: "Cancelada" };
const STATUS_COLORS = { PENDING: "#f97316", CONFIRMED: "#22c55e", CANCELLED: "#ef4444" };

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

export default function ReservationsScreen() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isResident = user?.role === "RESIDENT";
  const condoId = user?.condoId ?? undefined;

  const [tab, setTab] = useState<"spaces" | "mine">("spaces");
  const [reserveModal, setReserveModal] = useState<Space | null>(null);
  const [form, setForm] = useState({ date: "", startTime: "", endTime: "", notes: "" });

  const { data: spaces = [], isLoading: loadSpaces, refetch: refetchSpaces, isRefetching: refSpaces } = useQuery({
    queryKey: ["spaces", condoId],
    queryFn: () => getSpaces(condoId),
  });

  const { data: myRes = [], isLoading: loadMine, refetch: refetchMine, isRefetching: refMine } = useQuery({
    queryKey: ["reservations-mine"],
    queryFn: getMyReservations,
    enabled: tab === "mine" && isResident,
  });

  const create = useMutation({
    mutationFn: () => createReservation({ spaceId: reserveModal!.id, ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations-mine"] });
      setReserveModal(null);
      setForm({ date: "", startTime: "", endTime: "", notes: "" });
    },
    onError: (e: any) => Alert.alert("Erro", e?.response?.data?.message ?? "Horário indisponível"),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => updateReservationStatus(id, "CANCELLED"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservations-mine"] }),
  });

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScreenHeader title="Reservas" />

      <View className="flex-row border-b border-gray-200 dark:border-gray-700 px-4">
        {(["spaces", "mine"] as const).filter(t => t === "spaces" || isResident).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            className={`mr-6 pb-2 border-b-2 ${tab === t ? "border-orange-500" : "border-transparent"}`}
          >
            <Text className={`text-sm font-medium ${tab === t ? "text-orange-600" : "text-gray-500"}`}>
              {t === "spaces" ? "Espaços" : "Minhas reservas"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "spaces" && (
        loadSpaces ? (
          <View className="flex-1 items-center justify-center"><ActivityIndicator color="#f97316" /></View>
        ) : (
          <FlatList
            data={spaces}
            keyExtractor={s => s.id}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={refSpaces} onRefresh={refetchSpaces} tintColor="#f97316" />}
            renderItem={({ item }) => (
              <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 shadow-sm">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1 mr-3">
                    <Text className="font-semibold text-gray-900 dark:text-white">{item.name}</Text>
                    {item.description && <Text className="text-sm text-gray-500 mt-0.5">{item.description}</Text>}
                    {item.capacity && <Text className="text-xs text-gray-400 mt-1">Capacidade: {item.capacity} pessoas</Text>}
                    {item.rules && <Text className="text-xs text-gray-400 italic mt-1">{item.rules}</Text>}
                  </View>
                </View>
                {isResident && (
                  <TouchableOpacity
                    onPress={() => setReserveModal(item)}
                    className="bg-orange-500 rounded-xl py-2 flex-row items-center justify-center gap-2 active:opacity-80"
                  >
                    <CalendarCheck size={16} color="#fff" />
                    <Text className="text-white font-semibold text-sm">Reservar</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            ListEmptyComponent={<Text className="text-center text-gray-400 py-20">Nenhum espaço disponível</Text>}
          />
        )
      )}

      {tab === "mine" && (
        loadMine ? (
          <View className="flex-1 items-center justify-center"><ActivityIndicator color="#f97316" /></View>
        ) : (
          <FlatList
            data={myRes}
            keyExtractor={r => r.id}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={refMine} onRefresh={refetchMine} tintColor="#f97316" />}
            renderItem={({ item }) => (
              <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 shadow-sm">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900 dark:text-white">{item.space?.name}</Text>
                    <Text className="text-sm text-gray-500 mt-0.5">{fmtDate(item.date)} · {item.startTime} – {item.endTime}</Text>
                    {item.notes && <Text className="text-xs text-gray-400 italic mt-1">{item.notes}</Text>}
                  </View>
                  <View className="items-end gap-1">
                    <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.status] + "20" }}>
                      <Text className="text-xs font-medium" style={{ color: STATUS_COLORS[item.status] }}>
                        {STATUS_LABELS[item.status]}
                      </Text>
                    </View>
                    {item.status === "PENDING" && (
                      <TouchableOpacity onPress={() => cancel.mutate(item.id)}>
                        <Text className="text-xs text-red-500">Cancelar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text className="text-center text-gray-400 py-20">Nenhuma reserva</Text>}
          />
        )
      )}

      <Modal visible={!!reserveModal} transparent animationType="slide" onRequestClose={() => setReserveModal(null)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-gray-900 rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">Reservar — {reserveModal?.name}</Text>
              <TouchableOpacity onPress={() => setReserveModal(null)}>
                <X size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-xs text-gray-500 mb-1">Data</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white mb-3"
                placeholder="AAAA-MM-DD"
                value={form.date}
                onChangeText={v => setForm(f => ({ ...f, date: v }))}
              />
              <View className="flex-row gap-2 mb-3">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Início</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white"
                    placeholder="HH:MM"
                    value={form.startTime}
                    onChangeText={v => setForm(f => ({ ...f, startTime: v }))}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Fim</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white"
                    placeholder="HH:MM"
                    value={form.endTime}
                    onChangeText={v => setForm(f => ({ ...f, endTime: v }))}
                  />
                </View>
              </View>
              <TextInput
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white mb-4"
                placeholder="Observações (opcional)"
                value={form.notes}
                onChangeText={v => setForm(f => ({ ...f, notes: v }))}
              />
              <TouchableOpacity
                onPress={() => create.mutate()}
                disabled={!form.date || !form.startTime || !form.endTime || create.isPending}
                className="bg-orange-500 rounded-xl py-3 items-center active:opacity-80 disabled:opacity-50"
              >
                <Text className="text-white font-semibold">
                  {create.isPending ? "Solicitando..." : "Solicitar reserva"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
