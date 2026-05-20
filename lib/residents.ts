import { api, extractData } from "./api";
import { Resident } from "../types";

export async function getResidents(params?: { unitId?: string; condoId?: string }): Promise<Resident[]> {
  const response = await api.get("/residents", { params: params ?? {} });
  return extractData<Resident[]>(response);
}

export async function getResident(id: string): Promise<Resident> {
  const response = await api.get(`/residents/${id}`);
  return extractData<Resident>(response);
}

export async function createResident(data: {
  name: string;
  email?: string;
  phone?: string;
  unitId: string;
}): Promise<Resident> {
  const response = await api.post("/residents", data);
  return extractData<Resident>(response);
}

export async function updateResident(
  id: string,
  data: Partial<{ name: string; email: string; phone: string }>
): Promise<Resident> {
  const response = await api.put(`/residents/${id}`, data);
  return extractData<Resident>(response);
}

export async function deleteResident(id: string): Promise<void> {
  await api.delete(`/residents/${id}`);
}

export async function validateQrToken(token: string): Promise<{
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  unitId: string;
  unit?: { id: string; number: string; block?: string | null };
}> {
  const response = await api.get("/residents/validate-qr", { params: { token } });
  return extractData(response);
}
