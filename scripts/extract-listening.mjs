// Trích mảng TOPICS (dữ liệu "Học từ kết nối") từ file gốc listen.html ra JSON.
// CHỈ ĐỌC file gốc — không sửa gì. Chạy: node scripts/extract-listening.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Đường dẫn file gốc (có thể truyền qua tham số dòng lệnh)
const SOURCE =
  process.argv[2] || "D:/WEB HỌC TIẾNG ANH/listen.html";
const OUT = resolve(__dirname, "../src/data/listening-topics.json");

const html = readFileSync(SOURCE, "utf8");

// Tìm "const TOPICS = [" rồi đếm ngoặc vuông để lấy đúng mảng
const marker = "const TOPICS = [";
const start = html.indexOf(marker);
if (start === -1) throw new Error("Không tìm thấy 'const TOPICS' trong " + SOURCE);

let i = html.indexOf("[", start);
const arrStart = i;
let depth = 0;
let inStr = false;
let quote = "";
for (; i < html.length; i++) {
  const ch = html[i];
  if (inStr) {
    if (ch === "\\") { i++; continue; }
    if (ch === quote) inStr = false;
    continue;
  }
  if (ch === '"' || ch === "'" || ch === "`") { inStr = true; quote = ch; continue; }
  if (ch === "[") depth++;
  else if (ch === "]") {
    depth--;
    if (depth === 0) { i++; break; }
  }
}
const arrText = html.slice(arrStart, i);

// Mảng dùng cú pháp JS literal -> eval an toàn bằng Function
const topics = Function('"use strict"; return (' + arrText + ");")();

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(topics, null, 2), "utf8");

const totalParas = topics.reduce((a, t) => a + (t.paras?.length || 0), 0);
console.log(`OK: ${topics.length} chủ đề, ${totalParas} đoạn văn -> ${OUT}`);
