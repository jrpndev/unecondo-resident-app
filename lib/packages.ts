import * as FileSystem from "expo-file-system/legacy";
import { EncodingType, FileSystemUploadType } from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import { BASE_URL, api, extractData } from "./api";
import { Package, PackageStatus } from "../types";

export async function getPackages(params?: {
  unitId?: string;
  status?: PackageStatus;
}): Promise<Package[]> {
  const response = await api.get("/packages", { params });
  return extractData<Package[]>(response);
}

export async function getMyPackages(params?: {
  status?: string;
  search?: string;
}): Promise<Package[]> {
  const response = await api.get("/packages/mine", { params });
  return extractData<Package[]>(response);
}

export async function getPackage(id: string): Promise<Package> {
  const response = await api.get(`/packages/${id}`);
  return extractData<Package>(response);
}

export async function createPackage(data: {
  trackingCode?: string;
  description?: string;
  imageUrl?: string;
  unitId: string;
  residentId?: string;
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
  ocrData?: Record<string, any>;
}): Promise<Package> {
  const response = await api.post("/packages", data);
  return extractData<Package>(response);
}

export async function updatePackageStatus(
  id: string,
  status: PackageStatus,
  signatureUrl?: string,
): Promise<Package> {
  const response = await api.patch(`/packages/${id}/status`, {
    status,
    ...(signatureUrl && { signatureUrl }),
  });
  return extractData<Package>(response);
}

export async function uploadSignature(base64: string): Promise<string> {
  // Write the base64 PNG to the cache directory so we have a real file URI
  const uri = FileSystem.cacheDirectory + `signature_${Date.now()}.png`;
  const rawBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
  await FileSystem.writeAsStringAsync(uri, rawBase64, {
    encoding: EncodingType.Base64,
  });

  // Use FileSystem.uploadAsync (multipart) — more reliable than axios FormData on RN
  const token = await SecureStore.getItemAsync("token");
  const result = await FileSystem.uploadAsync(
    `${BASE_URL}/images/upload?folder=signatures`,
    uri,
    {
      httpMethod: "POST",
      uploadType: FileSystemUploadType.MULTIPART,
      fieldName: "file",
      mimeType: "image/png",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed: ${result.status} ${result.body}`);
  }

  const data = JSON.parse(result.body);
  return (data?.data?.key ?? data?.key) as string;
}

export async function uploadImage(
  uri: string,
  _filename: string
): Promise<{ key: string; url: string }> {
  const token = await SecureStore.getItemAsync("token");

  const ext = _filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const mimeType =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  const result = await FileSystem.uploadAsync(
    `${BASE_URL}/images/upload?folder=packages`,
    uri,
    {
      httpMethod: "POST",
      uploadType: FileSystemUploadType.MULTIPART,
      fieldName: "file",
      mimeType,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed: ${result.status} ${result.body}`);
  }

  const body = JSON.parse(result.body);
  const data = body?.data ?? body;
  return { key: data.key, url: data.url };
}

export async function extractOcr(
  imageUrl: string,
  documentType: "LABEL" | "INVOICE" | "ID_DOCUMENT" = "LABEL"
): Promise<{
  documentType?: string;
  trackingCode?: string;
  unitNumber?: string;
  recipientName?: string;
  recipientAddress?: string;
  senderName?: string;
  senderAddress?: string;
  weight?: string;
  orderId?: string;
  hubInfo?: string;
  nfNumber?: string;
  nfKey?: string;
  cnpjEmitter?: string;
  cnpjRecipient?: string;
  totalValue?: string;
  fullName?: string;
  documentNumber?: string;
  cpf?: string;
  birthDate?: string;
  documentKind?: "RG" | "CNH";
  rawText?: string;
}> {
  const response = await api.post("/ocr/extract", { imageUrl, documentType }, { timeout: 60000 });
  return extractData(response);
}
