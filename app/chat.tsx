import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Send, MessageCircle } from "lucide-react-native";
import { getChatThread, sendChatMessage, markChatRead, ChatMessage } from "../lib/chat";
import { useAuthStore } from "../store/auth";
import { api } from "../lib/api";

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [adminName, setAdminName] = useState("Administração");

  useEffect(() => {
    (async () => {
      try {
        const condoId = user?.condoId;
        if (!condoId) { setLoading(false); return; }
        const usersRes = await api.get("/auth/users", { params: { condoId } });
        const users: any[] = usersRes.data?.data ?? usersRes.data ?? [];
        const admin = users.find(u => u.role === "CONDO_ADMIN" || u.role === "ADMIN");
        if (admin) {
          setAdminUserId(admin.id);
          setAdminName(admin.name ?? "Administração");
          const msgs = await getChatThread(admin.id);
          setMessages(msgs);
          await markChatRead(admin.id);
        }
      } catch {
        // no admin found
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!adminUserId) return;
    const interval = setInterval(async () => {
      try {
        const msgs = await getChatThread(adminUserId);
        setMessages(msgs);
        await markChatRead(adminUserId);
      } catch {}
    }, 6000);
    return () => clearInterval(interval);
  }, [adminUserId]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const handleSend = async () => {
    if (!adminUserId || !message.trim()) return;
    const body = message.trim();
    setMessage("");
    setSending(true);
    try {
      const msg = await sendChatMessage(adminUserId, body);
      setMessages(prev => [...prev, msg]);
    } catch {}
    finally { setSending(false); }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={18} color="#111827" />
        </TouchableOpacity>
        <View style={styles.adminAvatar}>
          <Text style={styles.adminAvatarText}>{adminName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.adminName}>{adminName}</Text>
          <Text style={styles.adminRole}>Síndico / Administração</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#f97316" /></View>
      ) : !adminUserId ? (
        <View style={styles.center}>
          <MessageCircle size={52} color="#d1d5db" />
          <Text style={styles.emptyTitle}>Administração indisponível</Text>
        </View>
      ) : (
        <>
          <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.messages}>
            {messages.length === 0 && (
              <View style={styles.center}>
                <MessageCircle size={40} color="#d1d5db" />
                <Text style={styles.emptySub}>Inicie uma conversa</Text>
              </View>
            )}
            {messages.map(msg => {
              const isMine = msg.fromId === user?.id;
              return (
                <View key={msg.id} style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowTheirs]}>
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{msg.body}</Text>
                    <Text style={[styles.bubbleTime, { color: isMine ? "rgba(255,255,255,0.5)" : "#9ca3af" }]}>
                      {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Mensagem..."
              placeholderTextColor="#9ca3af"
              style={styles.messageInput}
              multiline
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!message.trim() || sending}
              style={[styles.sendBtn, (!message.trim() || sending) && { opacity: 0.4 }]}
            >
              <Send size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#e5e7eb", gap: 12,
  },
  backBtn: {
    width: 36, height: 36, backgroundColor: "#e5e7eb",
    borderRadius: 18, alignItems: "center", justifyContent: "center",
  },
  adminAvatar: {
    width: 38, height: 38, backgroundColor: "#f9731618",
    borderRadius: 19, borderWidth: 1, borderColor: "#f9731440",
    alignItems: "center", justifyContent: "center",
  },
  adminAvatarText: { fontSize: 15, fontWeight: "700", color: "#f97316" },
  adminName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  adminRole: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: "#9ca3af" },
  emptySub: { fontSize: 13, color: "#9ca3af" },
  messages: { padding: 16, gap: 10, flexGrow: 1 },
  msgRow: { flexDirection: "row" },
  msgRowMine: { justifyContent: "flex-end" },
  msgRowTheirs: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: "#f97316", borderBottomRightRadius: 4 },
  bubbleTheirs: {
    backgroundColor: "#f5f5f5", borderWidth: 1,
    borderColor: "#e5e7eb", borderBottomLeftRadius: 4,
  },
  bubbleText: { color: "#111827", fontSize: 14, lineHeight: 20 },
  bubbleTextMine: { color: "#ffffff" },
  bubbleTime: { fontSize: 10, marginTop: 4 },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end",
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: "#e5e7eb",
    gap: 10, backgroundColor: "#f5f5f5",
  },
  messageInput: {
    flex: 1, backgroundColor: "#f5f5f5", borderWidth: 1, borderColor: "#e5e7eb",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    color: "#111827", fontSize: 14, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, backgroundColor: "#f97316",
    borderRadius: 22, alignItems: "center", justifyContent: "center",
  },
});
