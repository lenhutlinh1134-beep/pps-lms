import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking lectures in DB...");
  const { data: lectures, error: lError } = await supabase.from('lectures').select('*');
  if (lError) console.error("Error fetching lectures:", lError);
  else {
    console.log(`Found ${lectures.length} lectures.`);
    lectures.forEach(l => console.log(l));
  }
  
  console.log("\nChecking lecture_classes...");
  const { data: lc, error: lcError } = await supabase.from('lecture_classes').select('*');
  if (lcError) console.error("Error fetching lecture_classes:", lcError);
  else {
    console.log(`Found ${lc.length} lecture_classes.`);
    lc.forEach(l => console.log(l));
  }

  console.log("\nChecking profiles...");
  const { data: p, error: pError } = await supabase.from('profiles').select('id, full_name, role').ilike('full_name', '%Linh%');
  if (pError) console.error(pError);
  else {
    console.log("Profiles matching name:", p);
    
    for (const user of p) {
      console.log(`\nChecking classes for teacher ${user.id}...`);
      const { data: ct } = await supabase.from('class_teachers').select('*').eq('teacher_id', user.id);
      console.log(ct);
    }
  }
}

main();
