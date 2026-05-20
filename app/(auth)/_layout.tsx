import { Stack } from "expo-router";
import { useAuthStore } from "../../store/auth";
import { Redirect } from "expo-router";

export default function AuthLayout() {
  const { user, isLoading } = useAuthStore();
  if (!isLoading && user && !user.mustChangePassword) return <Redirect href="/(tabs)" />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0f172a" } }} />
  );
}
