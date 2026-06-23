import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/exams/[id]/attempt/[attemptId]/answer — Lưu/cập nhật câu trả lời
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attemptId: string }> }
) {
  try {
    const { attemptId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    // Xác nhận attempt thuộc user và còn in_progress
    const { data: attempt } = await supabase
      .from("exam_attempts")
      .select("id, status")
      .eq("id", attemptId)
      .eq("student_id", user.id)
      .single();

    if (!attempt) return NextResponse.json({ error: "Không tìm thấy lần làm bài" }, { status: 404 });
    if (attempt.status !== "in_progress") {
      return NextResponse.json({ error: "Bài thi đã được nộp" }, { status: 400 });
    }

    const body = await req.json() as { question_id: string; student_answer: string };
    if (!body.question_id) return NextResponse.json({ error: "Thiếu question_id" }, { status: 400 });

    // Upsert answer (on conflict = cập nhật)
    const { error } = await supabase
      .from("exam_answers")
      .upsert(
        {
          attempt_id:     attemptId,
          question_id:    body.question_id,
          student_answer: body.student_answer ?? "",
          answered_at:    new Date().toISOString(),
        },
        { onConflict: "attempt_id,question_id" }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// GET /api/exams/[id]/attempt/[attemptId]/answer — Lấy tất cả câu trả lời đã lưu
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attemptId: string }> }
) {
  try {
    const { attemptId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const { data } = await supabase
      .from("exam_answers")
      .select("question_id, student_answer, is_correct")
      .eq("attempt_id", attemptId);

    const answerMap: Record<string, { answer: string; isCorrect: boolean | null }> = {};
    for (const a of data ?? []) {
      answerMap[a.question_id] = { answer: a.student_answer ?? "", isCorrect: a.is_correct };
    }

    return NextResponse.json({ answers: answerMap });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
