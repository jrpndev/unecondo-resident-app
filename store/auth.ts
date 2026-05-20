import { create } from "zustand";
import { User } from "../types";
import { removeToken, saveToken, saveRefreshToken, removeRefreshToken } from "../lib/auth";
import { queryClient } from "../lib/queryClient";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (token: string, user: User, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  setAuth: async (token, user, refreshToken) => {
    await saveToken(token);
    if (refreshToken) await saveRefreshToken(refreshToken);
    set({ token, user });
  },
  logout: async () => {
    await removeToken();
    await removeRefreshToken();
    queryClient.clear();
    set({ token: null, user: null });
  },
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));
