import React from "react";
import { View, Text, TextInput, TextInputProps } from "react-native";

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  mask?: (value: string) => string;
}

export function Input({ label, error, mask, onChangeText, ...props }: Props) {
  const handleChange = (text: string) => {
    onChangeText?.(mask ? mask(text) : text);
  };

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-gray-700 dark:text-gray-300 text-sm font-semibold mb-1.5">
          {label}
        </Text>
      )}
      <TextInput
        className={`bg-white dark:bg-gray-800 border ${
          error
            ? "border-red-400"
            : "border-gray-200 dark:border-gray-700"
        } rounded-2xl px-4 py-3.5 text-gray-900 dark:text-white text-base`}
        placeholderTextColor="#6b7280"
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.04,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
        }}
        onChangeText={handleChange}
        {...props}
      />
      {error && (
        <Text className="text-red-500 text-xs mt-1 ml-1">{error}</Text>
      )}
    </View>
  );
}
