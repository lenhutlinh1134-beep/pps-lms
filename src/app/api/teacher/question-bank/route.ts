import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/teacher/question-bank — Tạo ngân hàng + câu hỏi cùng lúc
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
    const { title, description, subject, questions } = body as {
      title: string;
      description?: string;
      subject?: string;
      questions: {
        content: string;
        type: "multiple_choice" | "essay";
        options: Record<string, string> | null;
        correct_answer: string | null;
        max_score: number;
      }[];
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: "Tên ngân hàng không được để trống" }, { status: 400 });
    }
    if (!questions?.length) {
      return NextResponse.json({ error: "Ngân hàng phải có ít nhất 1 câu hỏi" }, { status: 400 });
    }
    if (questions.length > 500) {
      return NextResponse.json({ error: "Tối đa 500 câu hỏi mỗi ngân hàng" }, { status: 400 });
    }

    // Tạo ngân hàng
    const { data: bank, error: bankError } = await supabase
      .from("question_banks")
      .insert({ teacher_id: user.id, title: title.trim(), description: description?.trim(), subject: subject?.trim() })
      .select("id")
      .single();

    if (bankError || !bank) {
      console.error("[question-bank POST] bank:", bankError);
      return NextResponse.json({ error: "Không thể tạo ngân hàng" }, { status: 500 });
    }

    // Insert câu hỏi theo batch
    const rows = questions.map((q, i) => ({
      bank_id: bank.id,
      content: q.content.trim(),
      type: q.type,
      options: q.options ?? null,
      correct_answer: q.correct_answer ?? null,
      max_score: q.max_score ?? 1,
      order_index: i,
    }));

    const { error: qError } = await supabase.from("questions").insert(rows);

    if (qError) {
      // Rollback bank nếu insert câu hỏi lỗi
      await supabase.from("question_banks").delete().eq("id", bank.id);
      console.error("[question-bank POST] questions:", qError);
      return NextResponse.json({ error: "Không thể lưu câu hỏi" }, { status: 500 });
    }

    return NextResponse.json({ id: bank.id, total: questions.length }, { status: 201 });
  } catch (e) {
    console.error("[question-bank POST] unexpected", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
