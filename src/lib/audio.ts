/**
 * Trả URL file audio mp3 cho một đoạn văn.
 * - Dev / local: phục vụ từ public/audio/ (files đã copy sẵn)
 * - Production: phục vụ từ Supabase Storage (đặt NEXT_PUBLIC_AUDIO_STORAGE_URL)
 *
 * Ví dụ: getAudioUrl("aria", 0, 3) → "/audio/aria/master_0_3.mp3"
 */
export function getAudioUrl(voice: string, topicIndex: number, phraseIndex: number): string {
  const filename = `master_${topicIndex}_${phraseIndex}.mp3`;
  const base = process.env.NEXT_PUBLIC_AUDIO_STORAGE_URL;
  return base ? `${base}/${voice}/${filename}` : `/audio/${voice}/${filename}`;
}
