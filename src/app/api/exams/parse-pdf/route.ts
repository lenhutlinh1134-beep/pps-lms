import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PARSE_PROMPT = `Bạn là trợ lý chuyên phân tích đề thi IELTS/KET/PET/TOEIC từ văn bản PDF.

Phân tích văn bản đề thi bên dưới và trả về JSON theo đúng cấu trúc sau (KHÔNG kèm markdown, KHÔNG kèm giải thích — chỉ JSON thuần):

{
  "title": "Tên đề thi (ví dụ: IELTS Academic Reading Test 5)",
  "skill": "reading" hoặc "listening",
  "exam_type": "ielts" hoặc "ket" hoặc "pet" hoặc "toeic" hoặc "internal",
  "duration_minutes": số phút (60 cho reading, 30 cho listening),
  "passages": [
    {
      "title": "Tiêu đề passage (ví dụ: SECTION A - The History of...)",
      "content_text": "Toàn bộ nội dung đoạn văn, giữ nguyên các đoạn, dùng \\n để xuống dòng",
      "q_start": số câu bắt đầu,
      "q_end": số câu kết thúc,
      "questions": [
        {
          "question_number": 1,
          "question_type": "mcq" hoặc "fill_blank" hoặc "tfng" hoặc "ynng" hoặc "short_answer",
          "question_text": "Nội dung câu hỏi (nếu có)",
          "options": ["A. ...", "B. ...", "C. ...", "D. ..."] chỉ khi là MCQ, null nếu không phải,
          "correct_answer": "Đáp án đúng (A/B/C/D cho MCQ, True/False/Not Given cho TFNG, text cho fill_blank)",
          "explanation": "Giải thích ngắn tại sao đây là đáp án đúng (tùy chọn)"
        }
      ]
    }
  ]
}

Lưu ý quan trọng:
- question_type: dùng "tfng" cho True/False/Not Given, "ynng" cho Yes/No/Not Given
- Với fill_blank: correct_answer là từ/cụm từ cần điền, nếu nhiều đáp án chấp nhận thì dùng | để tách (ví dụ: "climate|climatic change")
- Giữ nguyên số thứ tự câu hỏi theo đề gốc
- Nếu đề có Answer Key ở cuối, dùng để điền correct_answer
- Với passage content_text: giữ nguyên định dạng đoạn văn, không cắt bỏ
- Nếu không tìm thấy đáp án cho một câu, để correct_answer là ""

Văn bản đề thi cần phân tích:
`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Chỉ giáo viên mới được dùng tính năng này" }, { status: 403 });
    }

    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_anthropic_api_key_here") {
      return NextResponse.json({ error: "Chưa cấu hình ANTHROPIC_API_KEY" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "Không có file PDF" }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Chỉ chấp nhận file PDF" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File quá lớn (tối đa 10MB)" }, { status: 400 });
    }

    // Đọc PDF → extract text
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let pdfText = "";
    try {
      /* eslint-disable-next-line */
      const pdfParse = require("pdf-parse") as (buf: Buffer, opts?: { max?: number }) => Promise<{ text: string }>;
      const pdfData = await pdfParse(buffer, { max: 0 });
      pdfText = pdfData.text;
    } catch {
      return NextResponse.json({ error: "Không đọc được file PDF. Vui lòng thử file khác." }, { status: 400 });
    }

    if (!pdfText.trim()) {
      return NextResponse.json({ error: "File PDF không có nội dung text (có thể là PDF scan ảnh)" }, { status: 400 });
    }

    // Giới hạn text để tránh token quá lớn (~50k chars ≈ 12k tokens)
    const truncated = pdfText.length > 50000 ? pdfText.slice(0, 50000) + "\n\n[... nội dung bị cắt do quá dài]" : pdfText;

    // Gọi Claude để parse
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: PARSE_PROMPT + truncated,
        },
      ],
    });

    const rawContent = message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON từ response
    let parsed: object;
    try {
      // Tìm JSON trong response (có thể có text trước/sau)
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Không tìm thấy JSON trong kết quả");
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({
        error: "AI không parse được file này. Hãy thử với file có text rõ ràng hơn.",
        rawOutput: rawContent.slice(0, 500),
      }, { status: 422 });
    }

    return NextResponse.json({ parsed, filename: file.name });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
