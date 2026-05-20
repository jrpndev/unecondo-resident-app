import "../global.css";
import React, { useEffect, useRef, useState } from "react";
import { useColorScheme } from "nativewind";
import { useColorScheme as useDeviceColorScheme } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useThemeStore } from "../store/theme";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import * as ExpoSplashScreen from "expo-splash-screen";
import Constants from "expo-constants";
import * as ScreenOrientation from "expo-screen-orientation";
import { useAuthStore } from "../store/auth";
import { getToken } from "../lib/auth";
import { api, setUnauthorizedHandler } from "../lib/api";
import Toast from "react-native-toast-message";
import { SplashScreen } from "../components/SplashScreen";
import { SuspendedScreen } from "../components/SuspendedScreen";
import { MaintenanceModal } from "../components/MaintenanceModal";
import { queryClient } from "../lib/queryClient";
import { getCondoStatus, isCondoBlocked, condoBlockedMessage, type CondoStatus } from "../lib/billing";
import { getMaintenanceStatus } from "../lib/maintenance";
import { checkAppVersion } from "../lib/version";
import { UpdateScreen } from "../components/UpdateScreen";

ExpoSplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { setColorScheme } = useColorScheme();
  const deviceScheme = useDeviceColorScheme();
  const { mode, loadSaved } = useThemeStore();
  const { setAuth, setLoading, logout, isLoading } = useAuthStore();
  const [authDone, setAuthDone]         = useState(false);
  const [splashDone, setSplashDone]     = useState(false);
  const [appVisible, setAppVisible]     = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [condoBlock, setCondoBlock]     = useState<{ status: CondoStatus; message: string } | null>(null);
  const [maintenance, setMaintenance]   = useState<{ active: boolean; msg: string | null } | null>(null);
  const [updateRequired, setUpdateRequired] = useState<{ downloadUrl: string } | null>(null);
  const [checkingMaint, setCheckingMaint] = useState(false);
  const router = useRouter();
  const notificationListener = useRef<{ remove: () => void } | undefined>();
  const responseListener     = useRef<{ remove: () => void } | undefined>();

  const splashOpacity = useSharedValue(1);

  const splashStyle = useAnimatedStyle(() => ({
    opacity:  splashOpacity.value,
    position: "absolute" as const,
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10,
  }));

  async function checkMaintenance(): Promise<boolean> {
    try {
      const status = await getMaintenanceStatus();
      setMaintenance({ active: status.maintenanceMode, msg: status.maintenanceMsg });
      return status.maintenanceMode;
    } catch {
      return false; // falha silenciosa — não bloqueia o app
    }
  }

  async function init() {
    setNetworkError(false);
    setCondoBlock(null);

    // Verifica versão mínima antes de tudo
    const { outdated, downloadUrl } = await checkAppVersion();
    if (outdated) {
      setUpdateRequired({ downloadUrl });
      setLoading(false);
      setAuthDone(true);
      ExpoSplashScreen.hideAsync();
      return;
    }

    // Verifica manutenção antes de tudo (endpoint público)
    const isUnderMaintenance = await checkMaintenance();
    if (isUnderMaintenance) {
      setLoading(false);
      setAuthDone(true);
      ExpoSplashScreen.hideAsync();
      return;
    }

    try {
      const token = await getToken();
      if (token) {
        const res = await api.get("/auth/me");
        const user = res.data.data;
        await setAuth(token, user);

        // Check condo status for DOORMAN / CONDO_ADMIN
        if (user.condoId && (user.role === 'DOORMAN' || user.role === 'CONDO_ADMIN')) {
          try {
            const status = await getCondoStatus(user.condoId);
            if (isCondoBlocked(status.status)) {
              setCondoBlock({
                status: status.status,
                message: condoBlockedMessage(status.status, status.name),
              });
            }
          } catch {
            // Billing check failure is non-fatal — let the user in
          }
        }
      }
    } catch (err: any) {
      if (err?.isNetworkError) {
        setNetworkError(true);
      } else {
        await logout();
      }
    } finally {
      setLoading(false);
      setAuthDone(true);
      ExpoSplashScreen.hideAsync();
    }
  }

  // Registra o handler de token expirado — qualquer 401 com Bearer token dispara logout automático
  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await logout();
      Toast.show({
        type: "error",
        text1: "Sessão expirada",
        text2: "Faça login novamente.",
        visibilityTime: 4000,
      });
      router.replace("/(auth)/login");
    });
  }, [logout, router]);

  // Load saved theme preference, then apply it
  useEffect(() => { loadSaved(); }, []);
  useEffect(() => {
    const effective = mode === "system" ? (deviceScheme ?? "dark") : mode;
    setColorScheme(effective);
  }, [mode, deviceScheme]);

  useEffect(() => { init(); }, []);

  // Polling de manutenção a cada 30 s — quando sair da manutenção, reinicia o app
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const status = await getMaintenanceStatus();
        const wasActive = maintenance?.active ?? false;
        setMaintenance({ active: status.maintenanceMode, msg: status.maintenanceMsg });
        if (wasActive && !status.maintenanceMode) {
          // Manutenção terminou: reinicia o fluxo de autenticação
          setAuthDone(false);
          init();
        }
      } catch {
        // silencioso
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [maintenance?.active]);

  // Lock the app to portrait globally; the signature screen will temporarily unlock.
  useEffect(() => {
    try {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } catch {}
  }, []);

  // Notification listeners — skipped entirely in Expo Go (SDK 53 removed push support).
  // In development builds and production, expo-notifications is loaded via require()
  // to avoid the static import triggering DevicePushTokenAutoRegistration side effects.
  const isExpoGo = Constants.appOwnership === "expo";
  useEffect(() => {
    if (isExpoGo) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Notifications = require("expo-notifications");
      notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
        const { title, body } = notification.request.content;
        Toast.show({ type: "info", text1: title ?? "Unecondo", text2: body ?? undefined, visibilityTime: 5000 });
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response.notification.request.content.data as any;
        if (data?.packageId) {
          router.push(`/package/${data.packageId}`);
        } else if (data?.feeId) {
          router.push("/(tabs)/financial");
        } else {
          router.push("/(tabs)/home");
        }
      });
    } catch {}

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  // Once both auth and min splash time are done, fade out
  useEffect(() => {
    if (authDone && splashDone) {
      splashOpacity.value = withTiming(0, { duration: 350 }, (finished) => {
        if (finished) runOnJS(setAppVisible)(true);
      });
    }
  }, [authDone, splashDone]);

  // Atualização obrigatória — bloqueia tudo antes de qualquer outra tela
  if (appVisible && updateRequired) {
    return (
      <QueryClientProvider client={queryClient}>
        <UpdateScreen downloadUrl={updateRequired.downloadUrl} />
        <Toast />
      </QueryClientProvider>
    );
  }

  // Manutenção — bloqueia tudo antes de qualquer outra tela
  if (appVisible && maintenance?.active) {
    return (
      <QueryClientProvider client={queryClient}>
        <MaintenanceModal
          message={maintenance.msg}
          checking={checkingMaint}
          onRetry={async () => {
            setCheckingMaint(true);
            try {
              const status = await getMaintenanceStatus();
              setMaintenance({ active: status.maintenanceMode, msg: status.maintenanceMsg });
              if (!status.maintenanceMode) {
                setAuthDone(false);
                init();
              }
            } catch {
              // mantém o modal
            } finally {
              setCheckingMaint(false);
            }
          }}
        />
        <Toast />
      </QueryClientProvider>
    );
  }

  // Show blocked screens before app renders
  if (appVisible && networkError) {
    return (
      <QueryClientProvider client={queryClient}>
        <SuspendedScreen
          type="network"
          message="Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."
          onRetry={() => { setAuthDone(false); init(); }}
        />
        <Toast />
      </QueryClientProvider>
    );
  }

  if (appVisible && condoBlock) {
    return (
      <QueryClientProvider client={queryClient}>
        <SuspendedScreen
          type="suspended"
          message={condoBlock.message}
          onRetry={() => { setCondoBlock(null); setAuthDone(false); init(); }}
        />
        <Toast />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" backgroundColor="#f97316" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0f172a" },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="change-password" />
        <Stack.Screen name="settings" />
      </Stack>
      <Toast />

      {!appVisible && (
        <Animated.View style={splashStyle}>
          <SplashScreen onFinish={() => setSplashDone(true)} />
        </Animated.View>
      )}
    </QueryClientProvider>
  );
}
