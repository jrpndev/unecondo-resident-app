import * as SecureStore from "expo-secure-store";
import { api, extractData } from "./api";
import { AuthResponse, User } from "../types";

export async function login(identifier: string, password: string): Promise<AuthResponse> {
  const response = await api.post("/auth/login", { identifier, password });
  return extractData<AuthResponse>(response);
}

export async function register(data: {
  email: string;
  password: string;
  name: string;
  role: "ADMIN" | "DOORMAN";
  condoId?: string;
}): Promise<AuthResponse> {
  const response = await api.post("/auth/register", data);
  return extractData<AuthResponse>(response);
}

export async function getMe(): Promise<User> {
  const response = await api.get("/auth/me");
  return extractData<User>(response);
}

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync("token", token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("token");
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync("token");
}

export async function saveRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync("refreshToken", token);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync("refreshToken");
}

export async function removeRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync("refreshToken");
}

export async function changeMyPassword(newPassword: string): Promise<void> {
  await api.patch("/auth/me/password", { newPassword });
}
