"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";

// ============================================================
// TYPES
// ============================================================
interface QuestionForm {
  question_number: number;
  question_type: string;
  question_text: string;
  options: string[];   // MCQ: ["A. ...", "B. ...", "C. ...", "D. ..."]
  correct_answer: string;
  explanation: string;
  points: number;
}

interface PassageForm {
  title: string;
  content_text: string;
  audio_url: string;
  image_url: string;
  q_start: string;
  q_end: string;
  questions: QuestionForm[];
  collapsed: boolean;
}

const Q_TYPES = [
  { value: "mcq",          label: "Trắc nghiệm (MCQ)" },
  { value: "fill_blank",   label: "Điền vào chỗ trống" },
  { value: "tfng",         label: "True / False / Not Given" },
  { value: "ynng",         label: "Yes / No / Not Given" },
  { value: "short_answer", label: "Câu trả lời ngắn" },
];

function newQuestion(num: number): QuestionForm {
  return {
    question_number: num,
    question_type:   "mcq",
    question_text:   "",
    options:         ["A. ", "B. ", "C. ", "D. "],
    correct_answer:  "",
    explanation:     "",
    points:          1,
  };
}

function newPassage(startNum: number): PassageForm {
  return {
    title: "", content_text: "", audio_url: "", image_url: "",
    q_start: String(startNum), q_end: "",
    questions: [newQuestion(startNum)],
    collapsed: false,
  };
}

// ============================================================
// QUESTION FORM
// ============================================================
function QuestionEditor({ q, onChange, onDelete }: {
  q: QuestionForm;
  onChange: (updated: QuestionForm) => void;
  onDelete: () => void;
}) {
  const isMcq   = q.question_type === "mcq";
  const isTFNG  = q.question_type === "tfng" || q.question_type === "ynng";
  const isFill  = q.question_type === "fill_blank" || q.question_type === "short_answer";

  return (
    <div className="border border-gray-200 rounded-xl p-4 mb-3 bg-white">
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="w-7 h-7 rounded-full bg-[#6b38d4]/10 text-[#6b38d4] text-xs font-bold flex items-center justify-center flex-shrink-0">
          {q.question_number}
        </span>
        <select
          value={q.question_type}
          onChange={(e) => onChange({ ...q, question_type: e.target.value, correct_answer: "", options: e.target.value === "mcq" ? ["A. ","B. ","C. ","D. "] : [] })}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#6b38d4]"
        >
          {Q_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <div className="flex-1" />
        <button onClick={onDelete} className="text-gray-300 hover:text-red-400 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Question text */}
      <textarea
        value={q.question_text}
        onChange={(e) => onChange({ ...q, question_text: e.target.value })}
        placeholder="Nội dung câu hỏi (có thể để trống nếu câu hỏi là fill-in)"
        rows={2}
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-[#6b38d4] mb-3"
      />

      {/* MCQ options */}
      {isMcq && (
        <div className="space-y-2 mb-3">
          {q.options.map((opt, oi) => (
            <input key={oi} type="text" value={opt}
              onChange={(e) => {
                const ops = [...q.options];
                ops[oi] = e.target.value;
                onChange({ ...q, options: ops });
              }}
              placeholder={`${String.fromCharCode(65 + oi)}. Lựa chọn...`}
              className="w-full text-sm border border-gray-100 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#6b38d4]"
            />
          ))}
        </div>
      )}

      {/* Correct answer */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 whitespace-nowrap">Đáp án đúng:</span>
        {isMcq ? (
          <select value={q.correct_answer}
            onChange={(e) => onChange({ ...q, correct_answer: e.target.value })}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#6b38d4]">
            <option value="">Chọn...</option>
            {q.options.map((_, oi) => (
              <option key={oi} value={String.fromCharCode(65 + oi)}>{String.fromCharCode(65 + oi)}</option>
            ))}
          </select>
        ) : isTFNG ? (
          <select value={q.correct_answer}
            onChange={(e) => onChange({ ...q, correct_answer: e.target.value })}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#6b38d4]">
            <option value="">Chọn...</option>
            {(q.question_type === "tfng" ? ["True","False","Not Given"] : ["Yes","No","Not Given"]).map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        ) : (
          <input type="text" value={q.correct_answer}
            onChange={(e) => onChange({ ...q, correct_answer: e.target.value })}
            placeholder="Nhập đáp án (dùng | để cách nhiều đáp án chấp nhận)"
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#6b38d4]"
          />
        )}
      </div>

      {/* Explanation */}
      <input type="text" value={q.explanation}
        onChange={(e) => onChange({ ...q, explanation: e.target.value })}
        placeholder="Giải thích đáp án (tùy chọn)"
        className="w-full mt-2 text-xs border border-gray-100 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#6b38d4] text-gray-500"
      />
    </div>
  );
}

// ============================================================
// MAIN
// ============================================================
export function NewExamClient() {
  const router = useRouter();

  const [title, setTitle]       = useState("");
  const [description, setDesc]  = useState("");
  const [skill, setSkill]       = useState("reading");
  const [examType, setExamType] = useState("ielts");
  const [duration, setDuration] = useState(60);
  const [passages, setPassages] = useState<PassageForm[]>([newPassage(1)]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  function updatePassage(pi: number, updated: PassageForm) {
    setPassages((prev) => prev.map((p, i) => i === pi ? updated : p));
  }

  function addPassage() {
    const lastQ = passages[passages.length - 1];
    const lastNum = lastQ.questions.length > 0
      ? lastQ.questions[lastQ.questions.length - 1].question_number + 1
      : 1;
    setPassages((prev) => [...prev, newPassage(lastNum)]);
  }

  function removePassage(pi: number) {
    if (passages.length <= 1) return;
    setPassages((prev) => prev.filter((_, i) => i !== pi));
  }

  function addQuestion(pi: number) {
    const p = passages[pi];
    const lastQ = p.questions[p.questions.length - 1];
    const nextNum = lastQ ? lastQ.question_number + 1 : 1;
    updatePassage(pi, { ...p, questions: [...p.questions, newQuestion(nextNum)] });
  }

  function updateQuestion(pi: number, qi: number, updated: QuestionForm) {
    const p = passages[pi];
    updatePassage(pi, { ...p, questions: p.questions.map((q, i) => i === qi ? updated : q) });
  }

  function removeQuestion(pi: number, qi: number) {
    const p = passages[pi];
    if (p.questions.length <= 1) return;
    updatePassage(pi, { ...p, questions: p.questions.filter((_, i) => i !== qi) });
  }

  async function handleSave(publish = false) {
    if (!title.trim()) { setError("Tên đề không được trống"); return; }
    const emptyAns = passages.some((p) =>
      p.questions.some((q) => !q.correct_answer.trim())
    );
    if (emptyAns) { setError("Tất cả câu hỏi phải có đáp án đúng"); return; }

    setSaving(true); setError(null);
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        skill, exam_type: examType,
        duration_minutes: duration,
        passages: passages.map((p) => ({
          title:        p.title || undefined,
          content_text: p.content_text || undefined,
          audio_url:    p.audio_url || undefined,
          image_url:    p.image_url || undefined,
          q_start:      p.q_start ? parseInt(p.q_start) : undefined,
          q_end:        p.q_end   ? parseInt(p.q_end)   : undefined,
          questions: p.questions.map((q) => ({
            question_number: q.question_number,
            question_type:   q.question_type,
            question_text:   q.question_text || undefined,
            options:         q.question_type === "mcq" ? q.options : undefined,
            correct_answer:  q.correct_answer,
            explanation:     q.explanation || undefined,
            points:          q.points,
          })),
        })),
      };

      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? "Lỗi tạo đề");

      if (publish) {
        await fetch(`/api/exams/${data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_published: true }),
        });
      }

      router.push("/teacher/exams");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setSaving(false);
    }
  }

  return (
          <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tạo đề thi mới</h1>
            <p className="text-xs text-gray-400 mt-0.5">Thêm passages và câu hỏi theo cấu trúc IELTS/KET/PET</p>
          </div>
        </div>

        {/* Basic info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-800 mb-4">Thông tin đề thi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Tên đề thi *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: IELTS Academic Reading Test 1"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6b38d4]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Kỹ năng</label>
              <select value={skill} onChange={(e) => setSkill(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6b38d4]">
                <option value="reading">Reading</option>
                <option value="listening">Listening</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Loại đề</label>
              <select value={examType} onChange={(e) => setExamType(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6b38d4]">
                <option value="ielts">IELTS</option>
                <option value="ket">KET</option>
                <option value="pet">PET</option>
                <option value="toeic">TOEIC</option>
                <option value="internal">Nội bộ PPS</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Thời gian (phút)</label>
              <input type="number" value={duration} min={5} max={180}
                onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6b38d4]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Mô tả (tùy chọn)</label>
              <input type="text" value={description} onChange={(e) => setDesc(e.target.value)}
                placeholder="Mô tả ngắn về đề thi"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6b38d4]"
              />
            </div>
          </div>
        </div>

        {/* Passages */}
        {passages.map((p, pi) => (
          <div key={pi} className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-semibold text-gray-800 flex-1">
                {skill === "listening" ? `Section ${pi + 1}` : `Passage ${pi + 1}`}
              </h2>
              <button onClick={() => updatePassage(pi, { ...p, collapsed: !p.collapsed })}
                className="text-gray-400 hover:text-gray-600 transition-colors">
                {p.collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
              {passages.length > 1 && (
                <button onClick={() => removePassage(pi)}
                  className="text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {!p.collapsed && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">
                      {skill === "listening" ? "Link audio (MP3/M4A)" : "Tiêu đề passage"}
                    </label>
                    <input type="text"
                      value={skill === "listening" ? p.audio_url : p.title}
                      onChange={(e) => updatePassage(pi, skill === "listening"
                        ? { ...p, audio_url: e.target.value }
                        : { ...p, title: e.target.value }
                      )}
                      placeholder={skill === "listening" ? "https://..." : "Tên passage"}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#6b38d4]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Câu từ</label>
                    <input type="number" value={p.q_start} min={1}
                      onChange={(e) => updatePassage(pi, { ...p, q_start: e.target.value })}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#6b38d4]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Câu đến</label>
                    <input type="number" value={p.q_end} min={1}
                      onChange={(e) => updatePassage(pi, { ...p, q_end: e.target.value })}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#6b38d4]"
                    />
                  </div>
                </div>

                {/* Passage content (reading) */}
                {skill === "reading" && (
                  <div className="mb-4">
                    <label className="text-xs text-gray-500 mb-1 block">Nội dung đoạn văn</label>
                    <textarea value={p.content_text}
                      onChange={(e) => updatePassage(pi, { ...p, content_text: e.target.value })}
                      placeholder="Dán nội dung đoạn văn vào đây..."
                      rows={8}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-[#6b38d4] font-mono"
                    />
                  </div>
                )}

                {/* Image URL */}
                <div className="mb-4">
                  <label className="text-xs text-gray-500 mb-1 block">Link ảnh sơ đồ / bản đồ (tùy chọn)</label>
                  <input type="text" value={p.image_url}
                    onChange={(e) => updatePassage(pi, { ...p, image_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#6b38d4]"
                  />
                </div>

                {/* Questions */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Câu hỏi ({p.questions.length} câu)
                  </p>
                  {p.questions.map((q, qi) => (
                    <QuestionEditor key={qi} q={q}
                      onChange={(updated) => updateQuestion(pi, qi, updated)}
                      onDelete={() => removeQuestion(pi, qi)}
                    />
                  ))}
                  <button onClick={() => addQuestion(pi)}
                    className="flex items-center gap-1.5 text-sm text-[#6b38d4] hover:opacity-80 transition-opacity mt-1">
                    <Plus size={14} /> Thêm câu hỏi
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Add passage */}
        <button onClick={addPassage}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 hover:border-[#6b38d4] hover:text-[#6b38d4] transition-colors mb-6">
          <Plus size={16} />
          Thêm {skill === "listening" ? "Section" : "Passage"} mới
        </button>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-4">❌ {error}</div>
        )}

        {/* Save buttons */}
        <div className="flex gap-3">
          <button onClick={() => handleSave(false)} disabled={saving}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            {saving ? "Đang lưu..." : "Lưu nháp"}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#6b38d4] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? "Đang lưu..." : "Lưu & Công bố ngay"}
          </button>
        </div>
      </div>
  );
}
