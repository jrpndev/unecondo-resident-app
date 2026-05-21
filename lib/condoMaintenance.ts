import { api } from './api';

export interface MaintenanceItem {
  id: string;
  title: string;
  description?: string;
  location?: string;
  scheduledDate: string;
  recurrence?: string;
  isDone: boolean;
  doneAt?: string;
  createdAt: string;
}

export async function getMaintenanceItems(): Promise<MaintenanceItem[]> {
  const res = await api.get('/maintenance');
  return res.data?.data ?? res.data ?? [];
}
