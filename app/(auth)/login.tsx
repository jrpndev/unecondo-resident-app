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

  const [mode, setMode]                 = useState<ViewMode>("loading");
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [savedEmail, setSavedEmail]     = useState("");
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const autoTriggered                   = useRef(false);

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
    if (result.user.role === "ADMIN" || result.user.role === "CONDO_ADMIN") {
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
        Toast.show({ type: "error", text1: "Acesso negado", text2: "Administradores e síndicos devem usar o painel web" });
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
        Toast.show({ type: "error", text1: "Acesso negado", text2: "Administradores e síndicos devem usar o painel web" });
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
        Toast.show({ type: "error", text1: "Acesso negado", text2: "Administradores e síndicos devem usar o painel web" });
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
      className="flex-1 bg-gray-950"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Orange header */}
        <View className="bg-primary-500 pt-20 pb-12 px-6 items-center rounded-b-[40px]">
          <View className="w-20 h-20 bg-white/20 rounded-3xl items-center justify-center mb-4">
            <Package2 size={40} color="white" />
          </View>
          <Text className="text-white text-3xl font-bold">Unecondo</Text>
          <Text className="text-white/70 text-sm mt-1">Gestão Inteligente de Encomendas</Text>
        </View>

        <View className="flex-1 px-6 pt-8">

          {mode === "loading" && <View style={{ height: 120 }} />}

          {mode === "biometric" && (
            <>
              <Text className="text-white text-2xl font-bold mb-1">Bem-vindo de volta</Text>
              <Text className="text-gray-400 text-sm mb-8">Use sua biometria para entrar</Text>

              <View className="items-center py-6">
                <Text className="text-gray-400 text-sm mb-8">{savedEmail}</Text>

                <TouchableOpacity
                  onPress={triggerBiometric}
                  disabled={loading}
                  style={[styles.bioButton, loading && styles.bioButtonLoading]}
                  activeOpacity={0.8}
                >
                  <Fingerprint size={46} color="white" />
                </TouchableOpacity>

                <Text className="text-gray-500 text-sm mt-5 font-medium">
                  {loading ? "Autenticando..." : "Toque para entrar"}
                </Text>
              </View>

              <View className="flex-row items-center my-4">
                <View className="flex-1 h-px bg-gray-800" />
                <Text className="text-gray-600 text-xs mx-3">ou</Text>
                <View className="flex-1 h-px bg-gray-800" />
              </View>

              <TouchableOpacity
                onPress={switchToPassword}
                disabled={loading}
                className="py-3 items-center"
              >
                <Text className="text-primary-500 font-bold text-sm">Usar senha</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === "password" && (
            <>
              <Text className="text-white text-2xl font-bold mb-1">Bem-vindo</Text>
              <Text className="text-gray-400 text-sm mb-8">Acesso exclusivo para moradores</Text>

              {savedAccounts.length > 0 && (
                <View className="mb-6">
                  <Text className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">
                    Contas salvas
                  </Text>
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
                          <X size={14} color="#6b7280" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                  <View className="flex-row items-center my-4">
                    <View className="flex-1 h-px bg-gray-800" />
                    <Text className="text-gray-600 text-xs mx-3">ou entre com outra conta</Text>
                    <View className="flex-1 h-px bg-gray-800" />
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
                      className="absolute right-4 top-9"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {showPassword
                        ? <EyeOff size={20} color="#6b7280" />
                        : <Eye size={20} color="#6b7280" />}
                    </TouchableOpacity>
                  </View>
                )}
              />

              <Button title="Entrar" loading={loading} onPress={handleSubmit(onSubmit)} />

              {bioAvailable && savedEmail && (
                <TouchableOpacity
                  onPress={() => { autoTriggered.current = false; setMode("biometric"); }}
                  disabled={loading}
                  className="py-3 items-center mt-2"
                >
                  <View className="flex-row items-center gap-1.5">
                    <Fingerprint size={16} color="#f97316" />
                    <Text className="text-primary-500 font-bold text-sm">Usar biometria</Text>
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
  bioButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f97316",
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  bioButtonLoading: {
    backgroundColor: "#fdba74",
    elevation: 4,
  },
  accountChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 12,
    marginBottom: 8,
  },
  accountAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#7c2d12",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  accountAvatarText: {
    color: "#fdba74",
    fontSize: 13,
    fontWeight: "700",
  },
  accountName: {
    color: "#f9fafb",
    fontSize: 14,
    fontWeight: "600",
  },
  accountEmail: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 1,
  },
});
