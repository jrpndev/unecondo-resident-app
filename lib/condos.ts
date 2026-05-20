import { api, extractData } from "./api";
import { Condo } from "../types";

export async function getCondos(): Promise<Condo[]> {
  const response = await api.get("/condos");
  return extractData<Condo[]>(response);
}

export async function getCondo(id: string): Promise<Condo & { units: any[] }> {
  const response = await api.get(`/condos/${id}`);
  return extractData<Condo & { units: any[] }>(response);
}

export async function createCondo(data: {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}): Promise<Condo> {
  const response = await api.post("/condos", data);
  return extractData<Condo>(response);
}

export async function updateCondo(
  id: string,
  data: Partial<{ name: string; address: string; city: string; state: string; zipCode: string }>
): Promise<Condo> {
  const response = await api.put(`/condos/${id}`, data);
  return extractData<Condo>(response);
}

export async function deleteCondo(id: string): Promise<void> {
  await api.delete(`/condos/${id}`);
}
