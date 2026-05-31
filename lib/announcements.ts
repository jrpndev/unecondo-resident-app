import { api, extractData } from "./api";

export interface Announcement {
  id: string;
  condoId: string;
  title: string;
  body: string;
  imageUrl?: string;
  isPinned: boolean;
  startsAt?: string;
  expiresAt?: string;
  createdById: string;
  createdAt: string;
  reads?: { readAt: string }[];
}

export async function getAnnouncements(condoId?: string): Promise<Announcement[]> {
  const response = await api.get("/announcements", { params: condoId ? { condoId } : {} });
  return extractData<Announcement[]>(response);
}

export async function markAnnouncementRead(id: string): Promise<void> {
  await api.post(`/announcements/${id}/read`);
}

export async function createAnnouncement(data: {
  title: string;
  body: string;
  isPinned?: boolean;
  startsAt?: string;
  expiresAt?: string;
  displayDurationDays?: number;
}): Promise<Announcement> {
  const response = await api.post("/announcements", data);
  return extractData<Announcement>(response);
}

export async function updateAnnouncement(id: string, data: {
  title?: string;
  body?: string;
  isPinned?: boolean;
  startsAt?: string;
  expiresAt?: string;
  displayDurationDays?: number;
}): Promise<Announcement> {
  const response = await api.patch(`/announcements/${id}`, data);
  return extractData<Announcement>(response);
}
