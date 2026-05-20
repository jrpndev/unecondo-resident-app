import React, { useCallback } from "react";
import {
  View, Text, FlatList, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pin } from "lucide-react-native";
import { getAnnouncements, markAnnouncementRead, type Announcement } from "../../lib/announcements";
import { useAuthStore } from "../../store/auth";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AnnouncementsScreen() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const condoId = user?.condoId ?? undefined;

  const { data: announcements = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["announcements", condoId],
    queryFn: () => getAnnouncements(condoId),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => markAnnouncementRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });

  const handlePress = useCallback((a: Announcement) => {
    if (!a.reads?.length) markRead.mutate(a.id);
  }, []);

  const renderItem = ({ item }: { item: Announcement }) => {
    const isRead = !!item.reads?.length;
    return (
      <TouchableOpacity
        onPress={() => handlePress(item)}
        className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 shadow-sm active:opacity-80"
      >
        <View className="flex-row items-start gap-2">
          {item.isPinned && <Pin size={14} color="#f97316" className="mt-0.5 flex-shrink-0" />}
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text className={`font-semibold flex-1 mr-2 ${isRead ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white"}`} numberOfLines={1}>
                {item.title}
              </Text>
              {!isRead && (
                <View className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
              )}
            </View>
            <Text className="text-sm text-gray-600 dark:text-gray-300" numberOfLines={3}>
              {item.body}
            </Text>
            <Text className="text-xs text-gray-400 mt-2">{fmtDate(item.createdAt)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="px-4 pt-6 pb-2">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">Comunicados</Text>
      </View>
      <FlatList
        data={announcements}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text className="text-gray-400 text-base">Nenhum comunicado</Text>
          </View>
        }
      />
    </View>
  );
}
