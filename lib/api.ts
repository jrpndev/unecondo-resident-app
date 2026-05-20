import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";

export const BASE_URL = "https://api.unecondo.online";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

// Callback registrado pelo _layout para deslogar quando o refresh também falha
let _onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(fn: () => void) {
  _onUnauthorized = fn;
}

// Deduplicação: múltiplas requisições com 401 simultâneo compartilham o mesmo refresh
let _refreshPromise: Promise<void> | null = null;

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!error.response) {
      if (
        error.code === "ECONNABORTED" ||
        error.code === "ERR_NETWORK" ||
        error.message === "Network Error"
      ) {
        const networkError = new Error(
          "Sem conexão com a internet. Verifique sua rede e tente novamente."
        ) as any;
        networkError.isNetworkError = true;
        return Promise.reject(networkError);
      }
      return Promise.reject(error);
    }

    // Token expirado — tenta refresh silencioso uma vez
    // Só dispara quando: é 401, havia um token na request, e ainda não retryed
    if (
      error.response.status === 401 &&
      originalRequest?.headers?.Authorization &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        // Múltiplas requests com 401 ao mesmo tempo compartilham um único refresh
        if (!_refreshPromise) {
          _refreshPromise = (async () => {
            const refreshToken = await SecureStore.getItemAsync("refreshToken");
            if (!refreshToken) throw new Error("no_refresh_token");

            const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
            const { access_token, refresh_token } = res.data.data;

            await SecureStore.setItemAsync("token", access_token);
            await SecureStore.setItemAsync("refreshToken", refresh_token);
          })();
        }

        await _refreshPromise;
        _refreshPromise = null;

        // Reexecuta a requisição original com o novo token
        const newToken = await SecureStore.getItemAsync("token");
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        _refreshPromise = null;
        // Refresh também falhou — força logout
        _onUnauthorized?.();
        const authError = new Error("Sessão expirada. Faça login novamente.") as any;
        authError.isAuthError = true;
        return Promise.reject(authError);
      }
    }

    return Promise.reject(error);
  }
);

export function extractData<T>(response: { data: { data: T } }): T {
  return response.data.data;
}
