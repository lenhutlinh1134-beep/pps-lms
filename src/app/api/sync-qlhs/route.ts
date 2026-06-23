import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ====================================================================
// POST /api/sync-qlhs
// Đẩy dữ liệu học online từ Supabase lên Google Apps Script (QLHS v2)
//
// Phân quyền: chỉ teacher hoặc manager mới gọi được
//
// Body: { studentId?: string, daysBack?: number }
//   studentId  — Supabase UUID; nếu bỏ trống → sync tất cả HS trong lớp GV
//   daysBack   — số ngày trở về trước để lấy data (mặc định 30)
//
// Env cần thêm vào .env.local:
//   QLHS_GAS_URL     — exec URL của Apps Script (Code.gs)
//   QLHS_GAS_SECRET  — phải khớp LMS_WEBHOOK_SECRET trong Code.gs
// ====================================================================

const GAS_URL    = process.env.QLHS_GAS_URL    ?? "";
const GAS_SECRET = process.env.QLHS_GAS_SECRET ?? "";

export async function POST(req: NextRequest) {
  try {
    if (!GAS_URL || !GAS_SECRET) {
      return NextResponse.json(
        { error: "Chưa cấu hình QLHS_GAS_URL / QLHS_GAS_SECRET trong .env.local" },
        { status: 500 },
      );
    }

    const supabase = await createClient();

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    // Chỉ teacher hoặc manager mới được sync
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "teacher" && profile.role !== "manager")) {
      return NextResponse.json({ error: "Không có quyền sync" }, { status: 403 });
    }

    // Parse body
    const body = await req.json().catch(() => ({}));
    const targetStudentId: string | undefined = body.studentId;
    const daysBack: number = Number(body.daysBack ?? 30);
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    // ----------------------------------------------------------------
    // 1. Lấy student_ids mà người dùng này có quyền xem
    //    Teacher: HS trong lớp mình
    //    Manager: HS trong lớp thuộc trường (không lọc thêm ở đây)
    // ----------------------------------------------------------------
    let studentIds: string[] = [];

    if (targetStudentId) {
      studentIds = [targetStudentId];
    } else if (profile.role === "teacher") {
      const { data: classTeacher } = await supabase
        .from("class_teachers")
        .select("class_id")
        .eq("teacher_id", user.id);

      if (!classTeacher?.length) {
        return NextResponse.json({ synced: 0, skipped: 0, msg: "Bạn chưa có lớp nào" });
      }

      const classIds = classTeacher.map((r) => r.class_id);
      const { data: classStudents } = await supabase
        .from("class_students")
        .select("student_id")
        .in("class_id", classIds);

      studentIds = [...new Set(classStudents?.map((r) => r.student_id) ?? [])];
    } else {
      // manager: lấy tất cả học sinh
      const { data: allStudents } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "student");
      studentIds = allStudents?.map((r) => r.id) ?? [];
    }

    if (!studentIds.length) {
      return NextResponse.json({ synced: 0, skipped: 0, msg: "Không có học sinh nào để sync" });
    }

    // ----------------------------------------------------------------
    // 2. Lấy profiles (email → dùng làm QLHS studentId)
    // ----------------------------------------------------------------
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", studentIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

    // ----------------------------------------------------------------
    // 3. Lấy student_logs (listen + lecture + assignment)
    // ----------------------------------------------------------------
    const { data: logs } = await supabase
      .from("student_logs")
      .select("student_id, type, duration_seconds, listen_count, score, occurred_at")
      .in("student_id", studentIds)
      .in("type", ["listen", "lecture", "assignment"])
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false });

    // ----------------------------------------------------------------
    // 4. Lấy lecture_views (kèm tên bài giảng)
    // ----------------------------------------------------------------
    const { data: views } = await supabase
      .from("lecture_views")
      .select("student_id, created_at, lectures(title, class_id)")
      .in("student_id", studentIds)
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    // ----------------------------------------------------------------
    // 5. Ghép data thành sessions[]
    // ----------------------------------------------------------------
    type Session = {
      studentId: string;
      date: string;
      sessionType: string;
      durationMinutes: number;
      topicName: string;
      itemsCompleted: number;
      score: string;
      notes: string;
    };

    const sessions: Session[] = [];

    // Từ student_logs
    for (const log of logs ?? []) {
      const p = profileMap.get(log.student_id);
      if (!p) continue;

      const qlhsId = qlhsIdFromProfile(p);
      const dateStr = log.occurred_at.slice(0, 10);

      let sessionType = "Khác";
      let topicName   = "";
      if (log.type === "listen")     { sessionType = "Luyện nghe"; topicName = `Luyện nghe (${log.listen_count ?? 0} bài)`; }
      if (log.type === "lecture")    { sessionType = "Bài giảng";  topicName = "Xem bài giảng"; }
      if (log.type === "assignment") { sessionType = "Bài tập";    topicName = "Làm bài tập"; }

      sessions.push({
        studentId:       qlhsId,
        date:            dateStr,
        sessionType,
        durationMinutes: Math.round((log.duration_seconds ?? 0) / 60),
        topicName,
        itemsCompleted:  log.listen_count ?? 0,
        score:           log.score != null ? String(log.score) : "",
        notes:           p.full_name,
      });
    }

    // Từ lecture_views (bổ sung tên bài cụ thể)
    for (const v of views ?? []) {
      const p = profileMap.get(v.student_id);
      if (!p) continue;

      const qlhsId = qlhsIdFromProfile(p);
      const dateStr = (v.created_at as string).slice(0, 10);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const title = (v as any).lectures?.title ?? "Bài giảng";

      sessions.push({
        studentId:       qlhsId,
        date:            dateStr,
        sessionType:     "Bài giảng",
        durationMinutes: 0,
        topicName:       title,
        itemsCompleted:  1,
        score:           "",
        notes:           p.full_name,
      });
    }

    if (!sessions.length) {
      return NextResponse.json({ synced: 0, skipped: 0, msg: "Không có hoạt động mới để sync" });
    }

    // ----------------------------------------------------------------
    // 6. Gửi lên Apps Script
    // ----------------------------------------------------------------
    const gasRes = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "syncFromLMS", secret: GAS_SECRET, sessions }),
    });

    if (!gasRes.ok) {
      return NextResponse.json(
        { error: "Apps Script trả về lỗi HTTP " + gasRes.status },
        { status: 502 },
      );
    }

    const gasData = await gasRes.json();
    return NextResponse.json({ ok: true, ...gasData, totalPrepared: sessions.length });
  } catch (e) {
    console.error("[sync-qlhs]", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// GET — kiểm tra cấu hình (không cần auth)
export async function GET() {
  const configured = Boolean(GAS_URL && GAS_SECRET);
  return NextResponse.json({
    status: configured ? "✅ Đã cấu hình QLHS sync" : "⚠️ Chưa cấu hình — thiếu QLHS_GAS_URL / QLHS_GAS_SECRET",
    gasUrl: GAS_URL ? GAS_URL.slice(0, 50) + "..." : "(trống)",
  });
}

// ----------------------------------------------------------------
// Helper: lấy QLHS student ID từ profile
// Mặc định dùng phần trước @ của email (VD: hv001@pps.edu → HV001)
// Bạn có thể thêm cột qlhs_id vào bảng profiles nếu muốn mapping riêng
// ----------------------------------------------------------------
function qlhsIdFromProfile(p: { id: string; full_name: string; email: string | null }): string {
  if (p.email) {
    return p.email.split("@")[0].toUpperCase();
  }
  return p.id.slice(0, 8).toUpperCase();
}
