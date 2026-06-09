import React from "react";
import { View, Text, TextInput, TextInputProps, StyleSheet } from "react-native";

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  mask?: (value: string) => string;
}

export function Input({ label, error, mask, onChangeText, style, ...props }: Props) {
  const handleChange = (text: string) => {
    onChangeText?.(mask ? mask(text) : text);
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <TextInput
        style={[
          styles.input,
          error ? styles.inputError : null,
          style as any,
        ]}
        placeholderTextColor="#9ca3af"
        onChangeText={handleChange}
        {...props}
      />
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#6b7280",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#111827",
    fontSize: 15,
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#f87171",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },
});
