import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import {
  CalendarCheck, DollarSign, User, ChevronRight, LogOut,
  Settings, FileText, AlertCircle, Wrench, Vote, MessageCircle,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/auth";

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onPress: () => void;
}

function MenuRow({ icon, label, sub, onPress }: MenuItem) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.menuRow}>
      <View style={styles.menuIcon}>{icon}</View>
      <View style={styles.menuText}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuSub}>{sub}</Text>
      </View>
      <ChevronRight size={16} color="#535353" />
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const confirmLogout = () => {
    Alert.alert("Sair da conta", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* User header */}
      <View style={[styles.userHeader, { paddingTop: insets.top + 28 }]}>
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

      {/* Services */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SERVIÇOS</Text>
        <View style={styles.menuGroup}>
          <MenuRow
            icon={<CalendarCheck size={20} color="#8b5cf6" />}
            label="Reservas"
            sub="Áreas comuns do condomínio"
            onPress={() => router.push("/(tabs)/reservations")}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            icon={<DollarSign size={20} color="#22c55e" />}
            label="Financeiro"
            sub="Boletos e cobranças"
            onPress={() => router.push("/(tabs)/financial")}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            icon={<MessageCircle size={20} color="#3b82f6" />}
            label="Chat"
            sub="Fale com a administração"
            onPress={() => router.push("/chat")}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            icon={<AlertCircle size={20} color="#f59e0b" />}
            label="Ocorrências"
            sub="Chamados e solicitações"
            onPress={() => router.push("/tickets")}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            icon={<FileText size={20} color="#6366f1" />}
            label="Documentos"
            sub="Atas, regulamentos e contratos"
            onPress={() => router.push("/documents")}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            icon={<Vote size={20} color="#ec4899" />}
            label="Assembleias"
            sub="Votações virtuais"
            onPress={() => router.push("/assemblies")}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            icon={<Wrench size={20} color="#14b8a6" />}
            label="Manutenções"
            sub="Programadas e preventivas"
            onPress={() => router.push("/maintenance-items")}
          />
        </View>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>CONTA</Text>
        <View style={styles.menuGroup}>
          <MenuRow
            icon={<User size={20} color="#f97316" />}
            label="Perfil"
            sub="QR Code, unidade e dados"
            onPress={() => router.push("/(tabs)/profile")}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            icon={<Settings size={20} color="#9a9a9a" />}
            label="Configurações"
            sub="Notificações e preferências"
            onPress={() => router.push("/settings")}
          />
        </View>
      </View>

      {/* Logout */}
      <View style={[styles.section, { marginTop: 0 }]}>
        <TouchableOpacity onPress={confirmLogout} activeOpacity={0.7} style={styles.logoutRow}>
          <View style={styles.logoutIcon}>
            <LogOut size={20} color="#ef4444" />
          </View>
          <Text style={styles.logoutText}>Sair da conta</Text>
          <ChevronRight size={16} color="#7f1d1d" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#111111",
  },
  userHeader: {
    alignItems: "center",
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1a1a1a",
    borderWidth: 2,
    borderColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#f97316",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
  },
  userEmail: {
    fontSize: 13,
    color: "#9a9a9a",
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
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#535353",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  menuGroup: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#2a2a2a",
    marginLeft: 56,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#242424",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  menuSub: {
    fontSize: 12,
    color: "#535353",
    marginTop: 1,
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3a1a1a",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  logoutIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#ef444415",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  logoutText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#ef4444",
  },
});
