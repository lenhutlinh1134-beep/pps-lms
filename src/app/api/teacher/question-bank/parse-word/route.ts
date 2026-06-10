import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { createClient } from "@/lib/supabase/server";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ParsedQuestion {
  content: string;
  type: "multiple_choice" | "essay";
  options: Record<string, string> | null; // {"A":"...","B":"...","C":"...","D":"..."}
  correct_answer: string | null;          // "A" | "B" | "C" | "D"
  max_score: number;
}

// ─── Parser helpers ────────────────────────────────────────────────────────

// Nhận dạng câu hỏi: "Câu 1:", "1.", "1)"
const Q_START = /^(?:câu\s*)?(\d+)[.):\s]/i;
// Đáp án A–D: "A." "A)" "A:"
const OPTION = /^([A-D])[.):\s]\s*(.+)/i;
// Dòng đáp án đúng: "Đáp án: B" hoặc "Đáp án: A"
const CORRECT = /^(?:đáp án|đáp án đúng|answer)[:\s]+([A-D])/i;
// Điểm tối đa cho câu tự luận: "Điểm: 5" hoặc "Điểm tối đa: 5"
const MAX_SCORE = /^(?:điểm tối đa|điểm|score)[:\s]+(\d+)/i;

function parseLines(lines: string[]): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  let current: Partial<ParsedQuestion> & { optionsMap?: Record<string, string> } | null = null;

  function pushCurrent() {
    if (!current?.content) return;
    const hasOptions = current.optionsMap && Object.keys(current.optionsMap).length >= 2;
    questions.push({
      content: current.content.trim(),
      type: hasOptions ? "multiple_choice" : "essay",
      options: hasOptions ? current.optionsMap! : null,
      correct_answer: current.correct_answer ?? null,
      max_score: current.max_score ?? 1,
    });
    current = null;
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (Q_START.test(line)) {
      pushCurrent();
      // Lấy nội dung sau số thứ tự
      const content = line.replace(Q_START, "").trim();
      current = { content, optionsMap: {} };
      continue;
    }

    if (!current) continue;

    const optMatch = line.match(OPTION);
    if (optMatch) {
      current.optionsMap![optMatch[1].toUpperCase()] = optMatch[2].trim();
      continue;
    }

    const correctMatch = line.match(CORRECT);
    if (correctMatch) {
      current.correct_answer = correctMatch[1].toUpperCase();
      continue;
    }

    const scoreMatch = line.match(MAX_SCORE);
    if (scoreMatch) {
      current.max_score = parseInt(scoreMatch[1], 10) || 1;
      continue;
    }

    // Nội dung tiếp theo của câu hỏi (dòng tiếp theo trước khi gặp option)
    if (!current.optionsMap || Object.keys(current.optionsMap).length === 0) {
      current.content += " " + line;
    }
  }

  pushCurrent();
  return questions;
}

// ─── Route ────────────────────────────────────────────────────────────────

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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Vui lòng chọn file .docx" }, { status: 400 });
    }
    if (!file.name.endsWith(".docx")) {
      return NextResponse.json({ error: "Chỉ hỗ trợ file .docx" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File không được vượt quá 5MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.extractRawText({ buffer });
    const lines = result.value.split("\n").map((l) => l.trim()).filter(Boolean);

    const questions = parseLines(lines);

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy câu hỏi nào. Hãy kiểm tra định dạng file theo mẫu." },
        { status: 422 },
      );
    }

    return NextResponse.json({ questions, total: questions.length });
  } catch (e) {
    console.error("[parse-word POST] unexpected", e);
    return NextResponse.json({ error: "Lỗi xử lý file" }, { status: 500 });
  }
}
