import { api } from './api';

export interface TicketMessage {
  id: string;
  ticketId: string;
  userId: string;
  body: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  messages: TicketMessage[];
}

export async function getTickets(): Promise<Ticket[]> {
  const res = await api.get('/tickets');
  return res.data?.data ?? res.data ?? [];
}

export async function createTicket(data: { title: string; description: string; category: string; priority: string }): Promise<Ticket> {
  const res = await api.post('/tickets', data);
  return res.data?.data ?? res.data;
}

export async function addTicketMessage(ticketId: string, body: string): Promise<TicketMessage> {
  const res = await api.post(`/tickets/${ticketId}/messages`, { body });
  return res.data?.data ?? res.data;
}
