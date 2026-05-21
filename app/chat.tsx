import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Send, MessageCircle } from "lucide-react-native";
import { getChatThread, sendChatMessage, markChatRead, ChatMessage } from "../lib/chat";
import { useAuthStore } from "../store/auth";

// The admin user ID is stored per-condo. We'll fetch it from the condo info or
// use a known endpoint to find the síndico / admin of the condo.
// For now, the resident chats with the condo's primary CONDO_ADMIN or ADMIN user.
// We discover them by calling GET /residents (condo managers) from the condo context.
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
        // Find the condo admin / síndico
        const condoId = user?.condoId;
        if (!condoId) { setLoading(false); return; }
        const res = await api.get(`/condos/${condoId}`);
        const condo = res.data?.data ?? res.data;
        // Find managers via /auth/users
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
        // no admin found, show empty state
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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-gray-950" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-4 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1.5 rounded-xl bg-gray-800 active:opacity-70">
          <ArrowLeft size={18} color="white" />
        </TouchableOpacity>
        <View className="w-9 h-9 bg-primary-900/40 rounded-full items-center justify-center mr-2">
          <Text className="text-primary-400 text-sm font-bold">{adminName.charAt(0).toUpperCase()}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-white text-sm font-bold">{adminName}</Text>
          <Text className="text-gray-500 text-xs">Síndico / Administração</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#f97316" /></View>
      ) : !adminUserId ? (
        <View className="flex-1 items-center justify-center px-6">
          <MessageCircle size={48} color="#374151" />
          <Text className="text-gray-500 text-base font-semibold mt-4 text-center">Administração indisponível</Text>
        </View>
      ) : (
        <>
          <ScrollView ref={scrollRef} className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 16, gap: 8 }}>
            {messages.length === 0 && (
              <View className="flex-1 items-center justify-center py-12">
                <MessageCircle size={40} color="#374151" />
                <Text className="text-gray-600 text-sm mt-3">Inicie uma conversa</Text>
              </View>
            )}
            {messages.map(msg => {
              const isMine = msg.fromId === user?.id;
              return (
                <View key={msg.id} className={`flex-row ${isMine ? "justify-end" : "justify-start"}`}>
                  <View className={`max-w-[78%] rounded-2xl px-3 py-2.5 ${isMine ? "bg-primary-600 rounded-tr-sm" : "bg-gray-800 rounded-tl-sm"}`}>
                    <Text className="text-white text-sm">{msg.body}</Text>
                    <Text className={`text-[10px] mt-1 ${isMine ? "text-white/60" : "text-gray-500"}`}>
                      {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View className="px-4 flex-row gap-2 border-t border-gray-800 py-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
            <TextInput value={message} onChangeText={setMessage}
              placeholder="Mensagem..."
              placeholderTextColor="#6b7280"
              className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-2xl px-4 py-2.5 text-sm"
              multiline />
            <TouchableOpacity onPress={handleSend} disabled={!message.trim() || sending}
              className="w-11 h-11 bg-primary-500 rounded-xl items-center justify-center active:opacity-70 self-end">
              <Send size={18} color="white" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}
