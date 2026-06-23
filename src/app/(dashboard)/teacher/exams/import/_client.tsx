"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle, AlertCircle, ArrowLeft, Sparkles, Eye, EyeOff, Send } from "lucide-react";

// ============================================================
// TYPES (mirror của API response)
// ============================================================
interface ParsedQuestion {
  question_number: number;
  question_type: string;
  question_text?: string;
  options?: string[];
  correct_answer: string;
  explanation?: string;
}

interface ParsedPassage {
  title?: string;
  content_text?: string;
  audio_url?: string;
  q_start?: number;
  q_end?: number;
  questions: ParsedQuestion[];
}

interface ParsedExam {
  title: string;
  skill: string;
  exam_type: string;
  duration_minutes: number;
  passages: ParsedPassage[];
}

const Q_TYPE_LABELS: Record<string, string> = {
  mcq: "MCQ", fill_blank: "Điền vào chỗ trống",
  tfng: "True/False/NG", ynng: "Yes/No/NG", short_answer: "Trả lời ngắn",
};

// ============================================================
// STEP 1: Upload PDF
// ============================================================
function UploadStep({ onParsed }: { onParsed: (data: ParsedExam, filename: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile]         = useState<File | null>(null);
  const [parsing, setParsing]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    if (!f.name.endsWith(".pdf")) { setError("Chỉ chấp nhận file PDF"); return; }
    if (f.size > 10 * 1024 * 1024) { setError("File tối đa 10MB"); return; }
    setFile(f); setError(null);
  }

  async function handleParse() {
    if (!file) return;
    setParsing(true); setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/exams/parse-pdf", { method: "POST", body: form });
      const data = await res.json() as { parsed?: ParsedExam; filename?: string; error?: string };
      if (!res.ok || !data.parsed) throw new Error(data.error ?? "Parse thất bại");
      onParsed(data.parsed, data.filename ?? file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
          ${dragging ? "border-[#6b38d4] bg-[#6b38d4]/5" : file ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-[#6b38d4]/50 hover:bg-gray-50"}`}
      >
        <input ref={inputRef} type="file" accept=".pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

        {file ? (
          <>
            <FileText size={40} className="mx-auto text-green-500 mb-3" />
            <p className="font-semibold text-gray-800">{file.name}</p>
            <p className="text-sm text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB · Nhấn để đổi file</p>
          </>
        ) : (
          <>
            <Upload size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="font-semibold text-gray-700">Kéo thả file PDF vào đây</p>
            <p className="text-sm text-gray-400 mt-1">hoặc nhấn để chọn file (tối đa 10MB)</p>
            <p className="text-xs text-gray-300 mt-3">Hỗ trợ: Cambridge IELTS, KET, PET, TOEIC (PDF có text, không phải scan ảnh)</p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 bg-red-50 rounded-xl p-3 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {file && (
        <button onClick={handleParse} disabled={parsing}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-[#6b38d4] text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
          {parsing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              AI đang đọc và phân tích đề thi... (30-60 giây)
            </>
          ) : (
            <><Sparkles size={16} /> Phân tích đề thi bằng AI</>
          )}
        </button>
      )}

      {parsing && (
        <div className="mt-4 bg-purple-50 rounded-xl p-4 text-sm text-purple-700">
          <p className="font-semibold mb-1">🤖 AI đang làm việc...</p>
          <p>Đang đọc nội dung PDF → nhận dạng câu hỏi → phân loại dạng bài → điền đáp án</p>
          <p className="text-xs text-purple-400 mt-1">Thường mất 30-60 giây tùy số lượng câu hỏi</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// STEP 2: Review & Edit parsed result
// ============================================================
function ReviewStep({
  exam, filename, onConfirm, onBack,
}: {
  exam: ParsedExam; filename: string;
  onConfirm: (exam: ParsedExam, publish: boolean) => void;
  onBack: () => void;
}) {
  const [data, setData] = useState<ParsedExam>(exam);
  const [showPassage, setShowPassage] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);

  function updateField(field: keyof ParsedExam, value: string | number) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  function updateQuestion(pi: number, qi: number, updated: Partial<ParsedQuestion>) {
    setData((prev) => ({
      ...prev,
      passages: prev.passages.map((p, i) =>
        i === pi ? { ...p, questions: p.questions.map((q, j) => j === qi ? { ...q, ...updated } : q) } : p
      ),
    }));
  }

  const totalQ = data.passages.reduce((s, p) => s + p.questions.length, 0);
  const missingAns = data.passages.reduce((s, p) =>
    s + p.questions.filter((q) => !q.correct_answer.trim()).length, 0
  );

  return (
    <div>
      {/* Exam info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-4">Thông tin đề thi</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Tên đề thi</label>
            <input type="text" value={data.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#6b38d4]"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Kỹ năng</label>
            <select value={data.skill} onChange={(e) => updateField("skill", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#6b38d4]">
              <option value="reading">Reading</option>
              <option value="listening">Listening</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Loại đề</label>
            <select value={data.exam_type} onChange={(e) => updateField("exam_type", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#6b38d4]">
              <option value="ielts">IELTS</option>
              <option value="ket">KET</option>
              <option value="pet">PET</option>
              <option value="toeic">TOEIC</option>
              <option value="internal">Nội bộ PPS</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Thời gian (phút)</label>
            <input type="number" value={data.duration_minutes} min={5} max={180}
              onChange={(e) => updateField("duration_minutes", parseInt(e.target.value) || 60)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#6b38d4]"
            />
          </div>
          <div className="flex items-end">
            <div className={`rounded-xl px-3 py-2 text-sm font-medium w-full text-center
              ${missingAns === 0 ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
              {totalQ} câu · {missingAns > 0 ? `⚠️ ${missingAns} câu chưa có đáp án` : "✅ Đủ đáp án"}
            </div>
          </div>
        </div>
      </div>

      {/* Passages + Questions */}
      {data.passages.map((p, pi) => (
        <div key={pi} className="bg-white rounded-2xl border border-gray-100 mb-4 overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 flex-1">
              {data.skill === "listening" ? `Section ${pi + 1}` : `Passage ${pi + 1}`}
              {p.title && <span className="text-gray-400 font-normal ml-2">— {p.title}</span>}
              <span className="ml-2 text-xs text-gray-400">Q{p.q_start}–Q{p.q_end} · {p.questions.length} câu</span>
            </h3>
            {p.content_text && (
              <button onClick={() => setShowPassage((s) => ({ ...s, [pi]: !s[pi] }))}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#6b38d4] transition-colors">
                {showPassage[pi] ? <EyeOff size={13} /> : <Eye size={13} />}
                {showPassage[pi] ? "Ẩn passage" : "Xem passage"}
              </button>
            )}
          </div>

          {showPassage[pi] && p.content_text && (
            <div className="p-4 bg-gray-50 border-b border-gray-100 max-h-48 overflow-y-auto">
              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-serif leading-relaxed">
                {p.content_text}
              </pre>
            </div>
          )}

          <div className="p-4">
            {p.questions.map((q, qi) => (
              <div key={qi} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className="w-6 h-6 rounded-full bg-[#6b38d4]/10 text-[#6b38d4] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {q.question_number}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {Q_TYPE_LABELS[q.question_type] ?? q.question_type}
                    </span>
                    {!q.correct_answer.trim() && (
                      <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full">
                        ⚠️ Chưa có đáp án
                      </span>
                    )}
                  </div>
                  {q.question_text && (
                    <p className="text-xs text-gray-600 mb-1 line-clamp-2">{q.question_text}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Đáp án:</span>
                    <input type="text" value={q.correct_answer}
                      onChange={(e) => updateQuestion(pi, qi, { correct_answer: e.target.value })}
                      placeholder="Nhập đáp án..."
                      className={`flex-1 text-xs border rounded-lg px-2 py-1 focus:outline-none
                        ${q.correct_answer.trim() ? "border-green-200 focus:border-green-400" : "border-yellow-300 focus:border-yellow-400"}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onBack}
          className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          ← Upload lại
        </button>
        <button onClick={() => { setSaving(true); onConfirm(data, false); }}
          disabled={saving}
          className="flex-1 py-3 rounded-xl border border-[#6b38d4] text-[#6b38d4] text-sm font-semibold hover:bg-[#6b38d4]/5 transition-colors disabled:opacity-50">
          Lưu nháp
        </button>
        <button onClick={() => { setSaving(true); onConfirm(data, true); }}
          disabled={saving || missingAns > 0}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#6b38d4] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          title={missingAns > 0 ? `Còn ${missingAns} câu chưa có đáp án` : ""}>
          <Send size={14} />
          {saving ? "Đang lưu..." : "Lưu & Công bố"}
        </button>
      </div>
      {missingAns > 0 && (
        <p className="text-xs text-yellow-600 text-center mt-2">
          ⚠️ Còn {missingAns} câu chưa có đáp án — hãy điền trước khi công bố
        </p>
      )}
    </div>
  );
}

// ============================================================
// MAIN
// ============================================================
export function ImportExamClient() {
  const router = useRouter();
  const [step, setStep]     = useState<"upload" | "review" | "done">("upload");
  const [parsed, setParsed] = useState<ParsedExam | null>(null);
  const [filename, setFilename] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleParsed = useCallback((data: ParsedExam, fname: string) => {
    setParsed(data); setFilename(fname); setStep("review");
  }, []);

  async function handleConfirm(exam: ParsedExam, publish: boolean) {
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:            exam.title,
          skill:            exam.skill,
          exam_type:        exam.exam_type,
          duration_minutes: exam.duration_minutes,
          passages:         exam.passages,
        }),
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
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/teacher/exams")} className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Import đề thi từ PDF</h1>
          <p className="text-xs text-gray-400 mt-0.5">Upload file PDF → AI tự động phân tích → bạn kiểm tra rồi publish</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[
          { key: "upload", label: "Upload PDF" },
          { key: "review", label: "Kiểm tra kết quả" },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && <div className={`h-px flex-1 min-w-8 ${step !== "upload" ? "bg-[#6b38d4]" : "bg-gray-200"}`} />}
            <div className={`flex items-center gap-2 text-sm font-medium
              ${step === s.key ? "text-[#6b38d4]" : step === "review" && s.key === "upload" ? "text-green-600" : "text-gray-400"}`}>
              <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold
                ${step === s.key ? "bg-[#6b38d4] text-white" : step === "review" && s.key === "upload" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                {step === "review" && s.key === "upload" ? <CheckCircle size={12} /> : i + 1}
              </span>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 text-sm rounded-xl p-3">❌ {error}</div>
      )}

      {step === "upload" && <UploadStep onParsed={handleParsed} />}
      {step === "review" && parsed && (
        <ReviewStep
          exam={parsed} filename={filename}
          onConfirm={handleConfirm}
          onBack={() => setStep("upload")}
        />
      )}
    </div>
  );
}
