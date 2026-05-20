import { api, extractData } from "./api";
import { Unit, Resident } from "../types";

export async function getUnits(condoId?: string): Promise<Unit[]> {
  const response = await api.get("/units", { params: condoId ? { condoId } : {} });
  return extractData<Unit[]>(response);
}

export async function getUnit(id: string): Promise<Unit & { residents: Resident[] }> {
  const response = await api.get(`/units/${id}`);
  return extractData<Unit & { residents: Resident[] }>(response);
}

export async function createUnit(data: {
  number: string;
  floor?: number;
  block?: string;
  condoId: string;
}): Promise<Unit> {
  const response = await api.post("/units", data);
  return extractData<Unit>(response);
}

export async function deleteUnit(id: string): Promise<void> {
  await api.delete(`/units/${id}`);
}
