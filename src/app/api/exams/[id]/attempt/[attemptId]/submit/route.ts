import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Band score IELTS theo số câu đúng (Reading & Listening dùng chung)
function calcBandScore(correct: number, total: number): number {
  if (total <= 0) return 0;
  const pct = correct / total;
  if (pct >= 0.975) return 9.0;
  if (pct >= 0.95)  return 8.5;
  if (pct >= 0.90)  return 8.0;
  if (pct >= 0.875) return 7.5;
  if (pct >= 0.825) return 7.0;
  if (pct >= 0.775) return 6.5;
  if (pct >= 0.725) return 6.0;
  if (pct >= 0.65)  return 5.5;
  if (pct >= 0.575) return 5.0;
  if (pct >= 0.45)  return 4.5;
  if (pct >= 0.375) return 4.0;
  if (pct >= 0.30)  return 3.5;
  if (pct >= 0.225) return 3.0;
  return 2.5;
}

// Chấm điểm fill_blank: không phân biệt hoa thường, trim
function isAnswerCorrect(type: string, student: string, correct: string): boolean {
  const s = student.trim().toLowerCase();
  const c = correct.trim().toLowerCase();
  if (type === "fill_blank" || type === "short_answer") {
    // Chấp nhận nhiều đáp án cách nhau bởi |
    return c.split("|").some((ans) => ans.trim() === s);
  }
  return s === c;
}

// POST /api/exams/[id]/attempt/[attemptId]/submit — Nộp bài + chấm điểm
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attemptId: string }> }
) {
  try {
    const { id: examSetId, attemptId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    // Xác nhận attempt
    const { data: attempt } = await supabase
      .from("exam_attempts")
      .select("id, status, started_at, total_points")
      .eq("id", attemptId)
      .eq("student_id", user.id)
      .single();

    if (!attempt) return NextResponse.json({ error: "Không tìm thấy lần làm bài" }, { status: 404 });
    if (attempt.status === "submitted") {
      return NextResponse.json({ error: "Bài đã được nộp rồi" }, { status: 400 });
    }

    // Lấy tất cả câu hỏi của đề
    const { data: questions } = await supabase
      .from("exam_questions")
      .select("id, question_type, correct_answer, points")
      .eq("exam_set_id", examSetId);

    if (!questions?.length) return NextResponse.json({ error: "Đề không có câu hỏi" }, { status: 400 });

    // Lấy câu trả lời đã lưu
    const { data: savedAnswers } = await supabase
      .from("exam_answers")
      .select("question_id, student_answer")
      .eq("attempt_id", attemptId);

    const savedMap: Record<string, string> = {};
    for (const a of savedAnswers ?? []) {
      savedMap[a.question_id] = a.student_answer ?? "";
    }

    // Nhận answers từ body (client gửi kèm lúc submit để capture câu chưa auto-save)
    let bodyAnswers: Record<string, string> = {};
    try {
      const body = await req.json() as { answers?: Record<string, string>; timeSpent?: number };
      bodyAnswers = body.answers ?? {};
      // Merge: body overrides saved
      Object.assign(savedMap, bodyAnswers);
      // Lưu time spent
      if (body.timeSpent) {
        await supabase.from("exam_attempts")
          .update({ time_spent_seconds: body.timeSpent })
          .eq("id", attemptId);
      }
    } catch { /* body optional */ }

    // Chấm điểm
    let score = 0;
    const totalPoints = questions.reduce((s, q) => s + q.points, 0);
    const answerUpdates = questions.map((q) => {
      const studentAns = savedMap[q.id] ?? "";
      const correct = isAnswerCorrect(q.question_type, studentAns, q.correct_answer);
      if (correct) score += q.points;
      return {
        attempt_id:     attemptId,
        question_id:    q.id,
        student_answer: studentAns,
        is_correct:     correct,
        answered_at:    new Date().toISOString(),
      };
    });

    // Upsert tất cả answers với kết quả chấm
    await supabase
      .from("exam_answers")
      .upsert(answerUpdates, { onConflict: "attempt_id,question_id" });

    // Tính band score (IELTS)
    const bandScore = calcBandScore(score, totalPoints);
    const timeSpent = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000);

    // Cập nhật attempt
    const { data: updated, error: updateErr } = await supabase
      .from("exam_attempts")
      .update({
        status:            "submitted",
        submitted_at:      new Date().toISOString(),
        score,
        total_points:      totalPoints,
        band_score:        bandScore,
        time_spent_seconds: timeSpent,
      })
      .eq("id", attemptId)
      .select("id, score, total_points, band_score, time_spent_seconds")
      .single();

    if (updateErr || !updated) {
      return NextResponse.json({ error: "Lỗi khi lưu kết quả" }, { status: 500 });
    }

    return NextResponse.json({
      score,
      totalPoints,
      bandScore,
      percentage: totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0,
      timeSpent,
      attemptId,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
