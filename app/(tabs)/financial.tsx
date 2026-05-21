import React, { useState } from "react";
import {
  View, Text, FlatList, RefreshControl, TouchableOpacity,
  ActivityIndicator, Modal, ScrollView, Alert, Linking,
  TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, CheckCircle, AlertCircle, Clock, X, CreditCard, FileText, Clipboard } from "lucide-react-native";
import {
  getMyCondoFees, payFeeWithCard,
  type CondoFee, type FeeStatus, type CreditCardData,
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
  PENDING:   { label: "Pendente",   color: "#f97316", icon: Clock },
  CONFIRMED: { label: "Pago",       color: "#22c55e", icon: CheckCircle },
  OVERDUE:   { label: "Atrasado",   color: "#ef4444", icon: AlertCircle },
  CANCELLED: { label: "Cancelado",  color: "#9ca3af", icon: X },
};

type PayMethod = "pix" | "card" | "boleto" | null;

function FeeCard({ fee, onSelect }: { fee: CondoFee; onSelect: (fee: CondoFee, method: PayMethod) => void }) {
  const config = STATUS_CONFIG[fee.status];
  const Icon = config.icon;
  const canPay = fee.status === "PENDING" || fee.status === "OVERDUE";

  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 shadow-sm">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="font-semibold text-gray-900 dark:text-white">
            Taxa condominial — {MONTHS[fee.month - 1]}/{fee.year}
          </Text>
          <Text className="text-sm text-gray-500 mt-0.5">
            Vencimento: {fmtDate(fee.dueDate)}
          </Text>
          <Text className="text-xl font-bold text-gray-900 dark:text-white mt-2">
            {fmt(fee.amount)}
          </Text>
        </View>
        <View className="px-3 py-1 rounded-full flex-row items-center gap-1" style={{ backgroundColor: config.color + "20" }}>
          <Icon size={12} color={config.color} />
          <Text className="text-xs font-semibold" style={{ color: config.color }}>{config.label}</Text>
        </View>
      </View>

      {canPay && (
        <View className="flex-row gap-2 flex-wrap">
          {fee.pixKey && (
            <TouchableOpacity
              onPress={() => onSelect(fee, "pix")}
              className="flex-1 bg-orange-500 rounded-xl py-2 items-center flex-row justify-center gap-1.5 active:opacity-80"
            >
              <Text className="text-white font-semibold text-xs">PIX</Text>
            </TouchableOpacity>
          )}
          {fee.invoiceUrl && (
            <TouchableOpacity
              onPress={() => onSelect(fee, "boleto")}
              className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-xl py-2 items-center flex-row justify-center gap-1.5 active:opacity-80"
            >
              <FileText size={13} color="#6b7280" />
              <Text className="text-gray-600 dark:text-gray-300 font-semibold text-xs">Boleto</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => onSelect(fee, "card")}
            className="flex-1 bg-blue-500 rounded-xl py-2 items-center flex-row justify-center gap-1.5 active:opacity-80"
          >
            <CreditCard size={13} color="#fff" />
            <Text className="text-white font-semibold text-xs">Cartão</Text>
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
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white dark:bg-gray-900 rounded-t-3xl p-6">
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">Pagar via PIX</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color="#9ca3af" /></TouchableOpacity>
          </View>
          <Text className="text-center text-3xl font-bold text-gray-900 dark:text-white mb-5">{fmt(fee.amount)}</Text>
          {fee.pixKey && (
            <View className="mb-5">
              <Text className="text-xs text-gray-500 mb-2">Chave PIX copia e cola</Text>
              <View className="flex-row items-center bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 gap-3">
                <Text className="flex-1 text-xs text-gray-600 dark:text-gray-300" numberOfLines={1}>{fee.pixKey}</Text>
                <TouchableOpacity onPress={copy}>
                  <Clipboard size={18} color="#f97316" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          <TouchableOpacity onPress={onClose} className="bg-orange-500 rounded-xl py-3 items-center">
            <Text className="text-white font-semibold">Fechar</Text>
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 bg-white dark:bg-gray-900" style={{ paddingTop: insets.top }}>
          {/* Header */}
          <View className="flex-row items-center px-4 py-4 border-b border-gray-100 dark:border-gray-800">
            <TouchableOpacity onPress={onClose} className="mr-3 p-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 active:opacity-70">
              <X size={18} color="#6b7280" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900 dark:text-white">Pagar com Cartão</Text>
              <Text className="text-xs text-gray-400 mt-0.5">Pagamento seguro via Asaas</Text>
            </View>
            <View className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl">
              <Text className="text-blue-600 dark:text-blue-400 font-bold text-sm">{fmt(fee.amount)}</Text>
            </View>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 20, paddingBottom: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Card visual */}
            <View className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 mb-6 aspect-[1.6/1]"
              style={{ backgroundColor: "#1d4ed8" }}>
              <CreditCard size={28} color="rgba(255,255,255,0.7)" />
              <Text className="text-white/60 text-xs mt-4 tracking-widest">NÚMERO</Text>
              <Text className="text-white text-lg font-bold tracking-widest mt-0.5">
                {numberDisplay || "•••• •••• •••• ••••"}
              </Text>
              <View className="flex-row justify-between mt-4">
                <View>
                  <Text className="text-white/60 text-xs">TITULAR</Text>
                  <Text className="text-white text-sm font-semibold mt-0.5">
                    {holderName || "NOME NO CARTÃO"}
                  </Text>
                </View>
                <View>
                  <Text className="text-white/60 text-xs">VALIDADE</Text>
                  <Text className="text-white text-sm font-semibold mt-0.5">{expiry || "MM/AA"}</Text>
                </View>
              </View>
            </View>

            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dados do cartão</Text>

            <Text className="text-xs text-gray-500 mb-1">Nome impresso no cartão</Text>
            <TextInput
              className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white mb-4 bg-gray-50 dark:bg-gray-800"
              placeholder="NOME SOBRENOME"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              autoCorrect={false}
              value={holderName}
              onChangeText={setHolderName}
            />

            <Text className="text-xs text-gray-500 mb-1">Número do cartão</Text>
            <TextInput
              className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white mb-4 bg-gray-50 dark:bg-gray-800 tracking-widest"
              placeholder="0000 0000 0000 0000"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              maxLength={19}
              value={numberDisplay}
              onChangeText={v => setNumberDisplay(fmtCardNumber(v))}
            />

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Validade (MM/AA)</Text>
                <TextInput
                  className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
                  placeholder="MM/AA"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={5}
                  value={expiry}
                  onChangeText={v => setExpiry(fmtExpiry(v))}
                />
              </View>
              <View className="w-28">
                <Text className="text-xs text-gray-500 mb-1">CVC</Text>
                <TextInput
                  className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
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

          {/* Fixed pay button above nav bar */}
          <View
            className="px-5 pt-3 pb-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <TouchableOpacity
              onPress={() => pay.mutate()}
              disabled={!ready || pay.isPending}
              className="rounded-xl py-4 items-center"
              style={{ backgroundColor: ready && !pay.isPending ? "#3b82f6" : "#93c5fd" }}
            >
              <Text className="text-white font-bold text-base">
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
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScreenHeader title="Financeiro" subtitle="Taxas condominiais" />

      {totalPending > 0 && (
        <View className="mx-4 mb-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-2xl p-4">
          <Text className="text-sm text-orange-600 font-medium">Total em aberto</Text>
          <Text className="text-2xl font-bold text-orange-600 mt-1">
            {totalPending.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </Text>
          <Text className="text-xs text-orange-500 mt-0.5">{pending.length} cobrança{pending.length > 1 ? "s" : ""} pendente{pending.length > 1 ? "s" : ""}</Text>
        </View>
      )}

      <FlatList
        data={fees}
        keyExtractor={f => f.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: insets.bottom + 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
        renderItem={({ item }) => <FeeCard fee={item} onSelect={handleSelect} />}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <DollarSign size={40} color="#d1d5db" />
            <Text className="text-gray-400 mt-3">Nenhuma cobrança encontrada</Text>
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
