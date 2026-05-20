import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
} from "react-native";

interface Props extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
}

const VARIANTS = {
  primary:   "bg-primary-500",
  secondary: "bg-gray-100 dark:bg-gray-800",
  danger:    "bg-red-500",
  ghost:     "bg-transparent",
  outline:   "bg-transparent border border-primary-500",
};

const TEXT_VARIANTS = {
  primary:   "text-white",
  secondary: "text-gray-700 dark:text-gray-200",
  danger:    "text-white",
  ghost:     "text-primary-500",
  outline:   "text-primary-500",
};

export function Button({
  title,
  loading,
  variant = "primary",
  disabled,
  ...props
}: Props) {
  return (
    <TouchableOpacity
      className={`${VARIANTS[variant]} rounded-2xl py-4 items-center justify-center ${
        disabled || loading ? "opacity-50" : ""
      }`}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "primary" || variant === "danger" ? "white" : "#f97316"
          }
        />
      ) : (
        <Text className={`${TEXT_VARIANTS[variant]} font-bold text-base`}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
