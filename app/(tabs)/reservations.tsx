import React, { useState, useMemo } from "react";
import {
  View, Text, FlatList, RefreshControl, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, ScrollView, Alert, Clipboard, StyleSheet,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Copy, Check, AlertCircle, ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react-native";
import {
  getSpaces, getMyReservations, createReservation, getReservedDates,
  updateReservationStatus, rescheduleReservation,
  type Space, type Reservation, type ReservationPaymentStatus,
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

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

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
    <TouchableOpacity onPress={doCopy} style={styles.copyRow}>
      {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} color="#f97316" />}
      <Text style={[styles.copyText, copied && { color: "#22c55e" }]}>
        {copied ? "Copiado!" : "Copiar chave PIX"}
      </Text>
    </TouchableOpacity>
  );
}

function CalendarPicker({
  selected, onSelect, reservedDates, viewYear, viewMonth, onMonthChange,
}: {
  selected: string;
  onSelect: (date: string) => void;
  reservedDates: string[];
  viewYear: number;
  viewMonth: number;
  onMonthChange: (year: number, month: number) => void;
}) {
  const today = new Date();
  const reserved = useMemo(() => new Set(reservedDates), [reservedDates]);
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonth = () => viewMonth === 0 ? onMonthChange(viewYear - 1, 11) : onMonthChange(viewYear, viewMonth - 1);
  const nextMonth = () => viewMonth === 11 ? onMonthChange(viewYear + 1, 0) : onMonthChange(viewYear, viewMonth + 1);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={styles.calendar}>
      <View style={styles.calHeader}>
        <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
          <ChevronLeft size={18} color="#9a9a9a" />
        </TouchableOpacity>
        <Text style={styles.calMonth}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
          <ChevronRight size={18} color="#9a9a9a" />
        </TouchableOpacity>
      </View>
      <View style={styles.calWeekdays}>
        {WEEKDAYS.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.calWeekday}>{d}</Text>
          </View>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={{ flexDirection: "row" }}>
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (!day) return <View key={col} style={{ flex: 1, aspectRatio: 1 }} />;
            const mm = String(viewMonth + 1).padStart(2, "0");
            const dd = String(day).padStart(2, "0");
            const dateStr = `${viewYear}-${mm}-${dd}`;
            const isReserved = reserved.has(dateStr);
            const isPast = new Date(dateStr) < new Date(today.toISOString().slice(0, 10));
            const isSelected = selected === dateStr;
            const disabled = isReserved || isPast;
            return (
              <TouchableOpacity
                key={col}
                onPress={() => !disabled && onSelect(dateStr)}
                disabled={disabled}
                style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 4 }}
              >
                <View style={[
                  styles.calDay,
                  isSelected && styles.calDaySelected,
                  isReserved && styles.calDayReserved,
                ]}>
                  <Text style={[
                    styles.calDayText,
                    isSelected && { color: "#ffffff" },
                    isReserved && { color: "#f87171" },
                    isPast && { color: "#3a3a3a" },
                  ]}>{day}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      <View style={styles.calLegend}>
        <View style={styles.calLegendItem}>
          <View style={[styles.calLegendDot, { backgroundColor: "#f97316" }]} />
          <Text style={styles.calLegendText}>Selecionado</Text>
        </View>
        <View style={styles.calLegendItem}>
          <View style={[styles.calLegendDot, { backgroundColor: "#ef444430" }]} />
          <Text style={styles.calLegendText}>Ocupado</Text>
        </View>
      </View>
    </View>
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
  const [rescheduleTarget, setRescheduleTarget] = useState<Reservation | null>(null);
  const [form, setForm] = useState({ date: "", startTime: "", endTime: "", notes: "" });
  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CREDIT_CARD">("PIX");
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardNumberDisplay, setCardNumberDisplay] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCcv, setCardCcv] = useState("");

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const { data: spaces = [], isLoading: loadSpaces, refetch: refetchSpaces, isRefetching: refSpaces } = useQuery({
    queryKey: ["spaces", condoId],
    queryFn: () => getSpaces(condoId),
  });

  const { data: myRes = [], isLoading: loadMine, refetch: refetchMine, isRefetching: refMine } = useQuery({
    queryKey: ["reservations-mine"],
    queryFn: getMyReservations,
    enabled: tab === "mine" && isResident,
  });

  const activeSpaceId = rescheduleTarget?.spaceId ?? reserveModal?.id;

  const { data: reservedDates = [] } = useQuery({
    queryKey: ["reserved-dates", activeSpaceId, calYear, calMonth],
    queryFn: () => getReservedDates(activeSpaceId!, calYear, calMonth + 1),
    enabled: !!activeSpaceId,
  });

  const create = useMutation({
    mutationFn: () => createReservation({
      spaceId: reserveModal!.id,
      ...form,
      paymentMethod: reserveModal?.price ? paymentMethod : undefined,
      creditCard: paymentMethod === "CREDIT_CARD" && reserveModal?.price ? {
        holderName: cardHolderName,
        number: cardNumberDisplay.replace(/\s/g, ""),
        expiryMonth: cardExpiry.split("/")[0] ?? "",
        expiryYear: cardExpiry.split("/")[1] ? "20" + cardExpiry.split("/")[1] : "",
        ccv: cardCcv,
      } : undefined,
    }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reservations-mine"] });
      qc.invalidateQueries({ queryKey: ["reserved-dates", reserveModal?.id] });
      setReserveModal(null);
      setForm({ date: "", startTime: "", endTime: "", notes: "" });
      setPaymentMethod("PIX");
      setCardHolderName(""); setCardNumberDisplay(""); setCardExpiry(""); setCardCcv("");
      if (data.pixCopiaECola) setPixModal(data);
      else if (data.paymentStatus === "PAID") Alert.alert("Pagamento confirmado!", "Sua reserva foi confirmada com sucesso.");
    },
    onError: (e: any) => Alert.alert("Erro", e?.response?.data?.message ?? "Horário indisponível ou cartão recusado"),
  });

  const reschedule = useMutation({
    mutationFn: () => rescheduleReservation(rescheduleTarget!.id, {
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      notes: form.notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations-mine"] });
      qc.invalidateQueries({ queryKey: ["reserved-dates", rescheduleTarget?.spaceId] });
      setRescheduleTarget(null);
      setForm({ date: "", startTime: "", endTime: "", notes: "" });
      Alert.alert("Reagendado!", "Sua reserva foi reagendada com sucesso.");
    },
    onError: (e: any) => Alert.alert("Erro", e?.response?.data?.message ?? "Não foi possível reagendar"),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => updateReservationStatus(id, "CANCELLED"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservations-mine"] }),
  });

  const handleDateSelect = (dateStr: string) => {
    setForm(f => ({ ...f, date: dateStr }));
    const [y, , m0] = dateStr.split("-").map(Number);
    setCalYear(y);
    setCalMonth(m0 - 1);
  };

  const handleCalMonthChange = (year: number, month: number) => {
    setCalYear(year);
    setCalMonth(month);
  };

  const openReschedule = (item: Reservation) => {
    setRescheduleTarget(item);
    setForm({ date: item.date, startTime: item.startTime, endTime: item.endTime, notes: item.notes ?? "" });
    const [y, m] = item.date.split("-").map(Number);
    setCalYear(y);
    setCalMonth(m - 1);
  };

  const isBookingActive = !!reserveModal || !!rescheduleTarget;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Reservas" />

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(["spaces", "mine"] as const).filter(t => t === "spaces" || isResident).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabItem, tab === t && styles.tabItemActive]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "spaces" ? "Espaços" : "Minhas reservas"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "spaces" && (
        loadSpaces ? (
          <View style={styles.loader}><ActivityIndicator color="#f97316" /></View>
        ) : (
          <FlatList
            data={spaces}
            keyExtractor={s => s.id}
            contentContainerStyle={styles.listPad}
            refreshControl={<RefreshControl refreshing={refSpaces} onRefresh={refetchSpaces} tintColor="#f97316" />}
            renderItem={({ item }) => (
              <View style={styles.spaceCard}>
                <Text style={styles.spaceName}>{item.name}</Text>
                {item.description && <Text style={styles.spaceDesc}>{item.description}</Text>}
                <View style={styles.spaceMeta}>
                  {item.capacity ? <Text style={styles.spaceMetaText}>Até {item.capacity} pessoas</Text> : null}
                  <Text style={[styles.spaceMetaText, { color: item.price ? "#f97316" : "#22c55e", fontWeight: "700" }]}>
                    {fmtPrice(item.price)}
                  </Text>
                </View>
                {item.rules && <Text style={styles.spaceRules}>{item.rules}</Text>}
                {isResident && (
                  <TouchableOpacity
                    onPress={() => {
                      setReserveModal(item);
                      setCalYear(today.getFullYear());
                      setCalMonth(today.getMonth());
                    }}
                    style={styles.reserveBtn}
                  >
                    <CalendarCheck size={16} color="#ffffff" />
                    <Text style={styles.reserveBtnText}>Reservar</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>Nenhum espaço disponível</Text>}
          />
        )
      )}

      {tab === "mine" && (
        loadMine ? (
          <View style={styles.loader}><ActivityIndicator color="#f97316" /></View>
        ) : (
          <FlatList
            data={myRes}
            keyExtractor={r => r.id}
            contentContainerStyle={styles.listPad}
            refreshControl={<RefreshControl refreshing={refMine} onRefresh={refetchMine} tintColor="#f97316" />}
            renderItem={({ item }) => (
              <View style={styles.resCard}>
                <View style={styles.resCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resSpace}>{item.space?.name}</Text>
                    <Text style={styles.resDatetime}>{fmtDate(item.date)} · {item.startTime} – {item.endTime}</Text>
                    {item.notes && <Text style={styles.resNotes}>{item.notes}</Text>}
                    {item.pixCopiaECola && item.paymentStatus === "PENDING_PAYMENT" && (
                      <TouchableOpacity style={styles.pixAlert} onPress={() => setPixModal(item)}>
                        <AlertCircle size={12} color="#f97316" />
                        <Text style={styles.pixAlertText}>Ver chave PIX</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 5 }}>
                    {item.paymentStatus && item.paymentStatus !== "EXEMPT" && (
                      <View style={[styles.statusBadge, { backgroundColor: PAY_COLORS[item.paymentStatus] + "20" }]}>
                        <Text style={[styles.statusBadgeText, { color: PAY_COLORS[item.paymentStatus] }]}>
                          {PAY_LABELS[item.paymentStatus]}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + "20" }]}>
                      <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[item.status] }]}>
                        {STATUS_LABELS[item.status]}
                      </Text>
                    </View>
                  </View>
                </View>
                {(item.status === "PENDING" || item.status === "CONFIRMED") && (
                  <View style={styles.resActions}>
                    <TouchableOpacity
                      onPress={() => openReschedule(item)}
                      style={styles.rescheduleBtn}
                    >
                      <RotateCcw size={12} color="#f97316" />
                      <Text style={styles.rescheduleBtnText}>Reagendar</Text>
                    </TouchableOpacity>
                    {item.status === "PENDING" && (
                      <TouchableOpacity onPress={() => cancel.mutate(item.id)} style={styles.cancelBtn}>
                        <Text style={styles.cancelBtnText}>Cancelar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>Nenhuma reserva</Text>}
          />
        )
      )}

      {/* Reserve / Reschedule modal */}
      <Modal visible={isBookingActive} transparent animationType="slide" onRequestClose={() => { setReserveModal(null); setRescheduleTarget(null); }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {rescheduleTarget ? `Reagendar — ${rescheduleTarget.space?.name}` : `Reservar — ${reserveModal?.name}`}
                </Text>
                {!rescheduleTarget && reserveModal?.price ? (
                  <Text style={styles.modalPrice}>{fmtPrice(reserveModal.price)}</Text>
                ) : !rescheduleTarget ? (
                  <Text style={{ color: "#22c55e", fontSize: 13, marginTop: 2 }}>Gratuito</Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => { setReserveModal(null); setRescheduleTarget(null); }}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#9a9a9a" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>SELECIONE A DATA</Text>
              <CalendarPicker
                selected={form.date}
                onSelect={handleDateSelect}
                reservedDates={reservedDates}
                viewYear={calYear}
                viewMonth={calMonth}
                onMonthChange={handleCalMonthChange}
              />
              {form.date ? (
                <Text style={styles.selectedDateText}>Data: {fmtDate(form.date)}</Text>
              ) : null}

              <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>INÍCIO (HH:MM)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="09:00"
                    placeholderTextColor="#535353"
                    value={form.startTime}
                    onChangeText={v => {
                      const d = v.replace(/\D/g, "").slice(0, 4);
                      setForm(f => ({ ...f, startTime: d.length <= 2 ? d : d.slice(0, 2) + ":" + d.slice(2) }));
                    }}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>FIM (HH:MM)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="12:00"
                    placeholderTextColor="#535353"
                    value={form.endTime}
                    onChangeText={v => {
                      const d = v.replace(/\D/g, "").slice(0, 4);
                      setForm(f => ({ ...f, endTime: d.length <= 2 ? d : d.slice(0, 2) + ":" + d.slice(2) }));
                    }}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
              </View>

              <TextInput
                style={[styles.fieldInput, { marginBottom: 16 }]}
                placeholder="Observações (opcional)"
                placeholderTextColor="#535353"
                value={form.notes}
                onChangeText={v => setForm(f => ({ ...f, notes: v }))}
              />

              {/* Payment (only for new reservations with price) */}
              {!rescheduleTarget && reserveModal?.price ? (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.fieldLabel}>FORMA DE PAGAMENTO</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {(["PIX", "CREDIT_CARD"] as const).map(m => (
                      <TouchableOpacity
                        key={m}
                        onPress={() => setPaymentMethod(m)}
                        style={[
                          styles.payMethodBtn,
                          paymentMethod === m && styles.payMethodBtnActive,
                        ]}
                      >
                        <Text style={[styles.payMethodText, paymentMethod === m && { color: "#f97316" }]}>
                          {m === "PIX" ? "PIX" : "Cartão de Crédito"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}

              {!rescheduleTarget && paymentMethod === "CREDIT_CARD" && reserveModal?.price ? (
                <View style={{ gap: 12, marginBottom: 16 }}>
                  <Text style={styles.fieldLabel}>DADOS DO CARTÃO</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="NOME NO CARTÃO"
                    placeholderTextColor="#535353"
                    value={cardHolderName}
                    onChangeText={setCardHolderName}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="0000 0000 0000 0000"
                    placeholderTextColor="#535353"
                    value={cardNumberDisplay}
                    onChangeText={v => setCardNumberDisplay(v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim())}
                    keyboardType="numeric"
                    maxLength={19}
                  />
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <TextInput
                      style={[styles.fieldInput, { flex: 1 }]}
                      placeholder="MM/AA"
                      placeholderTextColor="#535353"
                      value={cardExpiry}
                      onChangeText={v => {
                        const digits = v.replace(/\D/g, "").slice(0, 4);
                        setCardExpiry(digits.length <= 2 ? digits : digits.slice(0, 2) + "/" + digits.slice(2));
                      }}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                    <TextInput
                      style={[styles.fieldInput, { flex: 1 }]}
                      placeholder="CVC"
                      placeholderTextColor="#535353"
                      value={cardCcv}
                      onChangeText={v => setCardCcv(v.replace(/\D/g, "").slice(0, 4))}
                      keyboardType="numeric"
                      maxLength={4}
                      secureTextEntry
                    />
                  </View>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={() => rescheduleTarget ? reschedule.mutate() : create.mutate()}
                disabled={
                  !form.date || !form.startTime || !form.endTime ||
                  create.isPending || reschedule.isPending
                }
                style={[
                  styles.confirmBtn,
                  (!form.date || !form.startTime || !form.endTime) && { opacity: 0.4 },
                ]}
              >
                <Text style={styles.confirmBtnText}>
                  {create.isPending || reschedule.isPending
                    ? "Processando..."
                    : rescheduleTarget ? "Confirmar reagendamento" : "Solicitar reserva"}
                </Text>
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PIX modal */}
      <Modal visible={!!pixModal} transparent animationType="fade" onRequestClose={() => setPixModal(null)}>
        <View style={styles.pixModalBackdrop}>
          <View style={styles.pixModalCard}>
            <Text style={styles.pixTitle}>Pagamento PIX</Text>
            <Text style={styles.pixSub}>
              {pixModal?.space?.name} · {pixModal ? fmtDate(pixModal.date) : ""} · {pixModal?.startTime}–{pixModal?.endTime}
            </Text>
            {pixModal?.totalAmount ? (
              <Text style={styles.pixAmount}>{fmtPrice(Number(pixModal.totalAmount))}</Text>
            ) : null}
            <Text style={styles.fieldLabel}>CHAVE PIX COPIA E COLA</Text>
            <View style={styles.pixKeyBox}>
              <Text style={styles.pixKeyText} selectable>{pixModal?.pixCopiaECola}</Text>
            </View>
            {pixModal?.pixCopiaECola && <CopyPix text={pixModal.pixCopiaECola} />}
            <Text style={styles.pixInfo}>
              Após o pagamento, o condomínio confirmará sua reserva.
            </Text>
            <TouchableOpacity onPress={() => setPixModal(null)} style={styles.confirmBtn}>
              <Text style={styles.confirmBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#111111" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#111111",
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
    paddingHorizontal: 20,
  },
  tabItem: {
    paddingVertical: 14,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: "#f97316",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#535353",
  },
  tabTextActive: {
    color: "#f97316",
    fontWeight: "700",
  },
  listPad: { padding: 20 },
  spaceCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 16,
    marginBottom: 12,
  },
  spaceName: { fontSize: 16, fontWeight: "700", color: "#ffffff" },
  spaceDesc: { fontSize: 13, color: "#9a9a9a", marginTop: 3 },
  spaceMeta: { flexDirection: "row", gap: 14, marginTop: 6 },
  spaceMetaText: { fontSize: 12, color: "#9a9a9a" },
  spaceRules: { fontSize: 11, color: "#535353", fontStyle: "italic", marginTop: 4 },
  reserveBtn: {
    backgroundColor: "#f97316",
    borderRadius: 999,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  reserveBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  resCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 16,
    marginBottom: 12,
  },
  resCardTop: { flexDirection: "row", alignItems: "flex-start" },
  resSpace: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
  resDatetime: { fontSize: 13, color: "#9a9a9a", marginTop: 2 },
  resNotes: { fontSize: 11, color: "#535353", fontStyle: "italic", marginTop: 2 },
  pixAlert: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  pixAlertText: { fontSize: 12, color: "#f97316", fontWeight: "600" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  resActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  rescheduleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f9731618",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rescheduleBtnText: { fontSize: 12, fontWeight: "700", color: "#f97316" },
  cancelBtn: {
    backgroundColor: "#ef444415",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelBtnText: { fontSize: 12, fontWeight: "600", color: "#f87171" },
  empty: { textAlign: "center", color: "#535353", paddingTop: 60, fontSize: 14 },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: "92%",
  },
  modalHandle: {
    width: 36, height: 4, backgroundColor: "#2a2a2a",
    borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row", alignItems: "flex-start",
    justifyContent: "space-between", marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#ffffff" },
  modalPrice: { fontSize: 14, color: "#f97316", fontWeight: "600", marginTop: 2 },
  modalCloseBtn: {
    width: 32, height: 32, backgroundColor: "#242424",
    borderRadius: 16, alignItems: "center", justifyContent: "center",
  },
  calendar: {
    backgroundColor: "#242424",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  calHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  calNavBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  calMonth: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
  calWeekdays: { flexDirection: "row", marginBottom: 4 },
  calWeekday: { fontSize: 11, color: "#535353", fontWeight: "600", textAlign: "center" },
  calDay: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  calDaySelected: { backgroundColor: "#f97316" },
  calDayReserved: { backgroundColor: "#ef444422" },
  calDayText: { fontSize: 13, fontWeight: "500", color: "#ffffff" },
  calLegend: { flexDirection: "row", gap: 16, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#2a2a2a" },
  calLegendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  calLegendDot: { width: 10, height: 10, borderRadius: 5 },
  calLegendText: { fontSize: 11, color: "#535353" },
  selectedDateText: { fontSize: 12, color: "#f97316", fontWeight: "600", marginBottom: 12 },
  fieldLabel: {
    fontSize: 10, fontWeight: "700", color: "#535353",
    letterSpacing: 1.2, marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: "#242424",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#ffffff",
    fontSize: 14,
  },
  payMethodBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: "#2a2a2a",
    alignItems: "center", backgroundColor: "#242424",
  },
  payMethodBtnActive: { borderColor: "#f97316", backgroundColor: "#f9731610" },
  payMethodText: { fontSize: 12, fontWeight: "700", color: "#535353" },
  confirmBtn: {
    backgroundColor: "#f97316",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  confirmBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  // PIX modal
  pixModalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center", paddingHorizontal: 20,
  },
  pixModalCard: {
    backgroundColor: "#1a1a1a", borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: "#2a2a2a",
  },
  pixTitle: { fontSize: 18, fontWeight: "700", color: "#ffffff", marginBottom: 4 },
  pixSub: { fontSize: 13, color: "#9a9a9a", marginBottom: 16 },
  pixAmount: { fontSize: 28, fontWeight: "800", color: "#f97316", marginBottom: 16 },
  pixKeyBox: {
    backgroundColor: "#242424", borderRadius: 12,
    borderWidth: 1, borderColor: "#2a2a2a", padding: 12, marginBottom: 4,
  },
  pixKeyText: { fontSize: 12, fontFamily: "monospace", color: "#d0d0d0" },
  copyRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, marginBottom: 8 },
  copyText: { fontSize: 13, fontWeight: "700", color: "#f97316" },
  pixInfo: { fontSize: 12, color: "#535353", marginBottom: 16, lineHeight: 18 },
});
