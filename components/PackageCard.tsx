import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
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
  SHOPEE:        { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400" },
  AMAZON:        { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400" },
  ALIEXPRESS:    { bg: "bg-red-100 dark:bg-red-900/30",       text: "text-red-700 dark:text-red-400"       },
  MERCADO_LIVRE: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-800 dark:text-yellow-400" },
  CORREIOS:      { bg: "bg-blue-100 dark:bg-blue-900/30",     text: "text-blue-700 dark:text-blue-400"     },
  SHEIN:         { bg: "bg-pink-100 dark:bg-pink-900/30",     text: "text-pink-700 dark:text-pink-400"     },
  OUTRO:         { bg: "bg-gray-100 dark:bg-gray-700",        text: "text-gray-700 dark:text-gray-300"     },
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
      className="bg-white dark:bg-gray-900 rounded-2xl p-4 mb-3"
      activeOpacity={0.7}
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-row items-center flex-1 mr-2">
          <View className="w-11 h-11 bg-primary-100 dark:bg-primary-900/30 rounded-2xl items-center justify-center mr-3">
            <Package2 size={20} color="#ea580c" />
          </View>
          <View className="flex-1">
            <Text
              className="text-gray-900 dark:text-white font-bold text-sm"
              numberOfLines={1}
            >
              {pkg.trackingCode || "Sem código"}
            </Text>
            <Text
              className="text-gray-400 text-xs mt-0.5"
              numberOfLines={1}
            >
              {pkg.description || "Sem descrição"}
            </Text>
          </View>
        </View>
        <StatusBadge status={pkg.status} />
      </View>

      {showOriginBadge && (pkg.origin || pkg.category) && (
        <View className="flex-row gap-2 mb-2">
          {pkg.origin && originColors && (
            <View className={`px-2 py-0.5 rounded-full ${originColors.bg}`}>
              <Text className={`text-xs font-semibold ${originColors.text}`}>
                {getOriginLabel(pkg.origin)}
              </Text>
            </View>
          )}
          {pkg.category && (
            <View className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
              <Text className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                {pkg.category}
              </Text>
            </View>
          )}
        </View>
      )}

      <View className="flex-row items-center mt-2 gap-4">
        <View className="flex-row items-center">
          <MapPin size={12} color="#9ca3af" />
          <Text className="text-gray-400 text-xs ml-1">
            {pkg.unit?.condo?.name} · Unid. {pkg.unit?.number}
          </Text>
        </View>
        {pkg.resident && (
          <View className="flex-row items-center">
            <User size={12} color="#9ca3af" />
            <Text className="text-gray-400 text-xs ml-1">
              {pkg.resident.name}
            </Text>
          </View>
        )}
      </View>
      <Text className="text-gray-500 dark:text-gray-600 text-xs mt-2">
        {formatDate(pkg.createdAt)}
      </Text>
      {pkg.deliveredAt && (
        <Text className="text-emerald-400 text-xs mt-0.5">
          Entregue em: {formatDate(pkg.deliveredAt)}
        </Text>
      )}
    </TouchableOpacity>
  );
});
