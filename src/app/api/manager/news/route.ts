import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ────────────────────────────────────────────────
// Helper: xác thực user là manager
// Trả về null nếu OK, hoặc NextResponse lỗi để return ngay
// ────────────────────────────────────────────────
type ManagerContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  fullName: string | null;
};

async function getManagerContext(): Promise<
  { ok: true; ctx: ManagerContext } | { ok: false; response: ReturnType<typeof NextResponse.json> }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, response: NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "manager") {
    return { ok: false, response: NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 }) };
  }

  return {
    ok: true,
    ctx: { supabase, userId: user.id, fullName: profile.full_name as string | null },
  };
}

// ────────────────────────────────────────────────
// GET /api/manager/news?role=student
// Lấy danh sách tin tức (có thể filter theo role)
// ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Kiểm tra auth cơ bản (bất kỳ user đăng nhập đều đọc được)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const role = req.nextUrl.searchParams.get("role");

    let query = supabase
      .from("news")
      .select("id, title, content, publisher_name, is_pinned, target_roles, created_at, updated_at")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    // Filter theo role nếu có
    if (role) {
      query = query.contains("target_roles", [role]);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[news GET]", error);
      return NextResponse.json({ error: "Không thể tải tin tức" }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (e) {
    console.error("[news GET] unexpected", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// ────────────────────────────────────────────────
// POST /api/manager/news — Tạo tin mới (chỉ manager)
// ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const result = await getManagerContext();
    if (!result.ok) return result.response;
    const { supabase, userId, fullName } = result.ctx;

    const body = await req.json();
    const { title, content, is_pinned, target_roles } = body as {
      title: string;
      content: string;
      is_pinned?: boolean;
      target_roles?: string[];
    };

    // Validate bắt buộc
    if (!title?.trim()) {
      return NextResponse.json({ error: "Tiêu đề không được để trống" }, { status: 400 });
    }
    if (!content?.trim()) {
      return NextResponse.json({ error: "Nội dung không được để trống" }, { status: 400 });
    }

    const validRoles = ["student", "teacher", "parent"];
    const roles = Array.isArray(target_roles)
      ? target_roles.filter((r) => validRoles.includes(r))
      : ["student", "teacher", "parent"]; // mặc định gửi cho tất cả

    if (roles.length === 0) {
      return NextResponse.json({ error: "Phải chọn ít nhất một đối tượng nhận tin" }, { status: 400 });
    }

    const { data: news, error: insertError } = await supabase
      .from("news")
      .insert({
        title: title.trim(),
        content: content.trim(),
        is_pinned: is_pinned ?? false,
        target_roles: roles,
        published_by: userId,
        publisher_name: fullName,
      })
      .select("id, title, content, publisher_name, is_pinned, target_roles, created_at, updated_at")
      .single();

    if (insertError) {
      console.error("[news POST]", insertError);
      return NextResponse.json({ error: "Không thể đăng tin" }, { status: 500 });
    }

    return NextResponse.json({ data: news }, { status: 201 });
  } catch (e) {
    console.error("[news POST] unexpected", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// ────────────────────────────────────────────────
// DELETE /api/manager/news?id=xxx — Xóa tin (chỉ manager)
// ────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const result = await getManagerContext();
    if (!result.ok) return result.response;
    const { supabase } = result.ctx;

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
    }

    // Kiểm tra tin tồn tại trước khi xóa
    const { data: existing, error: fetchError } = await supabase
      .from("news")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Không tìm thấy tin tức" }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("news")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[news DELETE]", deleteError);
      return NextResponse.json({ error: "Không thể xóa tin" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[news DELETE] unexpected", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
