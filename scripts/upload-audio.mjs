/**
 * Upload toàn bộ public/audio/ lên Supabase Storage bucket "audio"
 * Chạy: node scripts/upload-audio.mjs
 *
 * Cần SUPABASE_SERVICE_ROLE_KEY trong .env.local
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// Đọc .env.local thủ công
const envFile = readFileSync(".env.local", "utf-8");
const env = Object.fromEntries(
  envFile.split("\n")
    .filter(line => line.includes("=") && !line.startsWith("#"))
    .map(line => { const i = line.indexOf("="); return [line.slice(0, i).trim(), line.slice(i + 1).trim()]; })
);

// Dùng SUPABASE_AUDIO_URL nếu audio storage ở project khác
const SUPABASE_URL = env.SUPABASE_AUDIO_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET       = "audio";
const AUDIO_DIR    = "./public/audio";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  process.exit(1);
}

const HEADERS = {
  "Authorization": `Bearer ${SERVICE_KEY}`,
  "apikey": SERVICE_KEY,
};

async function createBucket() {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  const json = await res.json();
  if (!res.ok && !json.error?.includes("already exists") && !json.message?.includes("already exists")) {
    console.error("❌ Tạo bucket thất bại:", json);
    process.exit(1);
  }
  console.log(`✅ Bucket "${BUCKET}" sẵn sàng\n`);
}

async function uploadFile(storagePath, localPath) {
  const data = readFileSync(localPath);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "audio/mpeg", "x-upsert": "true" },
    body: data,
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || json.error || res.statusText);
  }
}

async function run() {
  await createBucket();

  const voices = readdirSync(AUDIO_DIR).filter(n => statSync(join(AUDIO_DIR, n)).isDirectory());
  const total = voices.reduce((sum, v) => sum + readdirSync(join(AUDIO_DIR, v)).filter(f => f.endsWith(".mp3")).length, 0);

  console.log(`📂 ${total} files — ${voices.join(", ")}`);
  console.log("🚀 Bắt đầu upload...\n");

  let ok = 0, fail = 0;

  for (const voice of voices) {
    const voiceDir = join(AUDIO_DIR, voice);
    const files = readdirSync(voiceDir).filter(f => f.endsWith(".mp3"));

    for (const file of files) {
      try {
        await uploadFile(`${voice}/${file}`, join(voiceDir, file));
        ok++;
      } catch (e) {
        console.error(`  ❌ ${voice}/${file}: ${e.message}`);
        fail++;
      }
      const done = ok + fail;
      if (done % 100 === 0) {
        console.log(`  ↳ ${done}/${total} (${Math.round(done/total*100)}%) — ok: ${ok}, lỗi: ${fail}`);
      }
    }
  }

  console.log(`\n✅ Xong! ${ok} thành công, ${fail} lỗi`);
  console.log(`\n💡 Thêm vào .env.local:`);
  console.log(`NEXT_PUBLIC_AUDIO_BASE_URL=${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`);
}

run().catch(console.error);
