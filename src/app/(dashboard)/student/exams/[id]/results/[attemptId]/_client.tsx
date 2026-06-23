"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock, RotateCcw, BookOpen, ChevronDown, ChevronUp } from "lucide-react";

interface AnswerRecord {
  question_id: string;
  student_answer: string;
  is_correct: boolean;
}

interface Question {
  id: string;
  question_number: number;
  question_type: string;
  question_text: string | null;
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
  passage_id: string | null;
}

interface Attempt {
  id: string;
  score: number;
  total_points: number;
  band_score: number | null;
  time_spent_seconds: number | null;
  submitted_at: string;
  status: string;
}

function formatTime(sec: number | null): string {
  if (!sec) return "--";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function BandCircle({ band }: { band: number }) {
  const color = band >= 7 ? "#16a34a" : band >= 5.5 ? "#d97706" : "#dc2626";
  const label = band >= 8 ? "Xuất sắc" : band >= 7 ? "Tốt" : band >= 6 ? "Khá" : band >= 5 ? "Trung bình" : "Cần cố gắng";
  return (
    <div className="flex flex-col items-center">
      <div className="w-28 h-28 rounded-full border-8 flex flex-col items-center justify-center"
        style={{ borderColor: color }}>
        <span className="text-3xl font-bold" style={{ color }}>{band.toFixed(1)}</span>
        <span className="text-xs text-gray-500">Band</span>
      </div>
      <p className="mt-2 text-sm font-semibold" style={{ color }}>{label}</p>
    </div>
  );
}

function QuestionReview({ q, answer }: { q: Question; answer: AnswerRecord | undefined }) {
  const [open, setOpen] = useState(false);
  const correct = answer?.is_correct ?? false;
  const student = answer?.student_answer ?? "";
  const isEmpty = !student;

  return (
    <div className={`rounded-xl border mb-2 ${correct ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"}`}>
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-3 text-left">
        <span className={`flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center
          ${correct ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {q.question_number}
        </span>
        <span className="flex-1 text-sm text-gray-700 truncate">
          {q.question_text ? q.question_text.slice(0, 80) + (q.question_text.length > 80 ? "…" : "") : `Câu ${q.question_number}`}
        </span>
        <span className="flex-shrink-0 flex items-center gap-1 text-xs">
          {correct
            ? <><CheckCircle size={14} className="text-green-500" /><span className="text-green-600">Đúng</span></>
            : <><XCircle size={14} className="text-red-500" /><span className="text-red-600">{isEmpty ? "Bỏ trống" : "Sai"}</span></>}
        </span>
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
          {q.question_text && (
            <p className="text-sm text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: q.question_text.replace(/\n/g, "<br>") }} />
          )}
          {q.options && (
            <div className="space-y-1">
              {q.options.map((opt) => {
                const letter = opt.charAt(0);
                const isCorrectOpt = letter === q.correct_answer;
                const isStudentOpt = letter === student;
                return (
                  <div key={opt} className={`flex items-start gap-2 text-sm px-2 py-1 rounded-lg
                    ${isCorrectOpt ? "bg-green-100 text-green-700" : isStudentOpt && !correct ? "bg-red-100 text-red-600" : "text-gray-600"}`}>
                    <span className="font-medium">{isCorrectOpt ? "✓" : isStudentOpt && !correct ? "✗" : " "}</span>
                    {opt}
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-4 text-xs mt-2">
            <span className="text-gray-500">Bạn trả lời: <strong className={correct ? "text-green-600" : "text-red-600"}>{student || "(bỏ trống)"}</strong></span>
            {!correct && <span className="text-gray-500">Đáp án đúng: <strong className="text-green-600">{q.correct_answer}</strong></span>}
          </div>
          {q.explanation && (
            <div className="mt-2 bg-blue-50 rounded-xl p-3 text-xs text-blue-700 leading-relaxed">
              💡 {q.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ExamResultsClient() {
  const { id: examId, attemptId } = useParams<{ id: string; attemptId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerRecord>>({});
  const [examTitle, setExamTitle] = useState("");
  const [examType, setExamType] = useState("ielts");
  const [showReview, setShowReview] = useState(false);
  const [filterResult, setFilterResult] = useState<"all" | "correct" | "wrong">("all");

  useEffect(() => {
    async function load() {
      try {
        const [examRes, attRes, ansRes] = await Promise.all([
          fetch(`/api/exams/${examId}`),
          fetch(`/api/exams/${examId}/attempt`),
          fetch(`/api/exams/${examId}/attempt/${attemptId}/answer`),
        ]);
        const examData = await examRes.json() as {
          exam?: { title: string; exam_type: string };
          questions?: Question[];
        };
        const attData = await attRes.json() as { attempts?: Attempt[] };
        const ansData = await ansRes.json() as { answers?: Record<string, AnswerRecord> };

        setExamTitle(examData.exam?.title ?? "Kết quả bài thi");
        setExamType(examData.exam?.exam_type ?? "ielts");
        setQuestions(examData.questions ?? []);
        setAnswers(ansData.answers ?? {});

        const found = attData.attempts?.find((a) => a.id === attemptId);
        if (found) setAttempt(found);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [examId, attemptId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-[#6b38d4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Không tìm thấy kết quả bài thi</p>
      </div>
    );
  }

  const pct = attempt.total_points > 0 ? Math.round((attempt.score / attempt.total_points) * 100) : 0;
  const correctCount = questions.filter((q) => answers[q.id]?.is_correct).length;
  const wrongCount   = questions.filter((q) => answers[q.id] && !answers[q.id].is_correct).length;
  const blankCount   = questions.filter((q) => !answers[q.id]?.student_answer).length;

  const filteredQs = questions.filter((q) => {
    if (filterResult === "correct") return answers[q.id]?.is_correct;
    if (filterResult === "wrong")   return answers[q.id] && !answers[q.id].is_correct;
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => router.push("/student/exams")}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
          ← Danh sách đề
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-medium truncate">{examTitle}</span>
      </div>

      {/* Score card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h1 className="text-lg font-bold text-gray-900 mb-6 text-center">Kết quả bài thi</h1>
        <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
          {examType === "ielts" && attempt.band_score && (
            <BandCircle band={Number(attempt.band_score)} />
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-[#6b38d4]">{attempt.score}<span className="text-base font-normal text-gray-400">/{attempt.total_points}</span></p>
              <p className="text-xs text-gray-500 mt-1">Điểm số</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-[#6b38d4]">{pct}<span className="text-base font-normal text-gray-400">%</span></p>
              <p className="text-xs text-gray-500 mt-1">Tỷ lệ đúng</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{correctCount}</p>
              <p className="text-xs text-gray-500 mt-1">Câu đúng</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-red-500">{wrongCount + blankCount}</p>
              <p className="text-xs text-gray-500 mt-1">Câu sai / bỏ</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
          <Clock size={14} />
          Thời gian làm bài: <strong>{formatTime(attempt.time_spent_seconds)}</strong>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <button onClick={() => setShowReview((s) => !s)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#6b38d4] text-[#6b38d4] text-sm font-semibold hover:bg-[#6b38d4]/5 transition-colors">
          <BookOpen size={15} />
          {showReview ? "Ẩn đáp án" : "Xem đáp án & giải thích"}
        </button>
        <button
          onClick={async () => {
            const res = await fetch(`/api/exams/${examId}/attempt`, { method: "POST" });
            const d = await res.json() as { attemptId?: string };
            if (d.attemptId) router.push(`/student/exams/${examId}/take?attempt=${d.attemptId}`);
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#6b38d4] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          <RotateCcw size={15} /> Làm lại
        </button>
      </div>

      {/* Review */}
      {showReview && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Chi tiết từng câu</h2>
            <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs">
              {[
                { value: "all",     label: "Tất cả" },
                { value: "correct", label: `Đúng (${correctCount})` },
                { value: "wrong",   label: `Sai (${wrongCount + blankCount})` },
              ].map((opt) => (
                <button key={opt.value}
                  onClick={() => setFilterResult(opt.value as typeof filterResult)}
                  className={`px-3 py-1.5 font-medium transition-colors
                    ${filterResult === opt.value ? "bg-[#6b38d4] text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            {filteredQs.map((q) => (
              <QuestionReview key={q.id} q={q} answer={answers[q.id]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
