/**
 * Script chuyển toàn bộ file audio từ public/audio/ lên Supabase Storage.
 * Chạy: node scripts/upload-audio.mjs
 *
 * Cần trước khi chạy:
 *   1. Tạo bucket "audio" (public) trong Supabase Dashboard > Storage
 *   2. Set biến môi trường trong .env.local:
 *      NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *      SUPABASE_SERVICE_ROLE_KEY=eyJ...   (lấy từ Settings > API > service_role)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
const audioDir = "./public/audio";

async function run() {
  const voices = readdirSync(audioDir).filter((name) =>
    statSync(join(audioDir, name)).isDirectory()
  );

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;
  const total = voices.reduce((sum, v) => sum + readdirSync(join(audioDir, v)).length, 0);

  console.log(`📂 Tìm thấy ${total} files trong ${voices.length} giọng: ${voices.join(", ")}`);
  console.log("🚀 Bắt đầu upload...\n");

  for (const voice of voices) {
    const voiceDir = join(audioDir, voice);
    const files = readdirSync(voiceDir).filter((f) => f.endsWith(".mp3"));

    for (const file of files) {
      const storagePath = `${voice}/${file}`;
      const localPath = join(voiceDir, file);

      const data = readFileSync(localPath);
      const { error } = await supabase.storage
        .from("audio")
        .upload(storagePath, data, {
          contentType: "audio/mpeg",
          upsert: false,
        });

      if (error) {
        if (error.message.includes("already exists") || error.message.includes("Duplicate")) {
          skipped++;
        } else {
          console.error(`  ❌ ${storagePath}: ${error.message}`);
          errors++;
        }
      } else {
        uploaded++;
      }

      const done = uploaded + skipped + errors;
      if (done % 100 === 0) {
        console.log(`  ↳ ${done}/${total} (${Math.round((done / total) * 100)}%) — upload: ${uploaded}, bỏ qua: ${skipped}, lỗi: ${errors}`);
      }
    }
  }

  console.log(`\n✅ Xong!`);
  console.log(`   Upload mới : ${uploaded}`);
  console.log(`   Đã có sẵn  : ${skipped}`);
  console.log(`   Lỗi        : ${errors}`);
  console.log(`\n💡 Tiếp theo:`);
  console.log(`   Thêm vào .env.local:`);
  console.log(`   NEXT_PUBLIC_AUDIO_BASE_URL=${supabaseUrl}/storage/v1/object/public/audio`);
}

run().catch(console.error);
