"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Flag, ChevronLeft, Send, AlertTriangle, Volume2, VolumeX } from "lucide-react";

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
  exam: { id: string; title: string; skill: string; exam_type: string; duration_minutes: number; total_questions: number };
  passages: Passage[];
  questions: Question[];
  activeAttemptId: string | null;
  activeAttemptStartedAt: string | null;
}

// ============================================================
// TIMER
// ============================================================
function useCountdownTimer(totalSeconds: number, onExpire: () => void) {
  const [left, setLeft] = useState(totalSeconds);
  const expired = useRef(false);

  useEffect(() => {
    if (totalSeconds <= 0) return;
    const id = setInterval(() => {
      setLeft((prev) => {
        const next = prev - 1;
        if (next <= 0 && !expired.current) { expired.current = true; clearInterval(id); onExpire(); }
        return Math.max(0, next);
      });
    }, 1000);
    return () => clearInterval(id);
  }, [totalSeconds, onExpire]);

  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return {
    display: h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`,
    urgent: left < 300,
    left,
  };
}

// ============================================================
// PASSAGE TEXT — render đẹp với đánh số đoạn
// ============================================================
function PassageText({ text }: { text: string }) {
  const paragraphs = text.split(/\n+/).filter((p) => p.trim());
  return (
    <div className="font-serif text-[15px] leading-[1.85] text-gray-800 space-y-4">
      {paragraphs.map((para, i) => (
        <p key={i} className="relative pl-8">
          <span className="absolute left-0 top-0 text-[10px] font-sans text-gray-300 font-medium w-6 text-right select-none">
            {i + 1}
          </span>
          {para.trim()}
        </p>
      ))}
    </div>
  );
}

// ============================================================
// CUSTOM AUDIO PLAYER
// ============================================================
function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); } else { a.play(); }
    setPlaying(!playing);
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    a.currentTime = pct * duration;
  }

  const fmt = (s: number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;

  return (
    <div className="bg-[#6b38d4]/5 border border-[#6b38d4]/20 rounded-2xl p-4">
      <audio ref={audioRef} src={src} muted={muted}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)} />

      <div className="flex items-center gap-3">
        {/* Play/Pause */}
        <button onClick={toggle}
          className="w-10 h-10 rounded-full bg-[#6b38d4] text-white flex items-center justify-center hover:opacity-90 transition-opacity flex-shrink-0">
          {playing
            ? <span className="flex gap-0.5"><span className="w-1 h-4 bg-white rounded-full"/><span className="w-1 h-4 bg-white rounded-full"/></span>
            : <span className="ml-0.5 border-t-[7px] border-b-[7px] border-l-[12px] border-transparent border-l-white" />}
        </button>

        {/* Progress bar */}
        <div className="flex-1">
          <div className="text-xs text-[#6b38d4] font-medium mb-1.5 flex justify-between">
            <span>{fmt(progress)}</span>
            <span>{fmt(duration)}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full cursor-pointer" onClick={seek}>
            <div className="h-2 bg-[#6b38d4] rounded-full transition-all"
              style={{ width: duration ? `${(progress / duration) * 100}%` : "0%" }} />
          </div>
        </div>

        {/* Mute */}
        <button onClick={() => setMuted(!muted)}
          className="text-gray-400 hover:text-[#6b38d4] transition-colors">
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// QUESTION ITEM — youpass style
// ============================================================
function QuestionItem({ q, value, onChange, flagged, onFlag }: {
  q: Question; value: string; onChange: (v: string) => void; flagged: boolean; onFlag: () => void;
}) {
  const tfngOpts = ["True", "False", "Not Given"];
  const ynngOpts = ["Yes", "No", "Not Given"];

  return (
    <div id={`q-${q.question_number}`} className="mb-6 scroll-mt-2">
      {/* Number + question text */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center transition-colors
          ${value ? "bg-[#6b38d4] text-white" : "bg-gray-100 text-gray-500"}`}>
          {q.question_number}
        </div>
        <div className="flex-1 pt-1">
          {q.question_text && (
            <p className="text-sm text-gray-800 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: q.question_text.replace(/\n/g, "<br>") }} />
          )}
        </div>
        <button onClick={onFlag}
          className={`flex-shrink-0 p-1.5 rounded-lg transition-colors mt-0.5
            ${flagged ? "bg-yellow-100 text-yellow-600" : "text-gray-200 hover:text-yellow-400 hover:bg-yellow-50"}`}>
          <Flag size={13} />
        </button>
      </div>

      {/* Answer input */}
      <div className="ml-11">
        {/* MCQ */}
        {q.question_type === "mcq" && q.options && (
          <div className="space-y-2">
            {q.options.map((opt) => {
              const letter = opt.charAt(0);
              const selected = value === letter;
              return (
                <label key={opt} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-all select-none
                  ${selected ? "border-[#6b38d4] bg-[#6b38d4]/8 shadow-sm" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"}`}>
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all
                    ${selected ? "border-[#6b38d4] bg-[#6b38d4] text-white" : "border-gray-300 text-gray-400"}`}>
                    {letter}
                  </span>
                  <span className={`text-sm leading-relaxed ${selected ? "text-[#6b38d4] font-medium" : "text-gray-700"}`}>
                    {opt.slice(3)}
                  </span>
                  <input type="radio" className="hidden" checked={selected} onChange={() => onChange(letter)} />
                </label>
              );
            })}
          </div>
        )}

        {/* TFNG / YNNG */}
        {(q.question_type === "tfng" || q.question_type === "ynng") && (
          <div className="flex gap-2 flex-wrap">
            {(q.question_type === "tfng" ? tfngOpts : ynngOpts).map((opt) => {
              const sel = value === opt;
              return (
                <button key={opt} onClick={() => onChange(sel ? "" : opt)}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold border-2 transition-all
                    ${sel ? "border-[#6b38d4] bg-[#6b38d4] text-white shadow-sm" : "border-gray-200 text-gray-600 hover:border-[#6b38d4]/50 hover:text-[#6b38d4]"}`}>
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {/* Fill blank / Short answer */}
        {(q.question_type === "fill_blank" || q.question_type === "short_answer") && (
          <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
            placeholder="Điền câu trả lời..."
            className="w-full max-w-sm border-b-2 border-gray-200 px-2 py-1.5 text-sm bg-transparent focus:outline-none focus:border-[#6b38d4] transition-colors placeholder-gray-300"
          />
        )}
      </div>
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

  const [data, setData]         = useState<ExamData | null>(null);
  const [answers, setAnswers]   = useState<Record<string, string>>({});
  const [flagged, setFlagged]   = useState<Set<string>>(new Set());
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmit] = useState(false);
  const [confirmOpen, setConfirm] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [passageIdx, setPassageIdx] = useState(0);
  const [activeQ, setActiveQ]   = useState(1);
  const saveQueue = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
        const sat = examData.activeAttemptStartedAt ? new Date(examData.activeAttemptStartedAt) : new Date();
        setStartedAt(sat);
        if (ansRes?.ok) {
          const ansData = await ansRes.json() as { answers?: Record<string, { answer: string }> };
          const map: Record<string, string> = {};
          for (const [qId, v] of Object.entries(ansData.answers ?? {})) map[qId] = v.answer;
          setAnswers(map);
        }
      } finally { setLoading(false); }
    }
    load();
  }, [examId, attemptId, router]);

  const saveAnswer = useCallback((qId: string, val: string) => {
    if (!attemptId) return;
    clearTimeout(saveQueue.current[qId]);
    saveQueue.current[qId] = setTimeout(() => {
      fetch(`/api/exams/${examId}/attempt/${attemptId}/answer`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: qId, student_answer: val }),
      });
    }, 500);
  }, [examId, attemptId]);

  function handleAnswer(qId: string, val: string) {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
    saveAnswer(qId, val);
  }

  async function handleSubmit(auto = false) {
    if (!auto && !confirmOpen) { setConfirm(true); return; }
    setSubmit(true);
    const timeSpent = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0;
    try {
      const res = await fetch(`/api/exams/${examId}/attempt/${attemptId}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, timeSpent }),
      });
      if (res.ok) { router.replace(`/student/exams/${examId}/results/${attemptId}`); }
      else { const d = await res.json() as { error?: string }; alert(d.error ?? "Lỗi nộp bài"); setSubmit(false); }
    } catch { alert("Lỗi kết nối"); setSubmit(false); }
    setConfirm(false);
  }

  // Timer
  const totalSeconds = (data?.exam.duration_minutes ?? 60) * 60;
  const elapsed = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0;
  const { display: timerDisplay, urgent } = useCountdownTimer(
    Math.max(0, totalSeconds - elapsed),
    () => handleSubmit(true)
  );

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#6b38d4] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Đang tải đề thi...</p>
        </div>
      </div>
    );
  }

  const { exam, passages, questions } = data;
  const isListening = exam.skill === "listening";

  const byPassage: Record<string, Question[]> = {};
  for (const q of questions) {
    const pid = q.passage_id ?? "__none";
    (byPassage[pid] ??= []).push(q);
  }

  const answered = questions.filter((q) => answers[q.id]?.trim()).length;
  const unanswered = questions.length - answered;
  const curPassage = passages[passageIdx];
  const curQs = curPassage ? (byPassage[curPassage.id] ?? []) : questions;

  function scrollTo(num: number) {
    setActiveQ(num);
    document.getElementById(`q-${num}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    for (let pi = 0; pi < passages.length; pi++) {
      const p = passages[pi];
      if (p.q_start && p.q_end && num >= p.q_start && num <= p.q_end) { setPassageIdx(pi); break; }
    }
  }

  return (
    <div className="h-screen flex flex-col bg-[#f8f9ff] overflow-hidden">

      {/* ── HEADER ── */}
      <header className="flex-shrink-0 bg-white border-b border-gray-100 z-30 shadow-sm">
        <div className="flex items-center gap-4 px-5 py-3">
          <button onClick={() => { if (confirm("Thoát? Câu trả lời đã lưu.")) router.back(); }}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronLeft size={16} /> Thoát
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 text-sm truncate">{exam.title}</h1>
            <p className="text-[11px] text-gray-400">{exam.exam_type.toUpperCase()} · {exam.skill === "reading" ? "Reading" : "Listening"}</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono font-bold text-sm
            ${urgent ? "bg-red-500 text-white animate-pulse" : "bg-gray-100 text-gray-700"}`}>
            ⏱ {timerDisplay}
          </div>
          <button onClick={() => handleSubmit(false)} disabled={submitting}
            className="flex items-center gap-1.5 bg-[#6b38d4] text-white px-5 py-2 rounded-xl text-sm font-semibold
              hover:bg-[#5b28c4] active:scale-95 transition-all disabled:opacity-50 shadow-sm shadow-[#6b38d4]/20">
            <Send size={14} /> {submitting ? "Đang nộp..." : "Nộp bài"}
          </button>
        </div>

        {/* Q navigation strip */}
        <div className="px-5 pb-2.5 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 min-w-max">
            {/* Passage tabs */}
            {passages.length > 1 && !isListening && (
              <>
                {passages.map((p, pi) => (
                  <button key={p.id} onClick={() => setPassageIdx(pi)}
                    className={`text-[11px] px-3 py-1 rounded-lg mr-3 font-semibold transition-colors whitespace-nowrap
                      ${passageIdx === pi ? "bg-[#6b38d4] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    Passage {pi + 1}
                    {p.q_start && p.q_end && <span className="ml-1 opacity-60">({p.q_start}–{p.q_end})</span>}
                  </button>
                ))}
                <span className="w-px h-4 bg-gray-200 mx-1" />
              </>
            )}
            {questions.map((q) => {
              const ans = !!answers[q.id]?.trim();
              const flg = flagged.has(q.id);
              const act = activeQ === q.question_number;
              return (
                <button key={q.id} onClick={() => scrollTo(q.question_number)}
                  className={`w-7 h-7 text-[11px] font-bold rounded-lg flex-shrink-0 transition-all
                    ${act ? "ring-2 ring-[#6b38d4] ring-offset-1 scale-110" : ""}
                    ${flg ? "bg-yellow-400 text-white" : ans ? "bg-[#6b38d4] text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>
                  {q.question_number}
                </button>
              );
            })}
            <span className="ml-3 text-[11px] text-gray-400 whitespace-nowrap">{answered}/{questions.length}</span>
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex-1 overflow-hidden flex">

        {/* READING — split screen */}
        {!isListening && passages.length > 0 && (
          <>
            {/* Left: Passage */}
            <div className="w-[48%] overflow-y-auto bg-white border-r border-gray-100">
              <div className="p-8 max-w-none">
                {curPassage?.title && (
                  <h2 className="text-base font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">{curPassage.title}</h2>
                )}
                {curPassage?.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={curPassage.image_url} alt="Diagram" className="max-w-full rounded-xl mb-6 border border-gray-100" />
                )}
                {curPassage?.content_text
                  ? <PassageText text={curPassage.content_text} />
                  : <p className="text-gray-300 text-sm">Không có nội dung passage</p>}
              </div>
            </div>

            {/* Right: Questions */}
            <div className="w-[52%] overflow-y-auto bg-[#f8f9ff]">
              <div className="p-6 max-w-xl mx-auto">
                {curPassage && (
                  <div className="flex items-center gap-2 mb-5">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-2">
                      Questions {curPassage.q_start ?? ""}–{curPassage.q_end ?? ""}
                    </span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                )}
                {curQs.map((q) => (
                  <QuestionItem key={q.id} q={q}
                    value={answers[q.id] ?? ""}
                    onChange={(v) => handleAnswer(q.id, v)}
                    flagged={flagged.has(q.id)}
                    onFlag={() => setFlagged((s) => { const n = new Set(s); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; })}
                  />
                ))}

                {/* Passage nav */}
                {passages.length > 1 && (
                  <div className="flex gap-2 mt-6 pt-6 border-t border-gray-200">
                    {passageIdx > 0 && (
                      <button onClick={() => setPassageIdx(i => i - 1)}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#6b38d4] transition-colors">
                        ← Passage trước
                      </button>
                    )}
                    <div className="flex-1" />
                    {passageIdx < passages.length - 1 && (
                      <button onClick={() => setPassageIdx(i => i + 1)}
                        className="flex items-center gap-1 text-sm font-medium text-[#6b38d4] hover:opacity-80 transition-opacity">
                        Passage tiếp →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* LISTENING — audio top + questions */}
        {isListening && (
          <div className="flex-1 overflow-y-auto">
            {passages.map((p, pi) => (
              <div key={p.id} className="mb-8">
                {p.audio_url && (
                  <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
                    <p className="text-xs font-semibold text-[#6b38d4] uppercase tracking-wider mb-3">
                      Section {pi + 1}{p.title ? ` — ${p.title}` : ""}{p.q_start && p.q_end ? ` · Q${p.q_start}–${p.q_end}` : ""}
                    </p>
                    <AudioPlayer src={p.audio_url} />
                  </div>
                )}
                {p.image_url && (
                  <div className="px-6 py-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image_url} alt="Diagram" className="max-w-lg rounded-xl border border-gray-100" />
                  </div>
                )}
                <div className="px-6 py-4 max-w-2xl">
                  {(byPassage[p.id] ?? []).map((q) => (
                    <QuestionItem key={q.id} q={q}
                      value={answers[q.id] ?? ""}
                      onChange={(v) => handleAnswer(q.id, v)}
                      flagged={flagged.has(q.id)}
                      onFlag={() => setFlagged((s) => { const n = new Set(s); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; })}
                    />
                  ))}
                </div>
              </div>
            ))}
            {/* Questions without passage */}
            {(byPassage["__none"] ?? []).length > 0 && (
              <div className="px-6 py-4 max-w-2xl">
                {(byPassage["__none"] ?? []).map((q) => (
                  <QuestionItem key={q.id} q={q}
                    value={answers[q.id] ?? ""}
                    onChange={(v) => handleAnswer(q.id, v)}
                    flagged={flagged.has(q.id)}
                    onFlag={() => setFlagged((s) => { const n = new Set(s); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; })}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* No passages fallback */}
        {passages.length === 0 && (
          <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto">
            {questions.map((q) => (
              <QuestionItem key={q.id} q={q}
                value={answers[q.id] ?? ""}
                onChange={(v) => handleAnswer(q.id, v)}
                flagged={flagged.has(q.id)}
                onFlag={() => setFlagged((s) => { const n = new Set(s); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; })}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── CONFIRM SUBMIT MODAL ── */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-yellow-100 flex items-center justify-center">
                <AlertTriangle size={22} className="text-yellow-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Xác nhận nộp bài?</h3>
                <p className="text-sm text-gray-400">Không thể sửa sau khi nộp</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-[#6b38d4]/5 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-[#6b38d4]">{answered}</p>
                <p className="text-xs text-gray-400 mt-0.5">Đã trả lời</p>
              </div>
              <div className={`rounded-2xl p-3 text-center ${unanswered > 0 ? "bg-orange-50" : "bg-green-50"}`}>
                <p className={`text-2xl font-bold ${unanswered > 0 ? "text-orange-500" : "text-green-500"}`}>{unanswered}</p>
                <p className="text-xs text-gray-400 mt-0.5">Chưa trả lời</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setConfirm(false)}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-100 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Làm tiếp
              </button>
              <button onClick={() => handleSubmit(true)} disabled={submitting}
                className="flex-1 py-3 rounded-2xl bg-[#6b38d4] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                {submitting ? "Đang nộp..." : "Nộp bài"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
