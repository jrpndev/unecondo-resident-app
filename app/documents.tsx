import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, FileText, Download } from "lucide-react-native";
import { getDocuments, Document } from "../lib/documents";

const MIME_EMOJI: Record<string, string> = {
  "application/pdf": "📄",
  "image": "🖼️",
};

function mimeIcon(mime?: string) {
  if (!mime) return "📎";
  for (const [k, v] of Object.entries(MIME_EMOJI)) {
    if (mime.startsWith(k)) return v;
  }
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
    <View className="flex-1 bg-gray-950" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1.5 rounded-xl bg-gray-800 active:opacity-70">
          <ArrowLeft size={18} color="white" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white text-lg font-bold">Documentos</Text>
          <Text className="text-gray-400 text-xs">Atas, regulamentos e contratos</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f97316" />
        </View>
      ) : docs.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <FileText size={48} color="#374151" />
          <Text className="text-gray-500 text-base font-semibold mt-4">Nenhum documento</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {Object.entries(groups).map(([category, items]) => (
            <View key={category} className="mb-6">
              <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">{category}</Text>
              <View className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
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
                    className={`flex-row items-center px-4 py-3.5 ${i < items.length - 1 ? "border-b border-gray-800" : ""}`}
                  >
                    <View className="w-10 h-10 bg-primary-900/30 rounded-xl items-center justify-center mr-3">
                      <Text className="text-xl">{mimeIcon(doc.fileMime)}</Text>
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-white text-sm font-semibold" numberOfLines={1}>{doc.title}</Text>
                      <Text className="text-gray-500 text-xs mt-0.5">
                        {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                      </Text>
                    </View>
                    {doc.fileUrl && <Download size={16} color="#6b7280" />}
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
