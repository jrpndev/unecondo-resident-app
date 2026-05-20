import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const KEYS = {
  enabled:  "biometric_enabled",
  email:    "biometric_email",
  password: "biometric_password",
};

export async function isBiometricSupported(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEYS.enabled)) === "true";
}

export async function enableBiometric(email: string, password: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.email, email);
  await SecureStore.setItemAsync(KEYS.password, password);
  await SecureStore.setItemAsync(KEYS.enabled, "true");
}

export async function disableBiometric(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.email);
  await SecureStore.deleteItemAsync(KEYS.password);
  await SecureStore.setItemAsync(KEYS.enabled, "false");
}

export async function getBiometricCredentials(): Promise<{ email: string; password: string } | null> {
  const [email, password] = await Promise.all([
    SecureStore.getItemAsync(KEYS.email),
    SecureStore.getItemAsync(KEYS.password),
  ]);
  if (!email || !password) return null;
  return { email, password };
}

export async function authenticate(promptMessage = "Confirme sua identidade"): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    fallbackLabel: "Usar senha",
    cancelLabel: "Cancelar",
    disableDeviceFallback: false,
  });
  return result.success;
}
