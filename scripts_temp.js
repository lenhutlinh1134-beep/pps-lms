const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase URL or Service Role Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from("lectures")
    .select(`
      id, title, type, teacher_name, created_at,
      class:classes(name),
      lecture_views(count),
      lecture_comments(count)
    `)
    .eq("teacher_id", "877535ca-11f6-4595-8299-e31a8a1249e8");
  
  if (error) {
    console.error("Error fetching:", error);
  } else {
    console.log("Total lectures in DB:", data.length);
    console.log("Lectures:", data);
  }
}

check();
