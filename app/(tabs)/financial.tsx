import React, { useState } from "react";
import {
  View, Text, FlatList, RefreshControl, TouchableOpacity,
  ActivityIndicator, Modal, ScrollView, Alert, Linking,
  TextInput, KeyboardAvoidingView, Platform, StyleSheet,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, CheckCircle, AlertCircle, Clock, X, CreditCard, FileText, Copy } from "lucide-react-native";
import {
  getMyCondoFees, payFeeWithCard,
  type CondoFee, type FeeStatus,
} from "../../lib/condoFees";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

const STATUS_CONFIG: Record<FeeStatus, { label: string; color: string; icon: any }> = {
  PENDING:   { label: "Pendente",  color: "#f97316", icon: Clock },
  CONFIRMED: { label: "Pago",      color: "#22c55e", icon: CheckCircle },
  OVERDUE:   { label: "Atrasado",  color: "#ef4444", icon: AlertCircle },
  CANCELLED: { label: "Cancelado", color: "#9ca3af", icon: X },
};

type PayMethod = "pix" | "card" | "boleto" | null;

function FeeCard({ fee, onSelect }: { fee: CondoFee; onSelect: (fee: CondoFee, method: PayMethod) => void }) {
  const config = STATUS_CONFIG[fee.status];
  const Icon = config.icon;
  const canPay = fee.status === "PENDING" || fee.status === "OVERDUE";

  return (
    <View style={styles.feeCard}>
      <View style={styles.feeTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.feeTitle}>
            Taxa condominial — {MONTHS[fee.month - 1]}/{fee.year}
          </Text>
          <Text style={styles.feeDue}>Vencimento: {fmtDate(fee.dueDate)}</Text>
          <Text style={styles.feeAmount}>{fmt(fee.amount)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: config.color + "20" }]}>
          <Icon size={11} color={config.color} />
          <Text style={[styles.statusBadgeText, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>

      {canPay && (
        <View style={styles.feeActions}>
          {fee.pixKey && (
            <TouchableOpacity
              onPress={() => onSelect(fee, "pix")}
              style={styles.payBtnPix}
            >
              <Text style={styles.payBtnText}>PIX</Text>
            </TouchableOpacity>
          )}
          {fee.invoiceUrl && (
            <TouchableOpacity
              onPress={() => onSelect(fee, "boleto")}
              style={styles.payBtnBoleto}
            >
              <FileText size={12} color="#6b7280" />
              <Text style={styles.payBtnTextSecondary}>Boleto</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => onSelect(fee, "card")}
            style={styles.payBtnCard}
          >
            <CreditCard size={12} color="#ffffff" />
            <Text style={styles.payBtnText}>Cartão</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function PixModal({ fee, onClose }: { fee: CondoFee; onClose: () => void }) {
  const copy = () => {
    if (fee.pixKey) {
      require("react-native").Clipboard.setString(fee.pixKey);
      Alert.alert("Copiado!", "Chave PIX copiada.");
    }
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Pagar via PIX</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <Text style={styles.pixAmount}>{fmt(fee.amount)}</Text>
          {fee.pixKey && (
            <View style={styles.pixSection}>
              <Text style={styles.pixLabel}>CHAVE PIX COPIA E COLA</Text>
              <View style={styles.pixKeyRow}>
                <Text style={styles.pixKeyText} numberOfLines={1}>{fee.pixKey}</Text>
                <TouchableOpacity onPress={copy} style={styles.pixCopyBtn}>
                  <Copy size={16} color="#f97316" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          <TouchableOpacity onPress={onClose} style={styles.confirmBtn}>
            <Text style={styles.confirmBtnText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function fmtCardNumber(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function fmtExpiry(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + "/" + digits.slice(2);
}

function CardModal({ fee, onClose, onSuccess }: { fee: CondoFee; onClose: () => void; onSuccess: () => void }) {
  const insets = useSafeAreaInsets();
  const [holderName, setHolderName] = useState("");
  const [numberDisplay, setNumberDisplay] = useState("");
  const [expiry, setExpiry] = useState("");
  const [ccv, setCcv] = useState("");
  const qc = useQueryClient();

  const cardNumber = numberDisplay.replace(/\s/g, "");
  const expiryMonth = expiry.split("/")[0] ?? "";
  const expiryYear = expiry.split("/")[1] ? "20" + expiry.split("/")[1] : "";

  const pay = useMutation({
    mutationFn: () => payFeeWithCard(fee.id, { holderName, number: cardNumber, expiryMonth, expiryYear, ccv }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-condo-fees"] });
      onSuccess();
      Alert.alert("Pagamento confirmado!", "Sua taxa foi paga com sucesso.");
    },
    onError: (e: any) => Alert.alert("Erro", e?.response?.data?.message ?? "Cartão recusado ou dados inválidos."),
  });

  const ready = holderName.trim().length > 2 && cardNumber.length >= 15 && expiryMonth.length === 2 && expiryYear.length === 4 && ccv.length >= 3;

  return (
    <Modal visible statusBarTranslucent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[styles.cardModalRoot, { paddingTop: insets.top }]}>
          <View style={styles.cardModalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.cardModalBack}>
              <X size={18} color="#6b7280" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardModalTitle}>Pagar com Cartão</Text>
              <Text style={styles.cardModalSub}>Pagamento seguro via Asaas</Text>
            </View>
            <View style={styles.cardModalAmount}>
              <Text style={styles.cardModalAmountText}>{fmt(fee.amount)}</Text>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            {/* Card visual */}
            <View style={styles.cardVisual}>
              <CreditCard size={26} color="rgba(255,255,255,0.5)" />
              <Text style={styles.cardVisualNumber}>{numberDisplay || "•••• •••• •••• ••••"}</Text>
              <View style={styles.cardVisualBottom}>
                <View>
                  <Text style={styles.cardVisualLabel}>TITULAR</Text>
                  <Text style={styles.cardVisualValue}>{holderName || "NOME NO CARTÃO"}</Text>
                </View>
                <View>
                  <Text style={styles.cardVisualLabel}>VALIDADE</Text>
                  <Text style={styles.cardVisualValue}>{expiry || "MM/AA"}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.fieldLabel}>NOME IMPRESSO NO CARTÃO</Text>
            <TextInput
              style={[styles.fieldInput, { marginBottom: 16 }]}
              placeholder="NOME SOBRENOME"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              autoCorrect={false}
              value={holderName}
              onChangeText={setHolderName}
            />

            <Text style={styles.fieldLabel}>NÚMERO DO CARTÃO</Text>
            <TextInput
              style={[styles.fieldInput, { marginBottom: 16 }]}
              placeholder="0000 0000 0000 0000"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              maxLength={19}
              value={numberDisplay}
              onChangeText={v => setNumberDisplay(fmtCardNumber(v))}
            />

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>VALIDADE (MM/AA)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="MM/AA"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={5}
                  value={expiry}
                  onChangeText={v => setExpiry(fmtExpiry(v))}
                />
              </View>
              <View style={{ width: 110 }}>
                <Text style={styles.fieldLabel}>CVC</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="•••"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  value={ccv}
                  onChangeText={setCcv}
                />
              </View>
            </View>
          </ScrollView>

          <View style={[styles.cardModalFooter, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity
              onPress={() => pay.mutate()}
              disabled={!ready || pay.isPending}
              style={[styles.confirmBtn, { opacity: ready && !pay.isPending ? 1 : 0.4, backgroundColor: "#3b82f6" }]}
            >
              <Text style={styles.confirmBtnText}>
                {pay.isPending ? "Processando..." : `Pagar ${fmt(fee.amount)}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function FinancialScreen() {
  const [selected, setSelected] = useState<{ fee: CondoFee; method: PayMethod } | null>(null);
  const insets = useSafeAreaInsets();

  const { data: fees = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["my-condo-fees"],
    queryFn: getMyCondoFees,
  });

  const pending = fees.filter(f => f.status === "PENDING" || f.status === "OVERDUE");
  const totalPending = pending.reduce((s, f) => s + f.amount, 0);

  const openBoleto = (fee: CondoFee) => {
    if (fee.invoiceUrl) Linking.openURL(fee.invoiceUrl);
  };

  const handleSelect = (fee: CondoFee, method: PayMethod) => {
    if (method === "boleto") { openBoleto(fee); return; }
    setSelected({ fee, method });
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
      <ScreenHeader title="Financeiro" subtitle="Taxas condominiais" />

      {totalPending > 0 && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingBannerLabel}>Total em aberto</Text>
          <Text style={styles.pendingBannerAmount}>{totalPending.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Text>
          <Text style={styles.pendingBannerCount}>{pending.length} cobrança{pending.length > 1 ? "s" : ""} pendente{pending.length > 1 ? "s" : ""}</Text>
        </View>
      )}

      <FlatList
        data={fees}
        keyExtractor={f => f.id}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
        renderItem={({ item }) => <FeeCard fee={item} onSelect={handleSelect} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <DollarSign size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Nenhuma cobrança encontrada</Text>
          </View>
        }
      />

      {selected?.method === "pix" && (
        <PixModal fee={selected.fee} onClose={() => setSelected(null)} />
      )}
      {selected?.method === "card" && (
        <CardModal
          fee={selected.fee}
          onClose={() => setSelected(null)}
          onSuccess={() => setSelected(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f5f5" },
  loading: { flex: 1, backgroundColor: "#f5f5f5", alignItems: "center", justifyContent: "center" },
  pendingBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: "#ef444410",
    borderWidth: 1,
    borderColor: "#ef444425",
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
    borderRadius: 14,
    padding: 16,
  },
  pendingBannerLabel: { fontSize: 12, color: "#f87171", fontWeight: "500" },
  pendingBannerAmount: { fontSize: 30, fontWeight: "800", color: "#f87171", marginTop: 2 },
  pendingBannerCount: { fontSize: 12, color: "#f8717180", marginTop: 2 },
  feeCard: {
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
    marginBottom: 12,
  },
  feeTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  feeTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  feeDue: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  feeAmount: { fontSize: 24, fontWeight: "800", color: "#111827", marginTop: 6 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginLeft: 8,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  feeActions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  payBtnPix: {
    flex: 1, backgroundColor: "#f97316", borderRadius: 10,
    paddingVertical: 10, alignItems: "center", flexDirection: "row",
    justifyContent: "center", gap: 4,
  },
  payBtnBoleto: {
    flex: 1, backgroundColor: "#ffffff", borderRadius: 10,
    paddingVertical: 10, alignItems: "center", flexDirection: "row",
    justifyContent: "center", gap: 4, borderWidth: 1, borderColor: "#e5e7eb",
  },
  payBtnCard: {
    flex: 1, backgroundColor: "#3b82f6", borderRadius: 10,
    paddingVertical: 10, alignItems: "center", flexDirection: "row",
    justifyContent: "center", gap: 4,
  },
  payBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  payBtnTextSecondary: { color: "#6b7280", fontWeight: "700", fontSize: 13 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: "#9ca3af" },
  // Sheet
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#f5f5f5", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  sheetHandle: {
    width: 36, height: 4, backgroundColor: "#ffffff",
    borderRadius: 2, alignSelf: "center", marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  closeBtn: {
    width: 32, height: 32, backgroundColor: "#ffffff",
    borderRadius: 16, alignItems: "center", justifyContent: "center",
  },
  pixAmount: { fontSize: 34, fontWeight: "800", color: "#111827", textAlign: "center", marginBottom: 24 },
  pixSection: { marginBottom: 20 },
  pixLabel: {
    fontSize: 10, fontWeight: "700", color: "#9ca3af",
    letterSpacing: 1.2, marginBottom: 8,
  },
  pixKeyRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#ffffff", borderRadius: 12,
    borderWidth: 1, borderColor: "#e5e7eb", paddingHorizontal: 16, paddingVertical: 12, gap: 10,
  },
  pixKeyText: { flex: 1, fontSize: 12, color: "#111827" },
  pixCopyBtn: { padding: 4 },
  confirmBtn: {
    backgroundColor: "#f97316", borderRadius: 999, paddingVertical: 16, alignItems: "center",
  },
  confirmBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  // Card modal
  cardModalRoot: { flex: 1, backgroundColor: "#f5f5f5" },
  cardModalHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "#e5e7eb", gap: 12,
  },
  cardModalBack: {
    width: 36, height: 36, backgroundColor: "#ffffff",
    borderRadius: 18, alignItems: "center", justifyContent: "center",
  },
  cardModalTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  cardModalSub: { fontSize: 12, color: "#9ca3af", marginTop: 1 },
  cardModalAmount: {
    backgroundColor: "#f5f5f5", paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb",
  },
  cardModalAmountText: { fontSize: 14, fontWeight: "700", color: "#3b82f6" },
  cardVisual: {
    backgroundColor: "#1d4ed8", borderRadius: 16, padding: 20,
    marginBottom: 24, aspectRatio: 1.6,
  },
  cardVisualNumber: {
    color: "#111827", fontSize: 18, fontWeight: "700",
    letterSpacing: 3, marginTop: 16,
  },
  cardVisualBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  cardVisualLabel: { fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: 1 },
  cardVisualValue: { fontSize: 13, fontWeight: "600", color: "#111827", marginTop: 2 },
  fieldLabel: {
    fontSize: 10, fontWeight: "700", color: "#9ca3af",
    letterSpacing: 1.2, marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: "#f5f5f5", borderWidth: 1, borderColor: "#e5e7eb",
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    color: "#111827", fontSize: 14,
  },
  cardModalFooter: {
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: "#e5e7eb",
    backgroundColor: "#f5f5f5",
  },
});
