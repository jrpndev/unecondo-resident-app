import { api } from './api';

export interface Document {
  id: string;
  condoId: string;
  title: string;
  category: string;
  fileKey: string;
  fileUrl?: string;
  fileMime?: string;
  createdAt: string;
}

export async function getDocuments(): Promise<Document[]> {
  const res = await api.get('/documents');
  return res.data?.data ?? res.data ?? [];
}
