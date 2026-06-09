import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  StyleSheet,
} from "react-native";

interface Props extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
}

const BG: Record<string, string> = {
  primary:   "#f97316",
  secondary: "#e5e7eb",
  danger:    "#ef4444",
  ghost:     "transparent",
  outline:   "transparent",
};

const TEXT_COLOR: Record<string, string> = {
  primary:   "#ffffff",
  secondary: "#111827",
  danger:    "#ffffff",
  ghost:     "#f97316",
  outline:   "#f97316",
};

const BORDER_COLOR: Record<string, string | undefined> = {
  primary:   undefined,
  secondary: undefined,
  danger:    undefined,
  ghost:     undefined,
  outline:   "#f97316",
};

export function Button({
  title,
  loading,
  variant = "primary",
  disabled,
  style,
  ...props
}: Props) {
  return (
    <TouchableOpacity
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        { backgroundColor: BG[variant] },
        BORDER_COLOR[variant] ? { borderWidth: 2, borderColor: BORDER_COLOR[variant] } : null,
        (disabled || loading) ? styles.disabled : null,
        style as any,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" || variant === "danger" ? "#fff" : "#f97316"} />
      ) : (
        <Text style={[styles.text, { color: TEXT_COLOR[variant] }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.4,
  },
});
