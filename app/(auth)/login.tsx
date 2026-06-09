import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Package2, Eye, EyeOff, Fingerprint, X } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { login } from "../../lib/auth";
import {
  isBiometricSupported,
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
  getBiometricCredentials,
  authenticate,
} from "../../lib/biometric";
import {
  getSavedAccounts,
  addSavedAccount,
  removeSavedAccount,
  SavedAccount,
} from "../../lib/savedAccounts";
import { useAuthStore } from "../../store/auth";
import { registerPushToken } from "../../lib/notifications";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { AuthResponse, User } from "../../types";

const schema = z.object({
  identifier: z.string().min(1, "E-mail ou CPF obrigatório"),
  password:   z.string().min(1, "Senha obrigatória"),
});

type FormData = z.infer<typeof schema>;
type ViewMode = "loading" | "biometric" | "password";

export default function LoginScreen() {
  const router      = useRouter();
  const { setAuth } = useAuthStore();

  const [mode, setMode]                   = useState<ViewMode>("loading");
  const [loading, setLoading]             = useState(false);
  const [showPassword, setShowPassword]   = useState(false);
  const [bioAvailable, setBioAvailable]   = useState(false);
  const [savedEmail, setSavedEmail]       = useState("");
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const autoTriggered                     = useRef(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    (async () => {
      const [supported, enabled, accounts] = await Promise.all([
        isBiometricSupported(),
        isBiometricEnabled(),
        getSavedAccounts(),
      ]);
      setBioAvailable(supported);
      setSavedAccounts(accounts);
      if (supported && enabled) {
        const creds = await getBiometricCredentials();
        if (creds?.email) {
          setSavedEmail(creds.email);
          setMode("biometric");
          return;
        }
      }
      setMode("password");
    })();
  }, []);

  useEffect(() => {
    if (mode !== "biometric" || autoTriggered.current) return;
    autoTriggered.current = true;
    triggerBiometric();
  }, [mode]);

  async function doLogin(identifier: string, password: string): Promise<AuthResponse> {
    const result = await login(identifier, password);
    if (result.user.role === "ADMIN") {
      throw new Error("ADMIN_BLOCKED");
    }
    await setAuth(result.access_token, result.user, result.refresh_token);
    registerPushToken();
    await addSavedAccount({
      email: identifier,
      password,
      name: result.user.name,
      role: result.user.role,
    });
    return result;
  }

  async function quickLogin(account: SavedAccount) {
    setLoading(true);
    try {
      const result = await doLogin(account.email, account.password);
      navigateAfterLogin(result.user);
    } catch (err: any) {
      if (err?.message === "ADMIN_BLOCKED") {
        Toast.show({ type: "error", text1: "Acesso negado", text2: "Administradores devem usar o painel web" });
      } else {
        const message = err?.response?.data?.message || err?.message || "Erro ao fazer login";
        Toast.show({ type: "error", text1: "Erro ao trocar conta", text2: message });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveAccount(email: string) {
    await removeSavedAccount(email);
    setSavedAccounts((prev) => prev.filter((a) => a.email !== email));
  }

  function navigateAfterLogin(user: User) {
    if (user.mustChangePassword) {
      router.replace("/change-password");
    } else {
      router.replace("/(tabs)/home");
    }
  }

  async function triggerBiometric() {
    setLoading(true);
    try {
      const ok = await authenticate("Entre no Unecondo");
      if (!ok) return;

      const creds = await getBiometricCredentials();
      if (!creds) { setMode("password"); return; }

      const result = await doLogin(creds.email, creds.password);
      navigateAfterLogin(result.user);
    } catch (err: any) {
      if (err?.message === "ADMIN_BLOCKED") {
        Toast.show({ type: "error", text1: "Acesso negado", text2: "Administradores devem usar o painel web" });
      } else {
        await disableBiometric();
        if (savedEmail) setValue("identifier", savedEmail);
        setMode("password");
        Toast.show({ type: "info", text1: "Entre com sua senha", text2: "Credenciais biométricas precisam ser atualizadas" });
      }
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const result = await doLogin(data.identifier, data.password);

      if (bioAvailable && !(await isBiometricEnabled())) {
        Alert.alert(
          "Ativar login biométrico",
          "Deseja usar biometria (digital / Face ID) para entrar da próxima vez?",
          [
            { text: "Agora não", style: "cancel", onPress: () => navigateAfterLogin(result.user) },
            {
              text: "Ativar",
              onPress: async () => {
                await enableBiometric(data.identifier, data.password);
                navigateAfterLogin(result.user);
              },
            },
          ]
        );
      } else {
        navigateAfterLogin(result.user);
      }
    } catch (err: any) {
      if (err?.message === "ADMIN_BLOCKED") {
        Toast.show({ type: "error", text1: "Acesso negado", text2: "Administradores devem usar o painel web" });
      } else {
        const message = err?.response?.data?.message || err?.message || "Erro ao fazer login";
        Toast.show({ type: "error", text1: "Erro", text2: message });
      }
    } finally {
      setLoading(false);
    }
  };

  const switchToPassword = () => {
    if (savedEmail) setValue("identifier", savedEmail);
    setMode("password");
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Package2 size={38} color="#ffffff" />
          </View>
          <Text style={styles.heroTitle}>Unecondo</Text>
          <Text style={styles.heroSub}>Gestão Inteligente de Condomínios</Text>
        </View>

        <View style={styles.body}>

          {mode === "loading" && <View style={{ height: 120 }} />}

          {mode === "biometric" && (
            <>
              <Text style={styles.greeting}>Bem-vindo de volta</Text>
              <Text style={styles.sub}>Use sua biometria para entrar</Text>

              <View style={styles.bioCenter}>
                <Text style={styles.bioEmail}>{savedEmail}</Text>

                <TouchableOpacity
                  onPress={triggerBiometric}
                  disabled={loading}
                  style={[styles.bioBtn, loading && styles.bioBtnLoading]}
                  activeOpacity={0.8}
                >
                  <Fingerprint size={44} color="#ffffff" />
                </TouchableOpacity>

                <Text style={styles.bioHint}>
                  {loading ? "Autenticando..." : "Toque para entrar"}
                </Text>
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity onPress={switchToPassword} disabled={loading} style={styles.switchBtn}>
                <Text style={styles.switchBtnText}>Usar senha</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === "password" && (
            <>
              <Text style={styles.greeting}>Bem-vindo</Text>
              <Text style={styles.sub}>Acesso para moradores e síndicos</Text>

              {savedAccounts.length > 0 && (
                <View style={styles.savedSection}>
                  <Text style={styles.savedLabel}>CONTAS SALVAS</Text>
                  {savedAccounts.map((account) => {
                    const initials = account.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
                    return (
                      <TouchableOpacity
                        key={account.email}
                        onPress={() => quickLogin(account)}
                        disabled={loading}
                        activeOpacity={0.75}
                        style={styles.accountChip}
                      >
                        <View style={styles.accountAvatar}>
                          <Text style={styles.accountAvatarText}>{initials}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.accountName}>{account.name}</Text>
                          <Text style={styles.accountEmail}>{account.email}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleRemoveAccount(account.email)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          style={{ padding: 4 }}
                        >
                          <X size={14} color="#9ca3af" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>ou entre com outra conta</Text>
                    <View style={styles.dividerLine} />
                  </View>
                </View>
              )}

              <Controller
                control={control}
                name="identifier"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="E-mail ou CPF"
                    placeholder="seu@email.com ou 000.000.000-00"
                    autoCapitalize="none"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.identifier?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value, onBlur } }) => (
                  <View>
                    <Input
                      label="Senha"
                      placeholder="••••••••"
                      secureTextEntry={!showPassword}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.password?.message}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword((p) => !p)}
                      style={styles.eyeBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {showPassword
                        ? <EyeOff size={20} color="#9ca3af" />
                        : <Eye size={20} color="#9ca3af" />}
                    </TouchableOpacity>
                  </View>
                )}
              />

              <Button title="Entrar" loading={loading} onPress={handleSubmit(onSubmit)} />

              {bioAvailable && savedEmail && (
                <TouchableOpacity
                  onPress={() => { autoTriggered.current = false; setMode("biometric"); }}
                  disabled={loading}
                  style={styles.switchBtn}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Fingerprint size={16} color="#f97316" />
                    <Text style={styles.switchBtnText}>Usar biometria</Text>
                  </View>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  hero: {
    paddingTop: 80,
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#f97316",
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 6,
    textAlign: "center",
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  sub: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 28,
  },
  bioCenter: {
    alignItems: "center",
    paddingVertical: 24,
  },
  bioEmail: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 32,
  },
  bioBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f97316",
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  bioBtnLoading: {
    backgroundColor: "#fdba74",
    elevation: 4,
  },
  bioHint: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 20,
    fontWeight: "500",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ffffff",
  },
  dividerText: {
    fontSize: 12,
    color: "#9ca3af",
    marginHorizontal: 12,
  },
  switchBtn: {
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  switchBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f97316",
  },
  savedSection: {
    marginBottom: 8,
  },
  savedLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  accountChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    marginBottom: 8,
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f9731620",
    borderWidth: 1,
    borderColor: "#f9731640",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  accountAvatarText: {
    color: "#f97316",
    fontSize: 14,
    fontWeight: "700",
  },
  accountName: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  accountEmail: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 1,
  },
  eyeBtn: {
    position: "absolute",
    right: 16,
    top: 36,
  },
});
