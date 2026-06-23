"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Flag, ChevronLeft, ChevronRight, Send, Volume2, AlertTriangle } from "lucide-react";

// ============================================================
// TYPES
// ============================================================
interface Question {
  id: string;
  passage_id: string | null;
  question_number: number;
  question_type: "mcq" | "fill_blank" | "tfng" | "ynng" | "matching" | "short_answer";
  question_text: string | null;
  options: string[] | null;
  points: number;
}

interface Passage {
  id: string;
  order_index: number;
  title: string | null;
  content_text: string | null;
  audio_url: string | null;
  image_url: string | null;
  q_start: number | null;
  q_end: number | null;
}

interface ExamData {
  exam: {
    id: string;
    title: string;
    skill: string;
    exam_type: string;
    duration_minutes: number;
    total_questions: number;
  };
  passages: Passage[];
  questions: Question[];
  activeAttemptId: string | null;
  activeAttemptStartedAt: string | null;
}

// ============================================================
// TIMER HOOK
// ============================================================
function useTimer(totalSeconds: number, onExpire: () => void) {
  const [left, setLeft] = useState(totalSeconds);
  const expired = useRef(false);

  useEffect(() => {
    if (totalSeconds <= 0) return;
    const id = setInterval(() => {
      setLeft((prev) => {
        const next = prev - 1;
        if (next <= 0 && !expired.current) {
          expired.current = true;
          clearInterval(id);
          onExpire();
        }
        return Math.max(0, next);
      });
    }, 1000);
    return () => clearInterval(id);
  }, [totalSeconds, onExpire]);

  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const fmt = h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  const urgent = left < 300; // < 5 phút
  return { fmt, urgent, left };
}

// ============================================================
// QUESTION RENDERER
// ============================================================
function QuestionItem({
  q, value, onChange, flagged, onFlag,
}: {
  q: Question;
  value: string;
  onChange: (v: string) => void;
  flagged: boolean;
  onFlag: () => void;
}) {
  const tfngOpts = ["True", "False", "Not Given"];
  const ynngOpts = ["Yes", "No", "Not Given"];

  return (
    <div id={`q-${q.question_number}`} className="mb-6 scroll-mt-4">
      {/* Question header */}
      <div className="flex items-start gap-2 mb-2">
        <span className={`flex-shrink-0 w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center
          ${value ? "bg-[#6b38d4] text-white" : "bg-gray-100 text-gray-600"}`}>
          {q.question_number}
        </span>
        <div className="flex-1">
          {q.question_text && (
            <p className="text-sm text-gray-800 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: q.question_text.replace(/\n/g, "<br>") }} />
          )}
        </div>
        <button
          onClick={onFlag}
          title={flagged ? "Bỏ đánh dấu" : "Đánh dấu câu này"}
          className={`flex-shrink-0 p-1 rounded transition-colors ${flagged ? "text-yellow-500" : "text-gray-300 hover:text-yellow-400"}`}
        >
          <Flag size={14} />
        </button>
      </div>

      {/* MCQ */}
      {q.question_type === "mcq" && q.options && (
        <div className="ml-9 space-y-1.5">
          {q.options.map((opt) => {
            const letter = opt.charAt(0);
            return (
              <label key={opt} className={`flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer border transition-all
                ${value === letter ? "border-[#6b38d4] bg-[#6b38d4]/5" : "border-transparent hover:bg-gray-50"}`}>
                <input type="radio" className="mt-0.5 accent-[#6b38d4]"
                  checked={value === letter} onChange={() => onChange(letter)} />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            );
          })}
        </div>
      )}

      {/* True/False/Not Given */}
      {(q.question_type === "tfng" || q.question_type === "ynng") && (
        <div className="ml-9 flex flex-wrap gap-2">
          {(q.question_type === "tfng" ? tfngOpts : ynngOpts).map((opt) => (
            <button key={opt}
              onClick={() => onChange(value === opt ? "" : opt)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all
                ${value === opt
                  ? "bg-[#6b38d4] text-white border-[#6b38d4]"
                  : "border-gray-200 text-gray-600 hover:border-[#6b38d4] hover:text-[#6b38d4]"}`}>
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Fill in blank / Short answer */}
      {(q.question_type === "fill_blank" || q.question_type === "short_answer") && (
        <div className="ml-9">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Nhập câu trả lời..."
            className="w-full max-w-xs border border-gray-200 rounded-xl px-3 py-2 text-sm
              focus:outline-none focus:border-[#6b38d4] focus:ring-1 focus:ring-[#6b38d4]/20"
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function ExamTakePage() {
  const { id: examId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const attemptId = searchParams.get("attempt") ?? "";

  const [data, setData] = useState<ExamData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [currentPassageIdx, setCurrentPassageIdx] = useState(0);
  const [activeQNum, setActiveQNum] = useState(1);
  const saveQueue = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load đề thi + câu trả lời đã lưu
  useEffect(() => {
    async function load() {
      try {
        const [examRes, ansRes] = await Promise.all([
          fetch(`/api/exams/${examId}`),
          attemptId ? fetch(`/api/exams/${examId}/attempt/${attemptId}/answer`) : Promise.resolve(null),
        ]);
        const examData = await examRes.json() as ExamData & { error?: string };
        if (!examRes.ok) { alert(examData.error ?? "Lỗi tải đề"); router.back(); return; }

        setData(examData);

        // Xác định startedAt để tính timer
        const sat = examData.activeAttemptStartedAt
          ? new Date(examData.activeAttemptStartedAt)
          : new Date();
        setStartedAt(sat);

        if (ansRes?.ok) {
          const ansData = await ansRes.json() as { answers?: Record<string, { answer: string }> };
          const map: Record<string, string> = {};
          for (const [qId, v] of Object.entries(ansData.answers ?? {})) {
            map[qId] = v.answer;
          }
          setAnswers(map);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [examId, attemptId, router]);

  // Debounced auto-save
  const saveAnswer = useCallback((questionId: string, value: string) => {
    if (!attemptId) return;
    clearTimeout(saveQueue.current[questionId]);
    saveQueue.current[questionId] = setTimeout(() => {
      fetch(`/api/exams/${examId}/attempt/${attemptId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: questionId, student_answer: value }),
      });
    }, 600);
  }, [examId, attemptId]);

  function handleAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    saveAnswer(questionId, value);
  }

  function toggleFlag(questionId: string) {
    setFlagged((prev) => {
      const next = new Set(prev);
      next.has(questionId) ? next.delete(questionId) : next.add(questionId);
      return next;
    });
  }

  async function handleSubmit(auto = false) {
    if (!auto && !confirmSubmit) { setConfirmSubmit(true); return; }
    setSubmitting(true);
    const timeSpent = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0;
    try {
      const res = await fetch(`/api/exams/${examId}/attempt/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, timeSpent }),
      });
      if (res.ok) {
        router.replace(`/student/exams/${examId}/results/${attemptId}`);
      } else {
        const d = await res.json() as { error?: string };
        alert(d.error ?? "Lỗi nộp bài");
        setSubmitting(false);
      }
    } catch {
      alert("Lỗi kết nối");
      setSubmitting(false);
    }
    setConfirmSubmit(false);
  }

  // Timer — tính remaining từ startedAt
  const totalSeconds = (data?.exam.duration_minutes ?? 60) * 60;
  const elapsedOnLoad = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0;
  const initialLeft = Math.max(0, totalSeconds - elapsedOnLoad);
  const { fmt: timerFmt, urgent: timerUrgent } = useTimer(
    initialLeft,
    () => handleSubmit(true)
  );

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#6b38d4] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Đang tải đề thi...</p>
        </div>
      </div>
    );
  }

  const { exam, passages, questions } = data;
  const isListening = exam.skill === "listening";

  // Group questions by passage
  const questionsByPassage: Record<string, Question[]> = {};
  for (const q of questions) {
    const pid = q.passage_id ?? "__no_passage";
    (questionsByPassage[pid] ??= []).push(q);
  }

  const answeredCount  = questions.filter((q) => answers[q.id]?.trim()).length;
  const unansweredCount = questions.length - answeredCount;
  const currentPassage = passages[currentPassageIdx];
  const passageQs = currentPassage
    ? (questionsByPassage[currentPassage.id] ?? [])
    : questions;

  function scrollToQuestion(num: number) {
    setActiveQNum(num);
    const el = document.getElementById(`q-${num}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    // Tự chuyển passage nếu câu ở passage khác
    for (let pi = 0; pi < passages.length; pi++) {
      const p = passages[pi];
      if (p.q_start && p.q_end && num >= p.q_start && num <= p.q_end) {
        setCurrentPassageIdx(pi);
        break;
      }
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* ===== HEADER ===== */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-4 shadow-sm z-20">
        <button
          onClick={() => { if (confirm("Thoát bài thi? Câu trả lời đã được lưu lại.")) router.back(); }}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft size={16} /> Thoát
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-gray-900 text-sm truncate">{exam.title}</h1>
          <p className="text-xs text-gray-400">{exam.exam_type.toUpperCase()} · {exam.skill}</p>
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-sm transition-colors
          ${timerUrgent ? "bg-red-50 text-red-600 animate-pulse" : "bg-gray-100 text-gray-700"}`}>
          <span>⏱</span> {timerFmt}
        </div>

        {/* Submit button */}
        <button
          onClick={() => handleSubmit(false)}
          disabled={submitting}
          className="flex items-center gap-1.5 bg-[#6b38d4] text-white px-4 py-1.5 rounded-xl text-sm font-semibold
            hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
        >
          <Send size={14} />
          {submitting ? "Đang nộp..." : "Nộp bài"}
        </button>
      </header>

      {/* ===== QUESTION NAV BAR ===== */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-2 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {/* Passage tabs (Reading) */}
          {passages.length > 1 && !isListening && (
            <>
              {passages.map((p, pi) => (
                <button key={p.id}
                  onClick={() => setCurrentPassageIdx(pi)}
                  className={`text-xs px-3 py-1 rounded-lg mr-2 font-medium transition-colors
                    ${currentPassageIdx === pi ? "bg-[#6b38d4] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  Passage {pi + 1}
                  {p.q_start && p.q_end && <span className="ml-1 opacity-70">({p.q_start}-{p.q_end})</span>}
                </button>
              ))}
              <div className="w-px h-5 bg-gray-200 mx-1" />
            </>
          )}

          {/* Question numbers */}
          {questions.map((q) => {
            const answered = !!answers[q.id]?.trim();
            const isFlagged = flagged.has(q.id);
            const isActive  = activeQNum === q.question_number;
            return (
              <button key={q.id}
                onClick={() => scrollToQuestion(q.question_number)}
                className={`w-7 h-7 text-xs font-bold rounded-lg flex-shrink-0 transition-all
                  ${isActive    ? "ring-2 ring-[#6b38d4] ring-offset-1" : ""}
                  ${isFlagged   ? "bg-yellow-400 text-white"
                  : answered    ? "bg-[#6b38d4] text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                {q.question_number}
              </button>
            );
          })}

          <div className="ml-3 text-xs text-gray-400 whitespace-nowrap">
            {answeredCount}/{questions.length} đã trả lời
          </div>
        </div>
      </div>

      {/* ===== MAIN BODY ===== */}
      <div className="flex-1 overflow-hidden flex">
        {/* READING: Split screen */}
        {!isListening && passages.length > 0 && (
          <>
            {/* Left: Passage */}
            <div className="w-1/2 overflow-y-auto border-r border-gray-200 bg-white">
              {/* Passage tabs nếu 1 passage */}
              {passages.length === 1 ? null : null}
              <div className="p-6">
                {currentPassage ? (
                  <>
                    {currentPassage.title && (
                      <h2 className="text-lg font-bold text-gray-900 mb-4">{currentPassage.title}</h2>
                    )}
                    {currentPassage.image_url && (
                      <img src={currentPassage.image_url} alt="Sơ đồ" className="max-w-full rounded-lg mb-4" />
                    )}
                    {currentPassage.content_text && (
                      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-serif">
                        {currentPassage.content_text}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-400 text-sm">Không có nội dung passage</p>
                )}
              </div>
            </div>

            {/* Right: Questions */}
            <div className="w-1/2 overflow-y-auto bg-gray-50">
              <div className="p-6">
                {currentPassage && (
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    Questions {currentPassage.q_start ?? ""}{currentPassage.q_end ? `–${currentPassage.q_end}` : ""}
                  </h3>
                )}
                {passageQs.map((q) => (
                  <QuestionItem
                    key={q.id} q={q}
                    value={answers[q.id] ?? ""}
                    onChange={(v) => handleAnswer(q.id, v)}
                    flagged={flagged.has(q.id)}
                    onFlag={() => toggleFlag(q.id)}
                  />
                ))}
              </div>

              {/* Navigation between passages */}
              {passages.length > 1 && (
                <div className="px-6 pb-6 flex gap-2">
                  {currentPassageIdx > 0 && (
                    <button onClick={() => setCurrentPassageIdx(i => i - 1)}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-[#6b38d4] transition-colors">
                      <ChevronLeft size={16} /> Passage trước
                    </button>
                  )}
                  <div className="flex-1" />
                  {currentPassageIdx < passages.length - 1 && (
                    <button onClick={() => setCurrentPassageIdx(i => i + 1)}
                      className="flex items-center gap-1 text-sm text-[#6b38d4] font-medium hover:opacity-80 transition-colors">
                      Passage tiếp theo <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* LISTENING: Audio top + questions below */}
        {isListening && (
          <div className="flex-1 overflow-y-auto">
            {passages.map((p, pi) => (
              <div key={p.id} className="mb-8">
                {/* Audio player */}
                {p.audio_url && (
                  <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3">
                    <div className="flex items-center gap-3">
                      <Volume2 size={18} className="text-[#6b38d4]" />
                      <span className="text-sm font-medium text-gray-700">
                        Section {pi + 1}{p.title ? ` — ${p.title}` : ""}
                        {p.q_start && p.q_end && ` (Q${p.q_start}–${p.q_end})`}
                      </span>
                    </div>
                    <audio controls className="w-full mt-2" src={p.audio_url}>
                      Trình duyệt không hỗ trợ audio.
                    </audio>
                  </div>
                )}
                {p.image_url && (
                  <div className="px-6 py-3">
                    <img src={p.image_url} alt="Sơ đồ" className="max-w-lg rounded-lg border" />
                  </div>
                )}
                {/* Questions for this section */}
                <div className="px-6 py-4">
                  {(questionsByPassage[p.id] ?? []).map((q) => (
                    <QuestionItem
                      key={q.id} q={q}
                      value={answers[q.id] ?? ""}
                      onChange={(v) => handleAnswer(q.id, v)}
                      flagged={flagged.has(q.id)}
                      onFlag={() => toggleFlag(q.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
            {/* Questions without passage */}
            {(questionsByPassage["__no_passage"] ?? []).length > 0 && (
              <div className="px-6 py-4">
                {(questionsByPassage["__no_passage"] ?? []).map((q) => (
                  <QuestionItem
                    key={q.id} q={q}
                    value={answers[q.id] ?? ""}
                    onChange={(v) => handleAnswer(q.id, v)}
                    flagged={flagged.has(q.id)}
                    onFlag={() => toggleFlag(q.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Fallback: no passages */}
        {passages.length === 0 && (
          <div className="flex-1 overflow-y-auto p-6">
            {questions.map((q) => (
              <QuestionItem
                key={q.id} q={q}
                value={answers[q.id] ?? ""}
                onChange={(v) => handleAnswer(q.id, v)}
                flagged={flagged.has(q.id)}
                onFlag={() => toggleFlag(q.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ===== SUBMIT CONFIRM MODAL ===== */}
      {confirmSubmit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle size={20} className="text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Xác nhận nộp bài?</h3>
                <p className="text-sm text-gray-500">Không thể sửa sau khi nộp</p>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="bg-orange-50 rounded-xl p-3 mb-4 text-sm text-orange-700">
                ⚠️ Còn <strong>{unansweredCount}</strong> câu chưa trả lời
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmSubmit(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Làm tiếp
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-[#6b38d4] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "Đang nộp..." : "Nộp bài"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
