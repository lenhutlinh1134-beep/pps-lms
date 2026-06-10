import words from "@/data/b1-words.json";

const B1_SET = new Set(words as string[]);

/** Một từ có thuộc danh sách B1 không (xét cả biến thể -s/-es/-d/-ed/-ing). */
export function isB1Word(raw: string): boolean {
  const w = raw.toLowerCase();
  if (B1_SET.has(w)) return true;
  if (w.endsWith("s") && B1_SET.has(w.slice(0, -1))) return true;
  if (w.endsWith("es") && B1_SET.has(w.slice(0, -2))) return true;
  if (w.endsWith("d") && B1_SET.has(w.slice(0, -1))) return true;
  if (w.endsWith("ed") && B1_SET.has(w.slice(0, -2))) return true;
  if (w.endsWith("ing") && B1_SET.has(w.slice(0, -3))) return true;
  return false;
}

/** Tách đoạn văn thành các "token": từ (word) hoặc ký tự ngăn cách (sep). */
export interface Token {
  text: string;
  isWord: boolean;
}

export function tokenize(text: string): Token[] {
  return text
    .split(/([a-zA-Z0-9'-]+)/)
    .filter((p) => p !== "")
    .map((p) => ({ text: p, isWord: /^[a-zA-Z0-9'-]+$/.test(p) }));
}

/** Chuẩn hoá từ để so khớp (bỏ dấu câu, viết thường). */
export function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9']/g, "");
}
