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
        placeholderTextColor="#5a5a5a"
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
    color: "#9a9a9a",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#242424",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#ffffff",
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
