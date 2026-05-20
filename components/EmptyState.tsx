import React from "react";
import { View, Text } from "react-native";
import { Package2 } from "lucide-react-native";

interface Props {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, subtitle, icon }: Props) {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <View className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center mb-4">
        {icon || <Package2 size={28} color="#ea580c" />}
      </View>
      <Text className="text-gray-700 dark:text-gray-300 font-bold text-base">
        {title}
      </Text>
      {subtitle && (
        <Text className="text-gray-400 text-sm mt-1 text-center px-8">
          {subtitle}
        </Text>
      )}
    </View>
  );
}
