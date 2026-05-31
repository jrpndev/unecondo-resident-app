import React, { useState } from "react";
import {
  View, Text, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { changeMyPassword } from "../lib/auth";
import { useAuthStore } from "../store/auth";
import { Input } from "../components/Input";
import { Button } from "../components/Button";

const schema = z
  .object({
    newPassword: z.string().min(6, "Mínimo 6 caracteres"),
    confirm: z.string().min(6, "Mínimo 6 caracteres"),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  });

type FormData = z.infer<typeof schema>;

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await changeMyPassword(data.newPassword);
      if (user) setUser({ ...user, mustChangePassword: false });
      Toast.show({ type: "success", text1: "Senha criada!", text2: "Bem-vindo ao Unecondo" });
      router.replace("/(tabs)/home");
    } catch {
      Toast.show({ type: "error", text1: "Erro", text2: "Não foi possível alterar a senha" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <KeyRound size={38} color="#ffffff" />
          </View>
          <Text style={styles.heroTitle}>Crie sua senha</Text>
          <Text style={styles.heroSub}>
            Este é seu primeiro acesso. Defina uma senha pessoal para continuar.
          </Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.greeting}>Olá, {user?.name?.split(" ")[0]}!</Text>
          <Text style={styles.sub}>
            Por segurança, crie uma nova senha antes de continuar.
          </Text>

          <Controller control={control} name="newPassword"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input label="Nova senha" placeholder="Mínimo 6 caracteres"
                secureTextEntry value={value} onChangeText={onChange}
                onBlur={onBlur} error={errors.newPassword?.message} />
            )}
          />
          <Controller control={control} name="confirm"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input label="Confirmar senha" placeholder="Repita a nova senha"
                secureTextEntry value={value} onChangeText={onChange}
                onBlur={onBlur} error={errors.confirm?.message} />
            )}
          />
          <Button title="Criar senha e entrar" loading={loading} onPress={handleSubmit(onSubmit)} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#111111" },
  hero: {
    paddingTop: 80, paddingBottom: 48, paddingHorizontal: 32, alignItems: "center",
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#f97316",
    alignItems: "center", justifyContent: "center", marginBottom: 22,
    shadowColor: "#f97316", shadowOpacity: 0.4, shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 }, elevation: 14,
  },
  heroTitle: { fontSize: 28, fontWeight: "800", color: "#ffffff", textAlign: "center" },
  heroSub: {
    fontSize: 14, color: "#9a9a9a", marginTop: 8,
    textAlign: "center", lineHeight: 20,
  },
  body: { flex: 1, paddingHorizontal: 24, paddingBottom: 40 },
  greeting: { fontSize: 22, fontWeight: "700", color: "#ffffff", marginBottom: 6 },
  sub: { fontSize: 14, color: "#9a9a9a", marginBottom: 28, lineHeight: 20 },
});
