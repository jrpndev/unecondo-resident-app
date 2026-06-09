import React, { useState, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Image, Platform, Modal, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import * as FileSystem from "expo-file-system/legacy";
import * as ScreenOrientation from "expo-screen-orientation";
import { Share } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  ArrowLeft, Package2, MapPin, User, Calendar, CheckCircle2, RotateCcw,
  Hash, MessageCircle, Weight, Tag, Globe, Layers, QrCode, X, PenTool,
} from "lucide-react-native";
import Toast from "react-native-toast-message";
import { getPackage, updatePackageStatus, uploadSignature } from "../../lib/packages";
import { validateQrToken } from "../../lib/residents";
import { useAuthStore } from "../../store/auth";
import { LoadingScreen } from "../../components/LoadingScreen";
import { StatusBadge } from "../../components/StatusBadge";
import { SignaturePad } from "../../components/SignaturePad";
import { formatDate } from "../../lib/utils";
import { Package, ORIGINS } from "../../types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function getOriginLabel(value: string) {
  return ORIGINS.find((o) => o.value === value)?.label ?? value;
}

function buildMessage(pkg: Package, includeImageLink = false): string {
  const condo  = pkg.unit?.condo?.name ?? "";
  const unit   = pkg.unit?.number ?? "";
  const block  = pkg.unit?.block ? ` Bloco ${pkg.unit.block}` : "";
  const status = pkg.status === "DELIVERED" ? "✅ Entregue" : "📦 Aguardando retirada";

  return [
    `📦 *Unecondo — Encomenda*`,
    ``,
    `*Status:* ${status}`,
    pkg.trackingCode  ? `*Rastreio:* ${pkg.trackingCode}`              : null,
    pkg.origin        ? `*Origem:* ${getOriginLabel(pkg.origin)}`      : null,
    pkg.recipientName ? `*Destinatário:* ${pkg.recipientName}`         : null,
    `*Unidade:* ${unit}${block}${condo ? ` — ${condo}` : ""}`,
    pkg.weight        ? `*Peso:* ${pkg.weight}`                        : null,
    pkg.orderId       ? `*Pedido:* ${pkg.orderId}`                     : null,
    `*Recebido em:* ${new Date(pkg.createdAt).toLocaleString("pt-BR")}`,
    pkg.deliveredAt   ? `*Entregue em:* ${new Date(pkg.deliveredAt).toLocaleString("pt-BR")}` : null,
    includeImageLink && pkg.imageUrl ? `📷 *Foto:* ${pkg.imageUrl}`    : null,
    ``,
    `_Unecondo — Gestão de Encomendas_`,
  ].filter(Boolean).join("\n");
}

async function shareWhatsApp(pkg: Package) {
  if (Platform.OS === "ios" && pkg.imageUrl) {
    try {
      const ext  = pkg.imageUrl.split("?")[0].split(".").pop() || "jpg";
      const dest = FileSystem.cacheDirectory + `package_${pkg.id}.${ext}`;
      const dl   = await FileSystem.downloadAsync(pkg.imageUrl, dest);
      const msg  = buildMessage(pkg);
      await Share.share({ message: msg, url: dl.uri });
      return "image_shared";
    } catch {}
  }

  const msg = buildMessage(pkg, true);
  const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`)
  );
  return "text_with_link";
}

export default function PackageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [scannerOpen, setScannerOpen]       = useState(false);
  const [scanning, setScanning]             = useState(false);
  const scannedRef                          = useRef(false);
  const [signatureOpen, setSignatureOpen]   = useState(false);
  const [signatureLoading, setSignatureLoading] = useState(false);
  const [fullscreenUri, setFullscreenUri]   = useState<string | null>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const openSignaturePad = async () => {
    try { await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE); } catch {}
    setSignatureOpen(true);
  };

  const { data: pkg, isLoading } = useQuery({
    queryKey: ["package", id],
    queryFn: () => getPackage(id!),
  });

  const statusMutation = useMutation({
    mutationFn: (status: "PENDING" | "DELIVERED" | "RETURNED") => updatePackageStatus(id!, status),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["package", id] });
      qc.invalidateQueries({ queryKey: ["packages"] });
      qc.invalidateQueries({ queryKey: ["myPackages"] });
      const labels: Record<string, string> = { DELIVERED: "Entregue!", RETURNED: "Devolvido!", PENDING: "Revertido para pendente!" };
      Toast.show({ type: "success", text1: labels[updated.status] ?? "Atualizado!" });
    },
    onError: () => Toast.show({ type: "error", text1: "Erro ao atualizar status" }),
  });

  const confirmStatus = (status: "PENDING" | "DELIVERED" | "RETURNED") => {
    const labels: Record<string, string> = { DELIVERED: "entregar", RETURNED: "devolver", PENDING: "reverter para pendente" };
    Alert.alert("Confirmar", `Marcar encomenda como ${labels[status]}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar", onPress: () => statusMutation.mutate(status) },
    ]);
  };

  const openQrScanner = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert("Permissão necessária", "Permita acesso à câmera para escanear o QR Code.");
        return;
      }
    }
    scannedRef.current = false;
    setScannerOpen(true);
  };

  const handleQrScanned = async ({ data }: { data: string }) => {
    if (scannedRef.current || scanning || !pkg) return;
    scannedRef.current = true;
    setScanning(true);

    try {
      const resident = await validateQrToken(data);

      setScannerOpen(false);

      if (resident.id !== pkg.residentId) {
        Alert.alert(
          "QR inválido",
          `Este QR pertence a ${resident.name}, mas a encomenda é de outro morador.`,
          [{ text: "OK", onPress: () => { scannedRef.current = false; } }]
        );
        return;
      }

      Alert.alert(
        "Morador confirmado",
        `${resident.name} está retirando a encomenda. Confirmar entrega?`,
        [
          { text: "Cancelar", style: "cancel", onPress: () => { scannedRef.current = false; } },
          { text: "Confirmar entrega", onPress: () => statusMutation.mutate("DELIVERED") },
        ]
      );
    } catch {
      setScannerOpen(false);
      Alert.alert("QR inválido", "Código não reconhecido. Peça ao morador para mostrar novamente.");
      scannedRef.current = false;
    } finally {
      setScanning(false);
    }
  };

  const unlockPortrait = async () => {
    try { await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP); } catch {}
  };

  const handleSignatureConfirm = async (base64: string) => {
    setSignatureLoading(true);
    try {
      const key = await uploadSignature(base64);
      await updatePackageStatus(id!, "DELIVERED", key);
      await unlockPortrait();
      setSignatureOpen(false);
      qc.invalidateQueries({ queryKey: ["package", id] });
      qc.invalidateQueries({ queryKey: ["packages"] });
      qc.invalidateQueries({ queryKey: ["myPackages"] });
      Toast.show({ type: "success", text1: "Entregue com assinatura!" });
    } catch (err) {
      console.error("[SignatureConfirm] erro ao salvar assinatura:", err);
      Toast.show({ type: "error", text1: "Erro ao salvar assinatura" });
    } finally {
      setSignatureLoading(false);
    }
  };

  const handleSignatureCancel = async () => {
    await unlockPortrait();
    setSignatureOpen(false);
  };

  if (isLoading) return <LoadingScreen />;
  if (!pkg) return null;

  const isDoorman = user?.role === "DOORMAN";
  const canScanQr = isDoorman && pkg.status === "PENDING" && !!pkg.residentId;
  const canSign = isDoorman && pkg.status === "PENDING" && !!pkg.residentId;

  const details = [
    { icon: <Hash size={16} color="#6b7280" />,        label: "Código de rastreio", value: pkg.trackingCode || "Sem código" },
    { icon: <MapPin size={16} color="#6b7280" />,       label: "Localização",        value: `${pkg.unit?.condo?.name ?? ""} — Unid. ${pkg.unit?.number ?? ""}` },
    pkg.resident
      ? { icon: <User size={16} color="#6b7280" />,     label: "Destinatário",       value: pkg.resident.name }
      : null,
    pkg.recipientName
      ? { icon: <User size={16} color="#6b7280" />,     label: "Nome destinatário",  value: pkg.recipientName }
      : null,
    pkg.senderName
      ? { icon: <User size={16} color="#6b7280" />,     label: "Remetente",          value: pkg.senderName }
      : null,
    pkg.origin
      ? { icon: <Globe size={16} color="#6b7280" />,    label: "Origem",             value: getOriginLabel(pkg.origin) }
      : null,
    pkg.category
      ? { icon: <Layers size={16} color="#6b7280" />,   label: "Categoria",          value: pkg.category }
      : null,
    pkg.weight
      ? { icon: <Weight size={16} color="#6b7280" />,   label: "Peso",               value: pkg.weight }
      : null,
    pkg.orderId
      ? { icon: <Tag size={16} color="#6b7280" />,      label: "Nº do pedido",       value: pkg.orderId }
      : null,
    { icon: <Calendar size={16} color="#6b7280" />,     label: "Recebida em",        value: formatDate(pkg.createdAt) },
    pkg.deliveredAt
      ? { icon: <CheckCircle2 size={16} color="#6b7280" />, label: "Entregue em",    value: formatDate(pkg.deliveredAt) }
      : null,
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string }[];

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: "#f5f5f5",
          flexDirection: "row",
          alignItems: "center",
          paddingTop: insets.top + 16,
          paddingBottom: 16,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 36, height: 36, backgroundColor: "#ffffff",
            borderRadius: 999, alignItems: "center", justifyContent: "center", marginRight: 12,
          }}
        >
          <ArrowLeft size={18} color="white" />
        </TouchableOpacity>
        <Text style={{ color: "white", fontSize: 20, fontWeight: "700", flex: 1 }}>Encomenda</Text>
        <StatusBadge status={pkg.status} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}>
        {pkg.imageUrl && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => setFullscreenUri(pkg.imageUrl!)}>
            <Image
              source={{ uri: pkg.imageUrl }}
              style={{ width: "100%", height: 208, borderRadius: 16, marginBottom: 20, backgroundColor: "#ffffff" }}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        {/* Signature preview */}
        {pkg.signatureUrl && (
          <View
            style={{
              backgroundColor: "#f5f5f5", borderRadius: 16, padding: 16,
              marginBottom: 20, alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <PenTool size={14} color="#a78bfa" />
              <Text style={{ color: "#a78bfa", fontSize: 12, fontWeight: "700", marginLeft: 6 }}>Assinatura de retirada</Text>
            </View>
            <TouchableOpacity activeOpacity={0.9} onPress={() => setFullscreenUri(pkg.signatureUrl!)}>
              <Image
                source={{ uri: pkg.signatureUrl }}
                style={{ width: "100%", height: 112, borderRadius: 12, backgroundColor: "#ffffff" }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Details card */}
        <View
          style={{
            backgroundColor: "#f5f5f5", borderRadius: 16, padding: 20,
            marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
            <View style={{
              width: 56, height: 56, backgroundColor: "rgba(249,115,22,0.1)",
              borderRadius: 16, alignItems: "center", justifyContent: "center", marginRight: 16,
            }}>
              <Package2 size={26} color="#f97316" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>{pkg.trackingCode || "Sem código de rastreio"}</Text>
              <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>{pkg.description || "Sem descrição"}</Text>
            </View>
          </View>

          {details.map((item, i) => (
            <View key={i} style={{
              flexDirection: "row", alignItems: "flex-start",
              paddingVertical: 14,
              borderBottomWidth: i < details.length - 1 ? 1 : 0,
              borderBottomColor: "#e5e7eb",
            }}>
              <View style={{
                marginRight: 12, marginTop: 2, width: 28, height: 28,
                backgroundColor: "#ffffff", borderRadius: 8,
                alignItems: "center", justifyContent: "center",
              }}>{item.icon}</View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#9ca3af", fontSize: 11, fontWeight: "500" }}>{item.label}</Text>
                <Text style={{ color: "white", fontSize: 13, fontWeight: "600", marginTop: 2 }}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* WhatsApp share */}
        <TouchableOpacity
          onPress={() => shareWhatsApp(pkg)}
          style={{
            backgroundColor: "#16a34a", borderRadius: 999, paddingVertical: 16,
            flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 12,
          }}
        >
          <MessageCircle size={20} color="white" />
          <Text style={{ color: "white", fontWeight: "700", fontSize: 15, marginLeft: 8 }}>Compartilhar via WhatsApp</Text>
        </TouchableOpacity>

        {/* QR validation */}
        {canScanQr && (
          <TouchableOpacity
            onPress={openQrScanner}
            disabled={statusMutation.isPending}
            style={{
              backgroundColor: "#4f46e5", borderRadius: 999, paddingVertical: 16,
              flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 12,
            }}
          >
            <QrCode size={20} color="white" />
            <Text style={{ color: "white", fontWeight: "700", fontSize: 15, marginLeft: 8 }}>Validar retirada por QR</Text>
          </TouchableOpacity>
        )}

        {/* Signature fallback */}
        {canSign && (
          <TouchableOpacity
            onPress={openSignaturePad}
            disabled={statusMutation.isPending}
            style={{
              backgroundColor: "#f5f5f5", borderWidth: 2, borderColor: "#4f46e5",
              borderRadius: 999, paddingVertical: 16,
              flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 12,
            }}
          >
            <PenTool size={20} color="#a78bfa" />
            <Text style={{ color: "#a78bfa", fontWeight: "700", fontSize: 15, marginLeft: 8 }}>Retirada com assinatura</Text>
          </TouchableOpacity>
        )}

        {/* Status actions */}
        <View style={{ gap: 12 }}>
          {pkg.status !== "DELIVERED" && (
            <TouchableOpacity
              onPress={() => confirmStatus("DELIVERED")}
              disabled={statusMutation.isPending}
              style={{
                backgroundColor: "#f97316", borderRadius: 999, paddingVertical: 16,
                flexDirection: "row", alignItems: "center", justifyContent: "center",
              }}
            >
              <CheckCircle2 size={20} color="white" />
              <Text style={{ color: "white", fontWeight: "700", fontSize: 15, marginLeft: 8 }}>Marcar como Entregue</Text>
            </TouchableOpacity>
          )}
          {pkg.status !== "RETURNED" && (
            <TouchableOpacity
              onPress={() => confirmStatus("RETURNED")}
              disabled={statusMutation.isPending}
              style={{
                backgroundColor: "#f5f5f5", borderWidth: 2, borderColor: "#e5e7eb",
                borderRadius: 999, paddingVertical: 16,
                flexDirection: "row", alignItems: "center", justifyContent: "center",
              }}
            >
              <RotateCcw size={20} color="#f87171" />
              <Text style={{ color: "#f87171", fontWeight: "700", fontSize: 15, marginLeft: 8 }}>Devolver</Text>
            </TouchableOpacity>
          )}
          {pkg.status !== "PENDING" && (
            <TouchableOpacity
              onPress={() => confirmStatus("PENDING")}
              disabled={statusMutation.isPending}
              style={{
                backgroundColor: "#f5f5f5", borderWidth: 2, borderColor: "#e5e7eb",
                borderRadius: 999, paddingVertical: 16,
                flexDirection: "row", alignItems: "center", justifyContent: "center",
              }}
            >
              <RotateCcw size={20} color="#6b7280" />
              <Text style={{ color: "#6b7280", fontWeight: "700", fontSize: 15, marginLeft: 8 }}>Reverter para Pendente</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* QR Scanner Modal */}
      <Modal
        visible={scannerOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setScannerOpen(false)}
      >
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scannerOpen ? handleQrScanned : undefined}
          />

          {/* Overlay */}
          <View style={styles.overlay}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => setScannerOpen(false)} style={styles.closeBtn}>
                <X size={22} color="white" />
              </TouchableOpacity>
              <Text style={styles.title}>Escanear QR do morador</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.cutout} />

            <Text style={styles.hint}>
              {scanning ? "Validando..." : "Aponte a câmera para o QR Code do morador"}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Signature Modal */}
      <Modal
        visible={signatureOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => !signatureLoading && handleSignatureCancel()}
      >
        <SignaturePad
          onConfirm={handleSignatureConfirm}
          onCancel={handleSignatureCancel}
          loading={signatureLoading}
        />
      </Modal>

      {/* Fullscreen photo viewer */}
      <Modal
        visible={!!fullscreenUri}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setFullscreenUri(null)}
      >
        <View style={styles.fsContainer}>
          <Image
            source={{ uri: fullscreenUri ?? "" }}
            style={styles.fsImage}
            resizeMode="contain"
          />
          <TouchableOpacity style={styles.fsClose} onPress={() => setFullscreenUri(null)}>
            <X size={22} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scannerContainer: { flex: 1, backgroundColor: "black" },
  overlay: { flex: 1, justifyContent: "space-between", paddingBottom: 60 },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 60, paddingHorizontal: 20,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center",
  },
  title: { color: "white", fontSize: 16, fontWeight: "700" },
  cutout: {
    alignSelf: "center", width: 240, height: 240,
    borderRadius: 16, borderWidth: 2, borderColor: "#f97316",
    backgroundColor: "transparent",
  },
  hint: {
    color: "white", textAlign: "center", fontSize: 13,
    fontWeight: "600", paddingHorizontal: 40,
    backgroundColor: "rgba(0,0,0,0.4)", paddingVertical: 12, borderRadius: 12, marginHorizontal: 40,
  },
  fsContainer: { flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" },
  fsImage: { width: "100%", height: "100%" },
  fsClose: {
    position: "absolute", top: 52, right: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center", justifyContent: "center",
  },
});
