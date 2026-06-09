import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

export type ThemeMode = 'dark' | 'light' | 'system'

const THEME_KEY = 'APP_THEME'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => Promise<void>
  loadSaved: () => Promise<void>
}

// Tema branco permanente: o app é travado em 'light'. setMode/loadSaved
// não alteram mais o tema (mantidos para compatibilidade de interface) —
// isso garante branco mesmo para usuários com 'dark' salvo no aparelho.
export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'light',
  setMode: async () => {
    set({ mode: 'light' })
    await SecureStore.setItemAsync(THEME_KEY, 'light')
  },
  loadSaved: async () => {
    set({ mode: 'light' })
  },
}))
