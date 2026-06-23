import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/exams/[id] — Chi tiết đề + passages + câu hỏi (ẩn correct_answer nếu chưa nộp)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();

    const { data: exam, error } = await supabase
      .from("exam_sets")
      .select("id, title, description, skill, exam_type, duration_minutes, total_questions, is_published, thumbnail_url")
      .eq("id", id)
      .single();

    if (error || !exam) return NextResponse.json({ error: "Không tìm thấy đề thi" }, { status: 404 });
    if (!exam.is_published && profile?.role !== "teacher") {
      return NextResponse.json({ error: "Đề thi chưa được công bố" }, { status: 403 });
    }

    const { data: passages } = await supabase
      .from("exam_passages")
      .select("id, order_index, title, content_text, audio_url, image_url, q_start, q_end")
      .eq("exam_set_id", id)
      .order("order_index");

    const { data: questions } = await supabase
      .from("exam_questions")
      .select("id, passage_id, question_number, question_type, question_text, options, points, correct_answer, explanation")
      .eq("exam_set_id", id)
      .order("question_number");

    // Kiểm tra attempt in_progress
    const { data: activeAttempt } = await supabase
      .from("exam_attempts")
      .select("id, started_at, status")
      .eq("exam_set_id", id)
      .eq("student_id", user.id)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Ẩn correct_answer & explanation nếu học sinh đang làm bài
    const isTeacher = profile?.role === "teacher";
    const safeQuestions = questions?.map((q) => ({
      ...q,
      correct_answer: isTeacher ? q.correct_answer : undefined,
      explanation:    isTeacher ? q.explanation    : undefined,
    }));

    return NextResponse.json({
      exam,
      passages: passages ?? [],
      questions: safeQuestions ?? [],
      activeAttemptId: activeAttempt?.id ?? null,
      activeAttemptStartedAt: activeAttempt?.started_at ?? null,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PATCH /api/exams/[id] — Giáo viên toggle publish
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const body = await req.json() as { is_published?: boolean };
    const { data, error } = await supabase
      .from("exam_sets")
      .update({ is_published: body.is_published })
      .eq("id", id)
      .eq("created_by", user.id)
      .select("id, is_published").single();

    if (error || !data) return NextResponse.json({ error: "Không thể cập nhật" }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
