import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/exams?skill=reading&exam_type=ielts
// Student: chỉ thấy published. Teacher: thấy hết đề mình tạo.
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Không tìm thấy profile" }, { status: 403 });

    const url = new URL(req.url);
    const skill     = url.searchParams.get("skill");
    const exam_type = url.searchParams.get("exam_type");

    let query = supabase
      .from("exam_sets")
      .select("id, title, description, skill, exam_type, duration_minutes, total_questions, is_published, thumbnail_url, created_at, created_by")
      .order("created_at", { ascending: false });

    if (profile.role === "student") {
      query = query.eq("is_published", true);
    } else if (profile.role === "teacher") {
      query = query.eq("created_by", user.id);
    }

    if (skill)     query = query.eq("skill", skill);
    if (exam_type) query = query.eq("exam_type", exam_type);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Nếu là học sinh: kèm attempt count & last score
    if (profile.role === "student" && data?.length) {
      const examIds = data.map((e) => e.id);
      const { data: attempts } = await supabase
        .from("exam_attempts")
        .select("exam_set_id, score, total_points, band_score, status, submitted_at")
        .eq("student_id", user.id)
        .in("exam_set_id", examIds)
        .order("created_at", { ascending: false });

      const attemptMap: Record<string, { count: number; lastBand: number | null; lastScore: number | null; hasUnfinished: boolean }> = {};
      for (const a of attempts ?? []) {
        if (!attemptMap[a.exam_set_id]) {
          attemptMap[a.exam_set_id] = {
            count: 0,
            lastBand: a.band_score ? parseFloat(a.band_score) : null,
            lastScore: a.total_points > 0 ? Math.round((a.score / a.total_points) * 100) : null,
            hasUnfinished: false,
          };
        }
        attemptMap[a.exam_set_id].count++;
        if (a.status === "in_progress") attemptMap[a.exam_set_id].hasUnfinished = true;
      }

      return NextResponse.json({
        exams: data.map((e) => ({ ...e, attemptInfo: attemptMap[e.id] ?? null })),
      });
    }

    return NextResponse.json({ exams: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/exams — Giáo viên tạo bộ đề mới
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Chỉ giáo viên mới được tạo đề" }, { status: 403 });
    }

    const body = await req.json() as {
      title: string; description?: string; skill: string;
      exam_type?: string; duration_minutes?: number;
      passages: Array<{
        title?: string; content_text?: string; audio_url?: string;
        image_url?: string; q_start?: number; q_end?: number;
        questions: Array<{
          question_number: number; question_type: string;
          question_text?: string; options?: string[];
          correct_answer: string; explanation?: string; points?: number;
        }>;
      }>;
    };

    if (!body.title?.trim()) return NextResponse.json({ error: "Tên đề không được trống" }, { status: 400 });
    if (!body.skill)         return NextResponse.json({ error: "Thiếu kỹ năng (reading/listening)" }, { status: 400 });
    if (!body.passages?.length) return NextResponse.json({ error: "Đề phải có ít nhất 1 passage" }, { status: 400 });

    const totalQ = body.passages.reduce((s, p) => s + (p.questions?.length ?? 0), 0);

    // Tạo exam_set
    const { data: examSet, error: setErr } = await supabase
      .from("exam_sets")
      .insert({
        title:            body.title.trim(),
        description:      body.description?.trim() ?? null,
        skill:            body.skill,
        exam_type:        body.exam_type ?? "ielts",
        duration_minutes: body.duration_minutes ?? 60,
        total_questions:  totalQ,
        is_published:     false,
        created_by:       user.id,
      })
      .select("id").single();
    if (setErr || !examSet) return NextResponse.json({ error: setErr?.message ?? "Tạo đề thất bại" }, { status: 500 });

    // Tạo passages + questions
    for (let pi = 0; pi < body.passages.length; pi++) {
      const p = body.passages[pi];
      const { data: passage, error: pErr } = await supabase
        .from("exam_passages")
        .insert({
          exam_set_id:  examSet.id,
          order_index:  pi,
          title:        p.title ?? null,
          content_text: p.content_text ?? null,
          audio_url:    p.audio_url ?? null,
          image_url:    p.image_url ?? null,
          q_start:      p.q_start ?? null,
          q_end:        p.q_end ?? null,
        })
        .select("id").single();
      if (pErr || !passage) continue;

      if (p.questions?.length) {
        await supabase.from("exam_questions").insert(
          p.questions.map((q) => ({
            exam_set_id:     examSet.id,
            passage_id:      passage.id,
            question_number: q.question_number,
            question_type:   q.question_type,
            question_text:   q.question_text ?? null,
            options:         q.options ?? null,
            correct_answer:  q.correct_answer,
            explanation:     q.explanation ?? null,
            points:          q.points ?? 1,
          }))
        );
      }
    }

    return NextResponse.json({ id: examSet.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
