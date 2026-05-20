import { api, extractData } from "./api";
import { Visitor, VisitorStatus } from "../types";

export async function getVisitors(params?: {
  status?: VisitorStatus;
  condoId?: string;
}): Promise<Visitor[]> {
  const response = await api.get("/visitors", { params: params ?? {} });
  return extractData<Visitor[]>(response);
}

export async function getMyVisitors(): Promise<Visitor[]> {
  const response = await api.get("/visitors/mine");
  return extractData<Visitor[]>(response);
}

export async function getVisitor(id: string): Promise<Visitor> {
  const response = await api.get(`/visitors/${id}`);
  return extractData<Visitor>(response);
}

export async function createVisitor(data: {
  name: string;
  document?: string;
  unitId: string;
  residentId?: string;
  purpose?: string;
  notes?: string;
}): Promise<Visitor> {
  const response = await api.post("/visitors", data);
  return extractData<Visitor>(response);
}

export async function updateVisitorStatus(
  id: string,
  status: VisitorStatus,
  notes?: string
): Promise<Visitor> {
  const response = await api.patch(`/visitors/${id}/status`, { status, notes });
  return extractData<Visitor>(response);
}

export async function validateVisitorQr(token: string): Promise<Visitor> {
  const response = await api.get("/visitors/validate-qr", { params: { token } });
  return extractData<Visitor>(response);
}

export async function deleteVisitor(id: string): Promise<void> {
  await api.delete(`/visitors/${id}`);
}
