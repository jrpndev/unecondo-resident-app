import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Package2, MapPin, User } from "lucide-react-native";
import { Package, ORIGINS } from "../types";
import { StatusBadge } from "./StatusBadge";
import { formatDate } from "../lib/utils";

interface Props {
  pkg: Package;
  onPress: () => void;
  showOriginBadge?: boolean;
}

const ORIGIN_COLORS: Record<string, { bg: string; text: string }> = {
  SHOPEE:        { bg: "#f9731620", text: "#fb923c" },
  AMAZON:        { bg: "#f59e0b20", text: "#fbbf24" },
  ALIEXPRESS:    { bg: "#ef444420", text: "#f87171" },
  MERCADO_LIVRE: { bg: "#f59e0b20", text: "#fbbf24" },
  CORREIOS:      { bg: "#3b82f620", text: "#60a5fa" },
  SHEIN:         { bg: "#ec489920", text: "#f472b6" },
  OUTRO:         { bg: "#ffffff18", text: "#9a9a9a" },
};

function getOriginLabel(value: string) {
  return ORIGINS.find((o) => o.value === value)?.label ?? value;
}

export const PackageCard = React.memo(function PackageCard({
  pkg,
  onPress,
  showOriginBadge,
}: Props) {
  const originColors = pkg.origin
    ? (ORIGIN_COLORS[pkg.origin] ?? ORIGIN_COLORS.OUTRO)
    : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.card}
      activeOpacity={0.75}
    >
      <View style={styles.topRow}>
        <View style={styles.iconAndText}>
          <View style={styles.iconBox}>
            <Package2 size={22} color="#f97316" />
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.trackingCode} numberOfLines={1}>
              {pkg.trackingCode || "Sem código"}
            </Text>
            <Text style={styles.description} numberOfLines={1}>
              {pkg.description || "Sem descrição"}
            </Text>
          </View>
        </View>
        <StatusBadge status={pkg.status} />
      </View>

      {showOriginBadge && (pkg.origin || pkg.category) && (
        <View style={styles.badgeRow}>
          {pkg.origin && originColors && (
            <View style={[styles.badge, { backgroundColor: originColors.bg }]}>
              <Text style={[styles.badgeText, { color: originColors.text }]}>
                {getOriginLabel(pkg.origin)}
              </Text>
            </View>
          )}
          {pkg.category && (
            <View style={[styles.badge, { backgroundColor: "#ffffff18" }]}>
              <Text style={[styles.badgeText, { color: "#9a9a9a" }]}>
                {pkg.category}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <MapPin size={11} color="#5a5a5a" />
          <Text style={styles.footerText}>
            {pkg.unit?.condo?.name} · Unid. {pkg.unit?.number}
          </Text>
        </View>
        {pkg.resident && (
          <View style={styles.footerItem}>
            <User size={11} color="#5a5a5a" />
            <Text style={styles.footerText}>{pkg.resident.name}</Text>
          </View>
        )}
      </View>

      <Text style={styles.date}>{formatDate(pkg.createdAt)}</Text>
      {pkg.deliveredAt && (
        <Text style={styles.deliveredDate}>
          Entregue em: {formatDate(pkg.deliveredAt)}
        </Text>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 16,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  iconAndText: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  iconBox: {
    width: 46,
    height: 46,
    backgroundColor: "#f9731618",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textBlock: {
    flex: 1,
  },
  trackingCode: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  description: {
    fontSize: 13,
    color: "#9a9a9a",
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: "#5a5a5a",
  },
  date: {
    fontSize: 11,
    color: "#5a5a5a",
    marginTop: 6,
  },
  deliveredDate: {
    fontSize: 11,
    color: "#4ade80",
    marginTop: 2,
  },
});
