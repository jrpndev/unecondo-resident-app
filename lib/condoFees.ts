import { api, extractData } from "./api";

export type FeeStatus = "PENDING" | "CONFIRMED" | "OVERDUE" | "CANCELLED";

export interface CondoFee {
  id: string;
  condoId: string;
  unitId: string;
  residentId?: string;
  amount: number;
  month: number;
  year: number;
  dueDate: string;
  asaasChargeId?: string;
  status: FeeStatus;
  paidAt?: string;
  pixQrCode?: string;
  pixKey?: string;
  invoiceUrl?: string;
  createdAt: string;
}

export async function getMyCondoFees(): Promise<CondoFee[]> {
  const response = await api.get("/condo-fees/mine");
  return extractData<CondoFee[]>(response);
}

export interface CreditCardData {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export async function payFeeWithCard(feeId: string, creditCard: CreditCardData): Promise<CondoFee> {
  const response = await api.post(`/condo-fees/fees/${feeId}/pay-card`, { creditCard });
  return extractData<CondoFee>(response);
}
