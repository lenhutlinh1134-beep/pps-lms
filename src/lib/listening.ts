// Helper dùng chung cho tính năng "Học từ kết nối" (an toàn cho client — không kèm dữ liệu).

export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const CEFR_LABELS: Record<CEFRLevel, string> = {
  A1: "A1 · Sơ cấp",
  A2: "A2 · Cơ bản",
  B1: "B1 · Trung cấp",
  B2: "B2 · Trung cao",
  C1: "C1 · Cao cấp",
  C2: "C2 · Thành thạo",
};

export interface ListeningTopic {
  id: string;
  emoji: string;
  name: string;
  vi: string;
  level: CEFRLevel;
  paras: string[];
  vi_paras: string[];
}

export const VOICES = [
  { id: "aria", label: "Aria", hint: "Nữ · Anh-Mỹ" },
  { id: "guy", label: "Guy", hint: "Nam · Anh-Mỹ" },
  { id: "ryan", label: "Ryan", hint: "Nam · Anh-Anh" },
  { id: "sonia", label: "Sonia", hint: "Nữ · Anh-Anh" },
] as const;

export type VoiceId = (typeof VOICES)[number]["id"];

/**
 * URL audio: dùng NEXT_PUBLIC_AUDIO_BASE_URL khi deploy (Supabase Storage),
 * fallback về /audio khi dev local.
 *
 * Giá trị NEXT_PUBLIC_AUDIO_BASE_URL sau khi chạy scripts/upload-audio.mjs:
 *   https://xxx.supabase.co/storage/v1/object/public/audio
 */
export function audioUrl(voice: VoiceId, topicId: string, idx: number): string {
  const base =
    process.env.NEXT_PUBLIC_AUDIO_BASE_URL?.replace(/\/$/, "") ?? "/audio";
  return `${base}/${voice}/${topicId}_${idx}.mp3`;
}
