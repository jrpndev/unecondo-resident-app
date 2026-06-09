import React, { useRef, useState } from "react";
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import SignatureScreen, { SignatureViewRef } from "react-native-signature-canvas";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RotateCcw, Check, X } from "lucide-react-native";

interface SignaturePadProps {
  onConfirm: (base64: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function SignaturePad({ onConfirm, onCancel, loading }: SignaturePadProps) {
  const ref = useRef<SignatureViewRef>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const insets = useSafeAreaInsets();

  const handleConfirm = () => ref.current?.readSignature();
  const handleClear = () => { ref.current?.clearSignature(); setHasDrawn(false); };
  const handleOK = (signature: string) => onConfirm(signature);

  const webStyle = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: white; }
    .m-signature-pad {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      width: 100%; height: 100%;
      box-shadow: none; border: none; margin: 0;
    }
    .m-signature-pad--body {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      border: none;
    }
    .m-signature-pad--footer { display: none !important; }
    canvas { width: 100% !important; height: 100% !important; }
  `;

  const top   = Math.max(insets.top,    12);
  const left  = Math.max(insets.left,   12);
  const right = Math.max(insets.right,  12);

  return (
    <View style={styles.container}>
      {/* Canvas fills the entire screen */}
      <View style={StyleSheet.absoluteFillObject}>
        <SignatureScreen
          ref={ref}
          onOK={handleOK}
          onBegin={() => setHasDrawn(true)}
          webStyle={webStyle}
          backgroundColor="white"
          penColor="#1f2937"
          minWidth={0.5}
          maxWidth={1.5}
          dotSize={1}
          scrollable={false}
          trimWhitespace
          imageType="image/png"
        />
      </View>

      {/* Cancel — top left */}
      <TouchableOpacity
        style={[styles.btn, { position: "absolute", top, left }]}
        onPress={onCancel}
        disabled={loading}
      >
        <X size={20} color="#374151" />
      </TouchableOpacity>

      {/* Clear + Confirm — top right */}
      <View style={[styles.rightGroup, { top, right }]}>
        <TouchableOpacity style={styles.btn} onPress={handleClear} disabled={loading}>
          <RotateCcw size={20} color="#6b7280" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.confirmBtn, (!hasDrawn || loading) && styles.disabled]}
          onPress={handleConfirm}
          disabled={!hasDrawn || loading}
        >
          {loading
            ? <ActivityIndicator color="white" size="small" />
            : <Check size={20} color="white" />
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  rightGroup: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(243,244,246,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  confirmBtn: {
    backgroundColor: "#f97316",
    shadowColor: "#f97316",
    shadowOpacity: 0.4,
  },
  disabled: { opacity: 0.4 },
});
