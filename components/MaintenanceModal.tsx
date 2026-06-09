import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Wrench } from "lucide-react-native";

interface Props {
  message: string | null;
  checking?: boolean;
  onRetry: () => void;
}

export function MaintenanceModal({ message, checking = false, onRetry }: Props) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#ffffff" />

      <View style={styles.iconWrap}>
        <Wrench size={40} color="#f97316" strokeWidth={1.8} />
      </View>

      <Text style={styles.title}>Em manutenção</Text>

      <Text style={styles.message}>
        {message?.trim()
          ? message
          : "O sistema está temporariamente em manutenção.\nVoltaremos em breve."}
      </Text>

      <View style={styles.divider} />

      <Text style={styles.sub}>
        O aplicativo será liberado automaticamente assim que a manutenção for concluída.
      </Text>

      <TouchableOpacity
        style={[styles.btn, checking && styles.btnDisabled]}
        onPress={onRetry}
        disabled={checking}
        activeOpacity={0.75}
      >
        {checking ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.btnText}>Verificar novamente</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  divider: {
    width: 48,
    height: 2,
    backgroundColor: "#ffffff",
    borderRadius: 2,
    marginBottom: 20,
  },
  sub: {
    fontSize: 12,
    color: "#475569",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 36,
  },
  btn: {
    backgroundColor: "#f97316",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 200,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
