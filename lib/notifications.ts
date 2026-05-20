import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "./api";

export const NOTIF_PREF_KEY = "notificationsEnabled";

// expo-notifications push (remote) functionality was removed from Expo Go in SDK 53.
// Avoid loading the module entirely when running inside Expo Go — even a static import
// triggers DevicePushTokenAutoRegistration side effects that crash the app.
const isExpoGo = Constants.appOwnership === "expo";

if (!isExpoGo) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {}
}

async function setupAndroidChannel() {
  if (Platform.OS !== "android") return;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Notifications = require("expo-notifications");
  await Notifications.setNotificationChannelAsync("packages", {
    name: "Encomendas",
    importance: Notifications.AndroidImportance.MAX,
    sound: "package_arrival.wav",
    vibrationPattern: [0, 300, 200, 300],
    lightColor: "#f97316",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
  });
}

/**
 * Requests permission, gets the Expo Push Token and saves it to the backend.
 * Call this right after a successful login.
 */
export async function registerPushToken(): Promise<void> {
  if (isExpoGo) return;
  try {
    if (!Device.isDevice) return;

    const pref = await SecureStore.getItemAsync(NOTIF_PREF_KEY);
    if (pref === "false") return;

    await setupAndroidChannel();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require("expo-notifications");
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "bd38d81c-a220-4efa-9000-0f5d8987e53a",
    });

    await api.patch("/auth/me/push-token", { pushToken: tokenData.data });
  } catch {
    // Non-critical — notification registration failures should never break the app
  }
}

/** Remove o push token do backend (desativa notificações push) */
export async function clearPushToken(): Promise<void> {
  try {
    await api.patch("/auth/me/push-token", { pushToken: null });
  } catch {
    // Non-critical
  }
}
