export type UserRole = "SUPER_ADMIN" | "ADMIN" | "DOORMAN" | "RESIDENT";
export type PackageStatus = "PENDING" | "DELIVERED" | "RETURNED";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  condoId: string | null;
  residentId?: string;
  mustChangePassword: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface Condo {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  _count: { units: number; users: number };
}

export interface Unit {
  id: string;
  number: string;
  floor: number | null;
  block: string | null;
  condoId: string;
  _count: { residents: number; packages: number };
}

export interface Resident {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  unitId: string;
  qrToken?: string;
  unit?: { id: string; number: string; block?: string | null };
}

export interface Package {
  id: string;
  trackingCode?: string;
  description?: string;
  status: PackageStatus;
  imageUrl?: string;
  signatureUrl?: string;
  senderName?: string;
  senderAddress?: string;
  recipientName?: string;
  recipientAddress?: string;
  weight?: string;
  orderId?: string;
  hubInfo?: string;
  origin?: string;
  category?: string;
  ocrRawText?: string;
  unitId: string;
  unit?: { id: string; number: string; block?: string | null; condo?: { id: string; name: string } };
  residentId?: string;
  resident?: { id: string; name: string; phone?: string | null } | null;
  receivedById?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type VisitorStatus = "EXPECTED" | "ARRIVED" | "LEFT" | "DENIED";

export interface Visitor {
  id: string;
  name: string;
  document?: string;
  photoUrl?: string;
  condoId: string;
  unitId: string;
  residentId?: string;
  purpose?: string;
  qrToken: string;
  status: VisitorStatus;
  arrivedAt?: string;
  leftAt?: string;
  notes?: string;
  unit?: { id: string; number: string; block?: string | null; condo?: { id: string; name: string } };
  resident?: { id: string; name: string } | null;
  createdBy?: { id: string; name: string };
  arrivedBy?: { id: string; name: string } | null;
  leftBy?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
}

export type OcrDocumentType = "LABEL" | "INVOICE";

export interface OcrResult {
  documentType?: OcrDocumentType;
  // Label fields
  trackingCode?: string;
  unitNumber?: string;
  recipientName?: string;
  recipientAddress?: string;
  senderName?: string;
  senderAddress?: string;
  weight?: string;
  orderId?: string;
  hubInfo?: string;
  // NF fields
  nfNumber?: string;
  nfKey?: string;
  cnpjEmitter?: string;
  cnpjRecipient?: string;
  totalValue?: string;
  // Common
  rawText?: string;
}

export interface UploadResult {
  key: string;
  url: string;
}

export const ORIGINS = [
  { value: "SHOPEE", label: "Shopee" },
  { value: "AMAZON", label: "Amazon" },
  { value: "ALIEXPRESS", label: "AliExpress" },
  { value: "MERCADO_LIVRE", label: "Mercado Livre" },
  { value: "CORREIOS", label: "Correios" },
  { value: "SHEIN", label: "Shein" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const CATEGORIES = [
  { value: "ENCOMENDA", label: "Encomenda" },
  { value: "DOCUMENTO", label: "Documento" },
  { value: "ELETRONICO", label: "Eletrônico" },
  { value: "ROUPA", label: "Roupa/Calçado" },
  { value: "ALIMENTO", label: "Alimento" },
  { value: "MEDICAMENTO", label: "Medicamento" },
  { value: "OUTRO", label: "Outro" },
] as const;
