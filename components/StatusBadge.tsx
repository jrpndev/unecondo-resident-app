import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { PackageStatus } from "../types";

interface Props {
  status: PackageStatus;
}

const STATUS_CONFIG = {
  PENDING:   { label: "Pendente",  bg: "#f59e0b22", text: "#fbbf24", dot: "#f59e0b" },
  DELIVERED: { label: "Entregue",  bg: "#22c55e22", text: "#4ade80", dot: "#22c55e" },
  RETURNED:  { label: "Devolvido", bg: "#ef444422", text: "#f87171", dot: "#ef4444" },
};

export function StatusBadge({ status }: Props) {
  const c = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <View style={[styles.dot, { backgroundColor: c.dot }]} />
      <Text style={[styles.label, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
  },
});
