// Trích mảng B1_WORDS từ file gốc b1_words.js ra JSON (dùng cho chế độ Chép & highlight từ B1).
// CHỈ ĐỌC file gốc. Chạy: node scripts/extract-b1words.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = process.argv[2] || "D:/WEB HỌC TIẾNG ANH";
const SOURCE = join(SRC_DIR, "b1_words.js");
const OUT = resolve(__dirname, "../src/data/b1-words.json");

const js = readFileSync(SOURCE, "utf8");
const start = js.indexOf("[");
let depth = 0, inStr = false, quote = "", i = start;
for (; i < js.length; i++) {
  const ch = js[i];
  if (inStr) {
    if (ch === "\\") { i++; continue; }
    if (ch === quote) inStr = false;
    continue;
  }
  if (ch === '"' || ch === "'" || ch === "`") { inStr = true; quote = ch; continue; }
  if (ch === "[") depth++;
  else if (ch === "]") { depth--; if (depth === 0) { i++; break; } }
}
const arr = Function('"use strict"; return (' + js.slice(start, i) + ");")();
const words = arr.map((w) => String(w).toLowerCase());

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(words), "utf8");
console.log(`OK: ${words.length} từ B1 -> ${OUT}`);
