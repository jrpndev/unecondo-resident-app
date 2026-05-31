import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Linking, Alert, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, FileText, Download } from "lucide-react-native";
import { getDocuments, Document } from "../lib/documents";

function mimeIcon(mime?: string) {
  if (!mime) return "📎";
  if (mime.startsWith("application/pdf")) return "📄";
  if (mime.startsWith("image")) return "🖼️";
  return "📎";
}

function groupByCategory(docs: Document[]) {
  const groups: Record<string, Document[]> = {};
  for (const d of docs) {
    (groups[d.category] = groups[d.category] ?? []).push(d);
  }
  return groups;
}

export default function DocumentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocuments()
      .then(setDocs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const groups = groupByCategory(docs);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={18} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Documentos</Text>
          <Text style={styles.headerSub}>Atas, regulamentos e contratos</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#f97316" /></View>
      ) : docs.length === 0 ? (
        <View style={styles.center}>
          <FileText size={48} color="#2a2a2a" />
          <Text style={styles.emptyTitle}>Nenhum documento</Text>
          <Text style={styles.emptySub}>Os documentos do condomínio aparecerão aqui</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent}>
          {Object.entries(groups).map(([category, items]) => (
            <View key={category} style={styles.group}>
              <Text style={styles.groupLabel}>{category}</Text>
              <View style={styles.groupCard}>
                {items.map((doc, i) => (
                  <TouchableOpacity
                    key={doc.id}
                    onPress={() => {
                      if (doc.fileUrl) {
                        Linking.openURL(doc.fileUrl).catch(() =>
                          Alert.alert("Erro", "Não foi possível abrir o arquivo")
                        );
                      }
                    }}
                    activeOpacity={0.7}
                    style={[
                      styles.docRow,
                      i < items.length - 1 && styles.docRowBorder,
                    ]}
                  >
                    <View style={styles.docIcon}>
                      <Text style={styles.docIconText}>{mimeIcon(doc.fileMime)}</Text>
                    </View>
                    <View style={styles.docInfo}>
                      <Text style={styles.docTitle} numberOfLines={1}>{doc.title}</Text>
                      <Text style={styles.docDate}>
                        {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                      </Text>
                    </View>
                    {doc.fileUrl && <Download size={16} color="#9a9a9a" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#111111" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: "#2a2a2a",
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, backgroundColor: "#2a2a2a",
    borderRadius: 18, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#ffffff" },
  headerSub: { fontSize: 12, color: "#9a9a9a", marginTop: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: "#535353" },
  emptySub: { fontSize: 13, color: "#535353", textAlign: "center" },
  listContent: { padding: 16 },
  group: { marginBottom: 24 },
  groupLabel: {
    color: "#535353", fontSize: 10, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12,
  },
  groupCard: {
    backgroundColor: "#1a1a1a", borderRadius: 16,
    borderWidth: 1, borderColor: "#2a2a2a", overflow: "hidden",
  },
  docRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 16,
  },
  docRowBorder: { borderBottomWidth: 1, borderBottomColor: "#2a2a2a" },
  docIcon: {
    width: 44, height: 44, backgroundColor: "#f9731618",
    borderRadius: 12, alignItems: "center", justifyContent: "center",
    marginRight: 12,
  },
  docIconText: { fontSize: 20 },
  docInfo: { flex: 1, minWidth: 0 },
  docTitle: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
  docDate: { color: "#535353", fontSize: 11, marginTop: 2 },
});
