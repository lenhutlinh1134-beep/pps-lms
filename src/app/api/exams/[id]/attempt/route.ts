import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/exams/[id]/attempt — Bắt đầu lần làm bài mới (hoặc tiếp tục bài cũ)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examSetId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "student") {
      return NextResponse.json({ error: "Chỉ học sinh mới được làm bài" }, { status: 403 });
    }

    // Kiểm tra đề thi tồn tại và published
    const { data: exam } = await supabase
      .from("exam_sets")
      .select("id, total_questions, duration_minutes, is_published")
      .eq("id", examSetId)
      .single();
    if (!exam || !exam.is_published) {
      return NextResponse.json({ error: "Đề thi không tồn tại hoặc chưa được công bố" }, { status: 404 });
    }

    // Nếu có bài đang làm dở → trả về bài đó
    const { data: existing } = await supabase
      .from("exam_attempts")
      .select("id, started_at")
      .eq("exam_set_id", examSetId)
      .eq("student_id", user.id)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ attemptId: existing.id, startedAt: existing.started_at, resumed: true });
    }

    // Tạo attempt mới
    const { data: attempt, error } = await supabase
      .from("exam_attempts")
      .insert({
        exam_set_id:  examSetId,
        student_id:   user.id,
        total_points: exam.total_questions,
        status:       "in_progress",
      })
      .select("id, started_at").single();

    if (error || !attempt) {
      return NextResponse.json({ error: error?.message ?? "Không thể bắt đầu bài thi" }, { status: 500 });
    }

    return NextResponse.json({ attemptId: attempt.id, startedAt: attempt.started_at, resumed: false });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// GET /api/exams/[id]/attempt — Lấy danh sách tất cả attempts (học sinh: của mình)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examSetId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const { data } = await supabase
      .from("exam_attempts")
      .select("id, started_at, submitted_at, score, total_points, band_score, status, time_spent_seconds")
      .eq("exam_set_id", examSetId)
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ attempts: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
