import { Redirect } from "expo-router";
import { useAuthStore } from "../store/auth";
import { LoadingScreen } from "../components/LoadingScreen";

export default function Index() {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (user) return <Redirect href="/(tabs)" />;
  return <Redirect href="/(auth)/login" />;
}
