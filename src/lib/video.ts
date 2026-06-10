// Nhận diện loại nội dung từ một URL để hiển thị đúng cách.

export type MediaKind = "youtube" | "video" | "file";

export interface ParsedMedia {
  kind: MediaKind;
  /** src để nhúng (iframe youtube / thẻ video) hoặc link tải file */
  src: string;
}

/** Lấy ID video YouTube từ nhiều dạng URL. */
function youtubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function parseMedia(url: string | null | undefined): ParsedMedia | null {
  if (!url) return null;
  const u = url.trim();
  if (!u) return null;

  const yt = youtubeId(u);
  if (yt) return { kind: "youtube", src: `https://www.youtube.com/embed/${yt}` };

  if (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(u)) {
    return { kind: "video", src: u };
  }

  return { kind: "file", src: u };
}
