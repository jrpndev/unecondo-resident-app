import React, { useState } from "react";
import {
  View, Text, FlatList, RefreshControl, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, ScrollView, Alert, Clipboard,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Copy, Check, AlertCircle } from "lucide-react-native";
import {
  getSpaces, getMyReservations, createReservation,
  updateReservationStatus, type Space, type Reservation, type ReservationPaymentStatus,
} from "../../lib/reservations";
import { useAuthStore } from "../../store/auth";
import { ScreenHeader } from "../../components/ScreenHeader";

const STATUS_LABELS = { PENDING: "Pendente", CONFIRMED: "Confirmada", CANCELLED: "Cancelada" };
const STATUS_COLORS = { PENDING: "#f97316", CONFIRMED: "#22c55e", CANCELLED: "#ef4444" };

const PAY_LABELS: Record<ReservationPaymentStatus, string> = {
  EXEMPT: "Gratuito",
  PENDING_PAYMENT: "PIX pendente",
  PAID: "Pago",
};
const PAY_COLORS: Record<ReservationPaymentStatus, string> = {
  EXEMPT: "#22c55e",
  PENDING_PAYMENT: "#f97316",
  PAID: "#22c55e",
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

function fmtPrice(p?: number | null) {
  if (!p) return "Gratuito";
  return p.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CopyPix({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    Clipboard.setString(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <TouchableOpacity onPress={doCopy} className="flex-row items-center gap-1 mt-2 py-1">
      {copied
        ? <Check size={14} color="#22c55e" />
        : <Copy size={14} color="#f97316" />}
      <Text className={`text-xs font-semibold ${copied ? "text-green-500" : "text-orange-500"}`}>
        {copied ? "Copiado!" : "Copiar chave PIX"}
      </Text>
    </TouchableOpacity>
  );
}

export default function ReservationsScreen() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isResident = user?.role === "RESIDENT";
  const condoId = user?.condoId ?? undefined;

  const [tab, setTab] = useState<"spaces" | "mine">("spaces");
  const [reserveModal, setReserveModal] = useState<Space | null>(null);
  const [pixModal, setPixModal] = useState<Reservation | null>(null);
  const [form, setForm] = useState({ date: "", startTime: "", endTime: "", notes: "" });
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
  const [cardForm, setCardForm] = useState({ holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '' });

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
    mutationFn: () => createReservation({
      spaceId: reserveModal!.id,
      ...form,
      paymentMethod: reserveModal?.price ? paymentMethod : undefined,
      creditCard: paymentMethod === 'CREDIT_CARD' && reserveModal?.price ? cardForm : undefined,
    }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reservations-mine"] });
      setReserveModal(null);
      setForm({ date: "", startTime: "", endTime: "", notes: "" });
      setPaymentMethod('PIX');
      setCardForm({ holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '' });
      if (data.pixCopiaECola) {
        setPixModal(data);
      } else if (data.paymentStatus === 'PAID') {
        Alert.alert('Pagamento confirmado!', 'Sua reserva foi confirmada com sucesso.');
      }
    },
    onError: (e: any) => Alert.alert("Erro", e?.response?.data?.message ?? "Horário indisponível ou cartão recusado"),
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
                    <View className="flex-row items-center gap-3 mt-1">
                      {item.capacity ? (
                        <Text className="text-xs text-gray-400">Até {item.capacity} pessoas</Text>
                      ) : null}
                      <Text className={`text-xs font-semibold ${item.price ? "text-orange-500" : "text-green-600"}`}>
                        {fmtPrice(item.price)}
                      </Text>
                    </View>
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
                    {item.pixCopiaECola && item.paymentStatus === "PENDING_PAYMENT" && (
                      <TouchableOpacity
                        className="flex-row items-center gap-1 mt-1"
                        onPress={() => setPixModal(item)}
                      >
                        <AlertCircle size={12} color="#f97316" />
                        <Text className="text-xs text-orange-500 font-medium">Ver chave PIX</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View className="items-end gap-1 ml-2">
                    {item.paymentStatus && item.paymentStatus !== "EXEMPT" && (
                      <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: PAY_COLORS[item.paymentStatus] + "20" }}>
                        <Text className="text-xs font-medium" style={{ color: PAY_COLORS[item.paymentStatus] }}>
                          {PAY_LABELS[item.paymentStatus]}
                        </Text>
                      </View>
                    )}
                    <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.status] + "20" }}>
                      <Text className="text-xs font-medium" style={{ color: STATUS_COLORS[item.status] }}>
                        {STATUS_LABELS[item.status]}
                      </Text>
                    </View>
                    {item.status === "PENDING" && (
                      <TouchableOpacity onPress={() => cancel.mutate(item.id)}>
                        <Text className="text-xs text-red-500 mt-0.5">Cancelar</Text>
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

      {/* Reserve modal */}
      <Modal visible={!!reserveModal} transparent animationType="slide" onRequestClose={() => setReserveModal(null)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-gray-900 rounded-t-3xl p-6">
            <View className="mb-4">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                Reservar — {reserveModal?.name}
              </Text>
              {reserveModal?.price ? (
                <Text className="text-sm text-orange-500 font-medium mt-0.5">
                  {fmtPrice(reserveModal.price)}
                </Text>
              ) : (
                <Text className="text-sm text-green-600 mt-0.5">Gratuito</Text>
              )}
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-xs text-gray-500 mb-1">Data (AAAA-MM-DD)</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white mb-3"
                placeholder="2026-06-15"
                value={form.date}
                onChangeText={v => setForm(f => ({ ...f, date: v }))}
              />
              <View className="flex-row gap-2 mb-3">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Início (HH:MM)</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white"
                    placeholder="09:00"
                    value={form.startTime}
                    onChangeText={v => setForm(f => ({ ...f, startTime: v }))}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Fim (HH:MM)</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white"
                    placeholder="12:00"
                    value={form.endTime}
                    onChangeText={v => setForm(f => ({ ...f, endTime: v }))}
                  />
                </View>
              </View>
              <TextInput
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white mb-3"
                placeholder="Observações (opcional)"
                value={form.notes}
                onChangeText={v => setForm(f => ({ ...f, notes: v }))}
              />
              {reserveModal?.price ? (
                <View className="mb-3">
                  <Text className="text-xs text-gray-500 mb-2">Forma de pagamento</Text>
                  <View className="flex-row gap-2">
                    {(['PIX', 'CREDIT_CARD'] as const).map(m => (
                      <TouchableOpacity
                        key={m}
                        onPress={() => setPaymentMethod(m)}
                        className={`flex-1 py-2 rounded-xl border items-center ${paymentMethod === m ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}
                      >
                        <Text className={`text-xs font-semibold ${paymentMethod === m ? 'text-orange-600' : 'text-gray-500'}`}>
                          {m === 'PIX' ? 'PIX' : 'Cartão de Crédito'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}
              {paymentMethod === 'CREDIT_CARD' && reserveModal?.price ? (
                <View className="space-y-2 mb-3">
                  <Text className="text-xs text-gray-500 font-medium">Dados do cartão</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white"
                    placeholder="Nome no cartão"
                    value={cardForm.holderName}
                    onChangeText={v => setCardForm(f => ({ ...f, holderName: v }))}
                    autoCapitalize="characters"
                  />
                  <TextInput
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white"
                    placeholder="Número do cartão"
                    value={cardForm.number}
                    onChangeText={v => setCardForm(f => ({ ...f, number: v.replace(/\D/g, '').slice(0, 16) }))}
                    keyboardType="numeric"
                    maxLength={16}
                  />
                  <View className="flex-row gap-2">
                    <TextInput
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white"
                      placeholder="Mês (MM)"
                      value={cardForm.expiryMonth}
                      onChangeText={v => setCardForm(f => ({ ...f, expiryMonth: v.replace(/\D/g, '').slice(0, 2) }))}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <TextInput
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white"
                      placeholder="Ano (AAAA)"
                      value={cardForm.expiryYear}
                      onChangeText={v => setCardForm(f => ({ ...f, expiryYear: v.replace(/\D/g, '').slice(0, 4) }))}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                    <TextInput
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white"
                      placeholder="CVC"
                      value={cardForm.ccv}
                      onChangeText={v => setCardForm(f => ({ ...f, ccv: v.replace(/\D/g, '').slice(0, 4) }))}
                      keyboardType="numeric"
                      maxLength={4}
                      secureTextEntry
                    />
                  </View>
                </View>
              ) : null}
              <TouchableOpacity
                onPress={() => create.mutate()}
                disabled={
                  !form.date || !form.startTime || !form.endTime || create.isPending ||
                  (paymentMethod === 'CREDIT_CARD' && !!reserveModal?.price && (
                    !cardForm.holderName || !cardForm.number || !cardForm.expiryMonth || !cardForm.expiryYear || !cardForm.ccv
                  ))
                }
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

      {/* PIX payment modal */}
      <Modal visible={!!pixModal} transparent animationType="fade" onRequestClose={() => setPixModal(null)}>
        <View className="flex-1 bg-black/60 justify-center px-5">
          <View className="bg-white dark:bg-gray-900 rounded-3xl p-6">
            <Text className="text-lg font-bold text-gray-900 dark:text-white mb-1">Pagamento PIX</Text>
            <Text className="text-sm text-gray-500 mb-3">
              {pixModal?.space?.name} · {pixModal ? fmtDate(pixModal.date) : ""} · {pixModal?.startTime}–{pixModal?.endTime}
            </Text>
            {pixModal?.totalAmount ? (
              <Text className="text-2xl font-bold text-orange-500 mb-4">
                {fmtPrice(Number(pixModal.totalAmount))}
              </Text>
            ) : null}
            <Text className="text-xs text-gray-500 mb-1 font-medium">Chave PIX Copia e Cola</Text>
            <View className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-2">
              <Text className="text-xs font-mono text-gray-700 dark:text-gray-300" selectable>
                {pixModal?.pixCopiaECola}
              </Text>
            </View>
            {pixModal?.pixCopiaECola && <CopyPix text={pixModal.pixCopiaECola} />}
            <Text className="text-xs text-gray-400 mt-3 mb-5">
              Após o pagamento, o condomínio confirmará sua reserva. A chave PIX estará disponível em "Minhas reservas".
            </Text>
            <TouchableOpacity
              onPress={() => setPixModal(null)}
              className="bg-orange-500 rounded-xl py-3 items-center"
            >
              <Text className="text-white font-bold">Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
