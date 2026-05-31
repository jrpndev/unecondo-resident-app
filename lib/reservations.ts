import { api, extractData } from "./api";

export interface Space {
  id: string;
  condoId: string;
  name: string;
  description?: string;
  capacity?: number;
  imageUrl?: string;
  price?: number | null;
  rules?: string;
  isActive: boolean;
}

export type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";
export type ReservationPaymentStatus = "EXEMPT" | "PENDING_PAYMENT" | "PAID";

export interface Reservation {
  id: string;
  spaceId: string;
  condoId: string;
  residentId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  paymentStatus?: ReservationPaymentStatus;
  totalAmount?: number | null;
  pixCopiaECola?: string | null;
  notes?: string;
  space?: Space;
  createdAt: string;
}

export async function getSpaces(condoId?: string): Promise<Space[]> {
  const response = await api.get("/spaces", { params: condoId ? { condoId } : {} });
  return extractData<Space[]>(response);
}

export async function getMyReservations(): Promise<Reservation[]> {
  const response = await api.get("/reservations/mine");
  return extractData<Reservation[]>(response);
}

export async function createReservation(data: {
  spaceId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
  paymentMethod?: 'PIX' | 'CREDIT_CARD';
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
}): Promise<Reservation> {
  const response = await api.post("/reservations", data);
  return extractData<Reservation>(response);
}

export async function updateReservationStatus(
  id: string,
  status: ReservationStatus
): Promise<Reservation> {
  const response = await api.patch(`/reservations/${id}/status`, { status });
  return extractData<Reservation>(response);
}

export async function rescheduleReservation(id: string, data: {
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
}): Promise<Reservation> {
  const response = await api.patch(`/reservations/${id}`, data);
  return extractData<Reservation>(response);
}

export async function getReservedDates(spaceId: string, year: number, month: number): Promise<string[]> {
  const response = await api.get(`/spaces/${spaceId}/reserved-dates`, { params: { year, month } });
  return extractData<string[]>(response);
}
