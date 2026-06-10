import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────
// POST /api/parent/feedback — Phụ huynh gửi phản hồi mới
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    // 2. Kiểm tra role = parent
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "parent") {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }

    // 3. Parse body
    const body = await req.json();
    const { class_id, student_id, content } = body as {
      class_id: string;
      student_id: string;
      content: string;
    };

    // 4. Validate
    if (!class_id || !student_id || !content) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }
    if (typeof content !== "string" || content.trim().length < 10) {
      return NextResponse.json({ error: "Nội dung phải có ít nhất 10 ký tự" }, { status: 400 });
    }
    if (content.trim().length > 2000) {
      return NextResponse.json({ error: "Nội dung không được vượt quá 2000 ký tự" }, { status: 400 });
    }

    // 5. Kiểm tra PH có liên kết với HS này không
    const { data: link, error: linkError } = await supabase
      .from("parent_student")
      .select("student_id")
      .eq("parent_id", user.id)
      .eq("student_id", student_id)
      .single();

    if (linkError || !link) {
      return NextResponse.json({ error: "Bạn không có quyền gửi phản hồi cho học sinh này" }, { status: 403 });
    }

    // 6. Insert
    const { data: feedback, error: insertError } = await supabase
      .from("parent_feedback")
      .insert({
        parent_id: user.id,
        student_id,
        class_id,
        content: content.trim(),
        status: "pending",
      })
      .select("id, status, created_at")
      .single();

    if (insertError) {
      console.error("[parent/feedback POST]", insertError);
      return NextResponse.json({ error: "Không thể gửi phản hồi" }, { status: 500 });
    }

    return NextResponse.json({ data: feedback }, { status: 201 });
  } catch (e) {
    console.error("[parent/feedback POST] unexpected", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
