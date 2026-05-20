import * as SecureStore from "expo-secure-store";

const KEY = "saved_accounts";

export interface SavedAccount {
  email: string;
  password: string;
  name: string;
  role: string;
  lastUsed: string;
}

export async function getSavedAccounts(): Promise<SavedAccount[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedAccount[];
  } catch {
    return [];
  }
}

export async function addSavedAccount(account: Omit<SavedAccount, "lastUsed">): Promise<void> {
  const accounts = await getSavedAccounts();
  const existing = accounts.findIndex((a) => a.email === account.email);
  const entry: SavedAccount = { ...account, lastUsed: new Date().toISOString() };
  if (existing >= 0) {
    accounts[existing] = entry;
  } else {
    accounts.push(entry);
  }
  // Keep at most 5 accounts, most recent first
  accounts.sort((a, b) => b.lastUsed.localeCompare(a.lastUsed));
  const trimmed = accounts.slice(0, 5);
  await SecureStore.setItemAsync(KEY, JSON.stringify(trimmed));
}

export async function removeSavedAccount(email: string): Promise<void> {
  const accounts = await getSavedAccounts();
  const filtered = accounts.filter((a) => a.email !== email);
  await SecureStore.setItemAsync(KEY, JSON.stringify(filtered));
}

export async function updateLastUsed(email: string): Promise<void> {
  const accounts = await getSavedAccounts();
  const idx = accounts.findIndex((a) => a.email === email);
  if (idx >= 0) {
    accounts[idx].lastUsed = new Date().toISOString();
    await SecureStore.setItemAsync(KEY, JSON.stringify(accounts));
  }
}
