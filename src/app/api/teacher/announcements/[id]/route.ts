import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// DELETE /api/teacher/announcements/[id] — GV xoá thông báo của mình
export async function DELETE(
  _req: NextRequest,
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
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    // RLS tự kiểm tra teacher_id = auth.uid()
    const { error } = await supabase
      .from("class_announcements")
      .delete()
      .eq("id", id)
      .eq("teacher_id", user.id);

    if (error) {
      console.error("[announcements DELETE]", error);
      return NextResponse.json({ error: "Không thể xoá thông báo" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[announcements DELETE] unexpected", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
