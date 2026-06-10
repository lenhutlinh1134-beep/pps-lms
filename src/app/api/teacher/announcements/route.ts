import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/teacher/announcements — GV đăng thông báo cho lớp
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    const body = await req.json();
    const { class_id, content } = body as { class_id: string; content: string };

    if (!class_id || !content?.trim()) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }
    if (content.trim().length > 1000) {
      return NextResponse.json({ error: "Thông báo không được vượt quá 1000 ký tự" }, { status: 400 });
    }

    // Xác nhận GV thuộc lớp này
    const { data: ct } = await supabase
      .from("class_teachers")
      .select("class_id")
      .eq("class_id", class_id)
      .eq("teacher_id", user.id)
      .single();

    if (!ct) {
      return NextResponse.json({ error: "Bạn không thuộc lớp này" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("class_announcements")
      .insert({ class_id, teacher_id: user.id, content: content.trim() })
      .select("id, content, created_at")
      .single();

    if (error) {
      console.error("[announcements POST]", error);
      return NextResponse.json({ error: "Không thể đăng thông báo" }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    console.error("[announcements POST] unexpected", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
