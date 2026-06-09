import React from "react";
import {
  View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LogOut, Shield, Building2, Mail, ChevronRight, QrCode, Settings } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/auth";
import { getResident } from "../../lib/residents";

let QRCode: any = null;
try { QRCode = require("react-native-qrcode-svg").default; } catch {}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const hasResident = !!user?.residentId;

  const { data: residentData, isLoading: loadingQr } = useQuery({
    queryKey: ["resident", user?.residentId],
    queryFn: () => getResident(user!.residentId!),
    enabled: hasResident,
  });

  const confirmLogout = () => {
    Alert.alert("Sair da conta", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => { await logout(); router.replace("/(auth)/login"); },
      },
    ]);
  };

  const initials = user?.name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 48 }}>
      {/* Header */}
      <View style={[styles.headerArea, { paddingTop: insets.top + 32 }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {user?.role === "CONDO_ADMIN" ? "Síndico" : "Morador"}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* QR Code */}
        {hasResident && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>QR CODE DE RETIRADA</Text>
            <View style={styles.qrCard}>
              {loadingQr ? (
                <ActivityIndicator color="#f97316" size="large" style={{ marginVertical: 48 }} />
              ) : residentData?.qrToken && QRCode ? (
                <>
                  <View style={styles.qrWrapper}>
                    <QRCode
                      value={residentData.qrToken}
                      size={184}
                      color="#111827"
                      backgroundColor="#f5f5f5"
                    />
                  </View>
                  <View style={styles.qrHint}>
                    <QrCode size={13} color="#f97316" />
                    <Text style={styles.qrHintText}>
                      Mostre ao porteiro para retirar sua encomenda
                    </Text>
                  </View>
                  {residentData?.unit && (
                    <Text style={styles.qrUnit}>
                      Apto {residentData.unit.number}
                      {residentData.unit.block ? ` · Bloco ${residentData.unit.block}` : ""}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.qrEmpty}>QR Code não disponível</Text>
              )}
            </View>
          </View>
        )}

        {/* Account info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>INFORMAÇÕES DA CONTA</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: "#f9731615" }]}>
                <Mail size={16} color="#f97316" />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoKey}>E-mail</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: "#8b5cf615" }]}>
                <Shield size={16} color="#8b5cf6" />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoKey}>Função</Text>
                <Text style={styles.infoValue}>
                  {user?.role === "CONDO_ADMIN" ? "Síndico" : "Morador"}
                </Text>
              </View>
            </View>
            {user?.condoId && (
              <>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <View style={[styles.infoIcon, { backgroundColor: "#3b82f615" }]}>
                    <Building2 size={16} color="#3b82f6" />
                  </View>
                  <View style={styles.infoText}>
                    <Text style={styles.infoKey}>Condomínio</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      {residentData?.condo?.name ?? user.condoId}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Settings */}
        <TouchableOpacity
          onPress={() => router.push("/settings")}
          style={styles.actionRow}
          activeOpacity={0.75}
        >
          <View style={[styles.actionIcon, { backgroundColor: "#ffffff" }]}>
            <Settings size={18} color="#6b7280" />
          </View>
          <Text style={styles.actionLabel}>Configurações</Text>
          <ChevronRight size={16} color="#9ca3af" />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          onPress={confirmLogout}
          style={[styles.actionRow, styles.logoutRow]}
          activeOpacity={0.75}
        >
          <View style={[styles.actionIcon, { backgroundColor: "#ef444415" }]}>
            <LogOut size={18} color="#ef4444" />
          </View>
          <Text style={[styles.actionLabel, { color: "#ef4444" }]}>Sair da conta</Text>
          <ChevronRight size={16} color="#7f1d1d" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  headerArea: {
    alignItems: "center",
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#f5f5f5",
    borderWidth: 3,
    borderColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: "800",
    color: "#f97316",
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  userEmail: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 3,
  },
  roleBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: "#f9731618",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#f9731630",
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f97316",
  },
  body: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  qrCard: {
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 20,
    alignItems: "center",
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
  },
  qrHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  qrHintText: {
    fontSize: 12,
    color: "#f97316",
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
  qrUnit: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  qrEmpty: {
    fontSize: 14,
    color: "#9ca3af",
    paddingVertical: 32,
  },
  infoCard: {
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#ffffff",
    marginLeft: 60,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  infoText: {
    flex: 1,
  },
  infoKey: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 14,
    marginBottom: 10,
  },
  logoutRow: {
    borderColor: "#fecaca",
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  actionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
});
