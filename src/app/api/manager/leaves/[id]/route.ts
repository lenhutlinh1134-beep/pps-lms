import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH /api/manager/leaves/[id] — Manager duyệt hoặc từ chối đơn nghỉ
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();

    if (!profile || profile.role !== "manager") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    const body = await req.json();
    const { status, manager_note } = body as {
      status: "approved" | "rejected";
      manager_note?: string;
    };

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("leave_requests")
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        manager_note: manager_note?.trim() ?? null,
      })
      .eq("id", id)
      .select("id, status, reviewed_at, manager_note")
      .single();

    if (error) {
      console.error("[manager/leaves PATCH]", error);
      return NextResponse.json({ error: "Không thể cập nhật đơn" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (e) {
    console.error("[manager/leaves PATCH] unexpected", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
