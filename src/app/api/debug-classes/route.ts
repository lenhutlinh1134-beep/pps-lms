import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not logged in", authErr });

    // Check profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, role, full_name, email")
      .eq("id", user.id)
      .single();

    // Check class_teachers
    const { data: ctRows, error: ctErr } = await supabase
      .from("class_teachers")
      .select("class_id, teacher_id, role");

    // Check classes directly
    const { data: classes, error: classesErr } = await supabase
      .from("classes")
      .select("id, name, created_by");

    return NextResponse.json({
      user_id: user.id,
      profile,
      profileErr: profileErr?.message,
      class_teachers: ctRows,
      ctErr: ctErr?.message,
      classes,
      classesErr: classesErr?.message,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
