import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ────────────────────────────────────────────────
// POST /api/teacher/schedule — Tạo buổi học mới
// ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth: lấy user hiện tại
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    // Kiểm tra role = teacher
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }

    // Parse body
    const body = await req.json();
    const { class_id, day_of_week, start_time, end_time, room } = body as {
      class_id: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      room?: string;
    };

    // Validate input
    if (!class_id || !day_of_week || !start_time || !end_time) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }
    if (day_of_week < 2 || day_of_week > 8) {
      return NextResponse.json({ error: "Thứ không hợp lệ (2-8)" }, { status: 400 });
    }
    if (start_time >= end_time) {
      return NextResponse.json({ error: "Giờ bắt đầu phải trước giờ kết thúc" }, { status: 400 });
    }

    // Kiểm tra GV có quyền trên lớp này không
    const { data: classTeacher, error: ctError } = await supabase
      .from("class_teachers")
      .select("class_id")
      .eq("class_id", class_id)
      .eq("teacher_id", user.id)
      .single();

    if (ctError || !classTeacher) {
      return NextResponse.json({ error: "Bạn không thuộc lớp này" }, { status: 403 });
    }

    // Insert session
    const { data: session, error: insertError } = await supabase
      .from("class_sessions")
      .insert({
        class_id,
        day_of_week,
        start_time,
        end_time,
        room: room?.trim() || null,
        created_by: user.id,
      })
      .select("id, class_id, day_of_week, start_time, end_time, room")
      .single();

    if (insertError) {
      console.error("[schedule POST]", insertError);
      return NextResponse.json({ error: "Không thể tạo buổi học" }, { status: 500 });
    }

    return NextResponse.json({ data: session }, { status: 201 });
  } catch (e) {
    console.error("[schedule POST] unexpected", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// ────────────────────────────────────────────────
// DELETE /api/teacher/schedule?id=xxx — Xóa buổi học
// ────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    // Kiểm tra role = teacher
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }

    // Lấy id từ query param
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
    }

    // Kiểm tra session tồn tại + GV có quyền xóa (phải là GV của lớp đó)
    const { data: session, error: sessionError } = await supabase
      .from("class_sessions")
      .select("id, class_id")
      .eq("id", id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Không tìm thấy buổi học" }, { status: 404 });
    }

    // Xác minh GV thuộc lớp này
    const { data: classTeacher, error: ctError } = await supabase
      .from("class_teachers")
      .select("class_id")
      .eq("class_id", session.class_id)
      .eq("teacher_id", user.id)
      .single();

    if (ctError || !classTeacher) {
      return NextResponse.json({ error: "Bạn không có quyền xóa buổi học này" }, { status: 403 });
    }

    // Xóa
    const { error: deleteError } = await supabase
      .from("class_sessions")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[schedule DELETE]", deleteError);
      return NextResponse.json({ error: "Không thể xóa buổi học" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[schedule DELETE] unexpected", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
