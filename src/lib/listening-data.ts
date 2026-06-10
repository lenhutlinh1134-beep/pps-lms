// Nạp dữ liệu chủ đề luyện nghe (dùng phía SERVER — file JSON khá lớn, không nên import vào client).
import topicsData from "@/data/listening-topics.json";
import type { ListeningTopic } from "./listening";

export const listeningTopics = topicsData as ListeningTopic[];

export function getTopic(id: string): ListeningTopic | undefined {
  return listeningTopics.find((t) => t.id === id);
}

/** Danh sách rút gọn cho sidebar (không kèm toàn bộ nội dung — nhẹ cho client). */
export const topicsMeta = listeningTopics.map((t) => ({
  id: t.id,
  emoji: t.emoji,
  name: t.name,
  level: t.level,
  count: t.paras.length,
}));
