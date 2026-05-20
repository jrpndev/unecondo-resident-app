import React, { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

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
            <KeyRound size={40} color="white" />
          </View>
          <Text className="text-white text-2xl font-bold">Crie sua senha</Text>
          <Text className="text-white/70 text-sm mt-1 text-center px-4">
            Este é seu primeiro acesso. Defina uma senha pessoal para continuar.
          </Text>
        </View>

        <View className="flex-1 px-6 pt-8">
          <Text className="text-white text-xl font-bold mb-1">
            Olá, {user?.name?.split(" ")[0]}!
          </Text>
          <Text className="text-gray-400 text-sm mb-8">
            Por segurança, você precisa criar uma nova senha antes de continuar.
          </Text>

          <Controller
            control={control}
            name="newPassword"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Nova senha"
                placeholder="Mínimo 6 caracteres"
                secureTextEntry
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.newPassword?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirm"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Confirmar senha"
                placeholder="Repita a nova senha"
                secureTextEntry
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirm?.message}
              />
            )}
          />

          <Button
            title="Criar senha e entrar"
            loading={loading}
            onPress={handleSubmit(onSubmit)}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
