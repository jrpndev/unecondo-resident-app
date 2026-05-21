import React from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}

export function ScreenHeader({ title, subtitle, right, className = "" }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={`px-4 pb-3 bg-gray-50 dark:bg-gray-900 ${className}`}
      style={{ paddingTop: insets.top + 12 }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">{title}</Text>
          {subtitle ? (
            <Text className="text-sm text-gray-400 mt-0.5">{subtitle}</Text>
          ) : null}
        </View>
        {right ? <View>{right}</View> : null}
      </View>
    </View>
  );
}
