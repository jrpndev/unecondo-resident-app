import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

export type ThemeMode = 'dark' | 'light' | 'system'

const THEME_KEY = 'APP_THEME'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => Promise<void>
  loadSaved: () => Promise<void>
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  setMode: async (mode) => {
    set({ mode })
    await SecureStore.setItemAsync(THEME_KEY, mode)
  },
  loadSaved: async () => {
    try {
      const saved = await SecureStore.getItemAsync(THEME_KEY)
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        set({ mode: saved as ThemeMode })
      }
    } catch {}
  },
}))
