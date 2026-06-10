import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Database, FileText, CheckCircle2 } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

interface QuestionRow {
  id: string;
  content: string;
  type: "multiple_choice" | "essay";
  options: Record<string, string> | null;
  correct_answer: string | null;
  max_score: number;
  order_index: number;
}

interface BankDetail {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  created_at: string;
}

const DEMO_BANK: BankDetail = {
  id: "demo-b1",
  title: "Trắc nghiệm Unit 1–5",
  description: "Vocabulary & Grammar",
  subject: "Tiếng Anh",
  created_at: new Date(Date.now() - 86400_000 * 3).toISOString(),
};

const DEMO_QUESTIONS: QuestionRow[] = [
  { id: "q1", content: "What is the capital of England?", type: "multiple_choice", options: { A: "Paris", B: "London", C: "Berlin", D: "Rome" }, correct_answer: "B", max_score: 1, order_index: 0 },
  { id: "q2", content: "Choose the correct form: She ___ to school every day.", type: "multiple_choice", options: { A: "go", B: "goes", C: "going", D: "gone" }, correct_answer: "B", max_score: 1, order_index: 1 },
  { id: "q3", content: "What does 'magnificent' mean?", type: "multiple_choice", options: { A: "Very small", B: "Very ugly", C: "Very impressive", D: "Very cheap" }, correct_answer: "C", max_score: 1, order_index: 2 },
  { id: "q4", content: "Describe your favourite season in 3–5 sentences.", type: "essay", options: null, correct_answer: null, max_score: 5, order_index: 3 },
  { id: "q5", content: "Write a short paragraph about your daily routine.", type: "essay", options: null, correct_answer: null, max_score: 5, order_index: 4 },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export default async function QuestionBankDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole("teacher");
  const isDemo = profile.id.startsWith("demo-");

  let bank: BankDetail | null = null;
  let questions: QuestionRow[] = [];

  if (isDemo) {
    bank = DEMO_BANK;
    questions = DEMO_QUESTIONS;
  } else {
    const supabase = await createClient();
    try {
      const [bankRes, questionsRes] = await Promise.all([
        supabase
          .from("question_banks")
          .select("id, title, description, subject, created_at")
          .eq("id", id)
          .eq("teacher_id", profile.id)
          .single(),
        supabase
          .from("questions")
          .select("id, content, type, options, correct_answer, max_score, order_index")
          .eq("bank_id", id)
          .order("order_index", { ascending: true }),
      ]);

      if (!bankRes.data) notFound();
      bank = bankRes.data as BankDetail;
      questions = (questionsRes.data ?? []) as QuestionRow[];
    } catch {
      notFound();
    }
  }

  if (!bank) notFound();

  const mcCount = questions.filter((q) => q.type === "multiple_choice").length;
  const essayCount = questions.filter((q) => q.type === "essay").length;
  const totalScore = questions.reduce((sum, q) => sum + q.max_score, 0);

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-3xl flex-col gap-lg">

        {/* Back + header */}
        <div>
          <Link
            href="/teacher/question-bank"
            className="mb-sm inline-flex items-center gap-xs text-label-md text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft size={16} /> Ngân hàng câu hỏi
          </Link>
          <div className="flex items-start gap-md">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed">
              <Database size={24} className="text-primary" />
            </span>
            <div>
              <h1 className="text-display-lg">{bank.title}</h1>
              <div className="mt-xs flex flex-wrap items-center gap-sm text-label-md text-on-surface-variant">
                {bank.subject && <span className="rounded-full bg-surface-container px-2 py-0.5">{bank.subject}</span>}
                {bank.description && <span>{bank.description}</span>}
                <span>Tạo {formatDate(bank.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-md">
          {[
            { label: "Tổng câu", value: questions.length, color: "text-primary" },
            { label: "Trắc nghiệm", value: mcCount, color: "text-primary" },
            { label: "Tự luận", value: essayCount, color: "text-secondary" },
          ].map((s) => (
            <Card key={s.label} padding="md" className="text-center">
              <p className={`text-display-sm font-display ${s.color}`}>{s.value}</p>
              <p className="text-label-sm text-on-surface-variant">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Tổng điểm */}
        {totalScore > 0 && (
          <p className="text-label-md text-on-surface-variant">
            Tổng điểm tối đa: <span className="font-semibold text-on-surface">{totalScore} điểm</span>
          </p>
        )}

        {/* Questions */}
        {questions.length === 0 ? (
          <EmptyState
            icon={Database}
            title="Chưa có câu hỏi"
            description="Ngân hàng này chưa có câu hỏi nào."
          />
        ) : (
          <div className="flex flex-col gap-sm">
            {questions.map((q, i) => (
              <Card key={q.id} padding="md">
                <div className="flex items-start gap-sm mb-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-label-sm font-medium ${
                    q.type === "multiple_choice"
                      ? "bg-primary-fixed text-primary"
                      : "bg-secondary-fixed text-secondary"
                  }`}>
                    {q.type === "multiple_choice" ? "Trắc nghiệm" : "Tự luận"}
                  </span>
                  <span className="ml-auto text-label-sm text-on-surface-variant">{q.max_score} điểm</span>
                </div>

                <p className="text-body-md font-medium">{q.content}</p>

                {q.type === "multiple_choice" && q.options && (
                  <div className="mt-sm grid grid-cols-1 gap-xs sm:grid-cols-2">
                    {Object.entries(q.options).map(([key, val]) => (
                      <div
                        key={key}
                        className={`flex items-center gap-xs rounded-lg px-3 py-2 text-body-md ${
                          key === q.correct_answer
                            ? "bg-tertiary-fixed text-on-tertiary-fixed"
                            : "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-label-sm font-bold ${
                          key === q.correct_answer ? "bg-white/40" : "bg-surface"
                        }`}>{key}</span>
                        {val}
                        {key === q.correct_answer && (
                          <CheckCircle2 size={14} className="ml-auto shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {q.type === "essay" && (
                  <div className="mt-sm rounded-lg bg-surface-container px-3 py-2">
                    <p className="text-label-md text-on-surface-variant flex items-center gap-xs">
                      <FileText size={14} />
                      Câu tự luận — học sinh tự viết câu trả lời
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
