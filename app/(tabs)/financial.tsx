import React, { useState } from "react";
import {
  View, Text, FlatList, RefreshControl, TouchableOpacity,
  ActivityIndicator, Modal, ScrollView, Clipboard, Alert,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, CheckCircle, AlertCircle, Clock, Copy, X } from "lucide-react-native";
import { getMyCondoFees, type CondoFee, type FeeStatus } from "../../lib/condoFees";
import { ScreenHeader } from "../../components/ScreenHeader";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

const STATUS_CONFIG: Record<FeeStatus, { label: string; color: string; icon: any }> = {
  PENDING:   { label: "Pendente",   color: "#f97316", icon: Clock },
  CONFIRMED: { label: "Pago",       color: "#22c55e", icon: CheckCircle },
  OVERDUE:   { label: "Atrasado",   color: "#ef4444", icon: AlertCircle },
  CANCELLED: { label: "Cancelado",  color: "#9ca3af", icon: X },
};

function FeeCard({ fee, onPay }: { fee: CondoFee; onPay: (fee: CondoFee) => void }) {
  const config = STATUS_CONFIG[fee.status];
  const Icon = config.icon;

  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 shadow-sm">
      <View className="flex-row items-start justify-between">
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
        <View className="items-center gap-1">
          <View className="px-3 py-1 rounded-full flex-row items-center gap-1" style={{ backgroundColor: config.color + "20" }}>
            <Icon size={12} color={config.color} />
            <Text className="text-xs font-semibold" style={{ color: config.color }}>{config.label}</Text>
          </View>
        </View>
      </View>

      {(fee.status === "PENDING" || fee.status === "OVERDUE") && fee.pixKey && (
        <TouchableOpacity
          onPress={() => onPay(fee)}
          className="mt-3 bg-orange-500 rounded-xl py-2.5 items-center active:opacity-80"
        >
          <Text className="text-white font-semibold text-sm">Pagar via PIX</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function PayModal({ fee, onClose }: { fee: CondoFee; onClose: () => void }) {
  const copyKey = () => {
    if (fee.pixKey) {
      Clipboard.setString(fee.pixKey);
      Alert.alert("Copiado!", "Chave PIX copiada para a área de transferência.");
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white dark:bg-gray-900 rounded-t-3xl p-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">Pagar via PIX</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <View className="items-center mb-6">
            <Text className="text-sm text-gray-500 mb-1">Valor a pagar</Text>
            <Text className="text-3xl font-bold text-gray-900 dark:text-white">{fmt(fee.amount)}</Text>
            <Text className="text-sm text-gray-500 mt-1">
              Taxa {MONTHS[fee.month - 1]}/{fee.year}
            </Text>
          </View>

          {fee.pixQrCode && (
            <View className="items-center mb-6">
              <Text className="text-sm text-gray-500 mb-3">QR Code PIX</Text>
              <View className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <Text className="text-xs text-gray-400 text-center" numberOfLines={3}>
                  {fee.pixQrCode}
                </Text>
              </View>
            </View>
          )}

          {fee.pixKey && (
            <View className="mb-6">
              <Text className="text-sm text-gray-500 mb-2">Chave PIX copia e cola</Text>
              <View className="flex-row items-center bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 gap-3">
                <Text className="flex-1 text-xs text-gray-600 dark:text-gray-300" numberOfLines={1}>{fee.pixKey}</Text>
                <TouchableOpacity onPress={copyKey}>
                  <Copy size={18} color="#f97316" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {fee.invoiceUrl && (
            <TouchableOpacity className="bg-gray-100 dark:bg-gray-800 rounded-xl py-3 items-center mb-3">
              <Text className="text-gray-600 dark:text-gray-300 font-medium text-sm">Ver boleto</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onClose} className="bg-orange-500 rounded-xl py-3 items-center">
            <Text className="text-white font-semibold">Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function FinancialScreen() {
  const [payModal, setPayModal] = useState<CondoFee | null>(null);

  const { data: fees = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["my-condo-fees"],
    queryFn: getMyCondoFees,
  });

  const pending = fees.filter(f => f.status === "PENDING" || f.status === "OVERDUE");
  const paid = fees.filter(f => f.status === "CONFIRMED");
  const totalPending = pending.reduce((s, f) => s + f.amount, 0);

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
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
        renderItem={({ item }) => <FeeCard fee={item} onPay={setPayModal} />}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <DollarSign size={40} color="#d1d5db" />
            <Text className="text-gray-400 mt-3">Nenhuma cobrança encontrada</Text>
          </View>
        }
      />

      {payModal && <PayModal fee={payModal} onClose={() => setPayModal(null)} />}
    </View>
  );
}
