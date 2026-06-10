import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/teacher/leaves — GV nộp đơn xin nghỉ
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();

    if (!profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    const body = await req.json();
    const { start_date, end_date, reason } = body as {
      start_date: string; end_date: string; reason: string;
    };

    if (!start_date || !end_date || !reason?.trim()) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }
    if (new Date(end_date) < new Date(start_date)) {
      return NextResponse.json({ error: "Ngày kết thúc phải sau ngày bắt đầu" }, { status: 400 });
    }
    if (reason.trim().length > 500) {
      return NextResponse.json({ error: "Lý do không được vượt quá 500 ký tự" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("leave_requests")
      .insert({ teacher_id: user.id, start_date, end_date, reason: reason.trim() })
      .select("id, start_date, end_date, reason, status, created_at")
      .single();

    if (error) {
      console.error("[leaves POST]", error);
      return NextResponse.json({ error: "Không thể tạo đơn xin nghỉ" }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    console.error("[leaves POST] unexpected", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// DELETE /api/teacher/leaves?id=xxx — GV xoá đơn pending của mình
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    // RLS đã kiểm tra teacher_id = auth.uid() AND status = 'pending'
    const { error } = await supabase
      .from("leave_requests")
      .delete()
      .eq("id", id)
      .eq("teacher_id", user.id)
      .eq("status", "pending");

    if (error) {
      console.error("[leaves DELETE]", error);
      return NextResponse.json({ error: "Không thể xoá đơn" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[leaves DELETE] unexpected", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
