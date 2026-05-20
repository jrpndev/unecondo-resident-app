import React from "react";
import { View, Text } from "react-native";
import { PackageStatus } from "../types";

interface Props {
  status: PackageStatus;
}

const STATUS_CONFIG = {
  PENDING:   { label: "Pendente",  bg: "bg-amber-100",   text: "text-amber-700",  dot: "bg-amber-500"  },
  DELIVERED: { label: "Entregue",  bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  RETURNED:  { label: "Devolvido", bg: "bg-red-100",     text: "text-red-700",    dot: "bg-red-500"    },
};

export function StatusBadge({ status }: Props) {
  const c = STATUS_CONFIG[status];
  return (
    <View className={`flex-row items-center px-2.5 py-1 rounded-full ${c.bg}`}>
      <View className={`w-1.5 h-1.5 rounded-full ${c.dot} mr-1.5`} />
      <Text className={`text-xs font-bold ${c.text}`}>{c.label}</Text>
    </View>
  );
}
