import { api } from './api';

export interface AssemblyVote {
  id: string;
  itemId: string;
  userId: string;
  choice: 'YES' | 'NO' | 'ABSTAIN';
}

export interface AssemblyAgendaItem {
  id: string;
  title: string;
  description?: string;
  order: number;
  votes: AssemblyVote[];
}

export interface Assembly {
  id: string;
  title: string;
  description?: string;
  scheduledAt: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
  agendaItems: AssemblyAgendaItem[];
}

export async function getAssemblies(): Promise<Assembly[]> {
  const res = await api.get('/assemblies');
  return res.data?.data ?? res.data ?? [];
}

export async function castVote(itemId: string, choice: 'YES' | 'NO' | 'ABSTAIN'): Promise<AssemblyVote> {
  const res = await api.post(`/assemblies/items/${itemId}/vote`, { choice });
  return res.data?.data ?? res.data;
}
