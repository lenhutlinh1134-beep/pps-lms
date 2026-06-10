import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────
// PATCH /api/teacher/feedback — Giáo viên trả lời phản hồi PH
// ─────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
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

    // 2. Kiểm tra role = teacher
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }

    // 3. Parse body
    const body = await req.json();
    const { id, reply } = body as { id: string; reply: string };

    // 4. Validate
    if (!id || !reply) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }
    if (typeof reply !== "string" || reply.trim().length < 5) {
      return NextResponse.json({ error: "Câu trả lời phải có ít nhất 5 ký tự" }, { status: 400 });
    }
    if (reply.trim().length > 2000) {
      return NextResponse.json({ error: "Câu trả lời không được vượt quá 2000 ký tự" }, { status: 400 });
    }

    // 5. Kiểm tra feedback tồn tại + GV có quyền trả lời (thuộc lớp mình)
    const { data: feedback, error: fbError } = await supabase
      .from("parent_feedback")
      .select("id, class_id, status")
      .eq("id", id)
      .single();

    if (fbError || !feedback) {
      return NextResponse.json({ error: "Không tìm thấy phản hồi" }, { status: 404 });
    }

    // Kiểm tra GV thuộc lớp này
    const { data: classTeacher, error: ctError } = await supabase
      .from("class_teachers")
      .select("class_id")
      .eq("class_id", feedback.class_id)
      .eq("teacher_id", user.id)
      .single();

    if (ctError || !classTeacher) {
      return NextResponse.json(
        { error: "Bạn không có quyền trả lời phản hồi này" },
        { status: 403 },
      );
    }

    // 6. Update
    const { data: updated, error: updateError } = await supabase
      .from("parent_feedback")
      .update({
        reply: reply.trim(),
        replied_by: user.id,
        replied_at: new Date().toISOString(),
        status: "replied",
      })
      .eq("id", id)
      .select("id, reply, replied_at, status")
      .single();

    if (updateError) {
      console.error("[teacher/feedback PATCH]", updateError);
      return NextResponse.json({ error: "Không thể cập nhật câu trả lời" }, { status: 500 });
    }

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("[teacher/feedback PATCH] unexpected", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
