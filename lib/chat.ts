import { api } from './api';

export interface ChatMessage {
  id: string;
  condoId: string;
  fromId: string;
  toId: string;
  body: string;
  readAt?: string;
  createdAt: string;
}

export async function getChatThread(userId: string): Promise<ChatMessage[]> {
  const res = await api.get(`/chat/thread/${userId}`);
  return res.data?.data ?? res.data ?? [];
}

export async function sendChatMessage(toId: string, body: string): Promise<ChatMessage> {
  const res = await api.post('/chat/messages', { toId, body });
  return res.data?.data ?? res.data;
}

export async function markChatRead(userId: string): Promise<void> {
  await api.patch(`/chat/thread/${userId}/read`);
}
