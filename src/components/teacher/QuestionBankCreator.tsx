"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle2, AlertCircle, Trash2, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { ParsedQuestion } from "@/app/api/teacher/question-bank/parse-word/route";

// ─── Word format hint ─────────────────────────────────────────────────────────
const FORMAT_EXAMPLE = `Câu 1: What is the capital of England?
A. Paris
B. London
C. Berlin
D. Rome
Đáp án: B

Câu 2: Describe your favourite season.
Điểm tối đa: 5`;

// ─── Single question editor ───────────────────────────────────────────────────
function QuestionEditor({
  question,
  index,
  onChange,
  onDelete,
}: {
  question: ParsedQuestion;
  index: number;
  onChange: (q: ParsedQuestion) => void;
  onDelete: () => void;
}) {
  return (
    <Card padding="md" className="relative flex flex-col gap-sm">
      <div className="flex items-start justify-between gap-sm">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-sm font-bold text-primary">
          {index + 1}
        </span>
        <span className={`rounded-full px-3 py-1 text-label-sm font-medium ${
          question.type === "multiple_choice"
            ? "bg-primary-fixed text-primary"
            : "bg-secondary-fixed text-secondary"
        }`}>
          {question.type === "multiple_choice" ? "Trắc nghiệm" : "Tự luận"}
        </span>
        <button
          onClick={onDelete}
          aria-label="Xoá câu hỏi"
          className="ml-auto rounded-lg p-1.5 text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <textarea
        rows={2}
        value={question.content}
        onChange={(e) => onChange({ ...question, content: e.target.value })}
        className="resize-none rounded-xl border border-outline-variant bg-surface-container px-3 py-2 text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
      />

      {question.type === "multiple_choice" && question.options && (
        <div className="grid grid-cols-1 gap-xs sm:grid-cols-2">
          {(["A", "B", "C", "D"] as const).map((key) => (
            <div key={key} className="flex items-center gap-xs">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-label-sm font-bold ${
                question.correct_answer === key
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface-variant"
              }`}>{key}</span>
              <input
                type="text"
                value={question.options![key] ?? ""}
                onChange={(e) => onChange({
                  ...question,
                  options: { ...question.options!, [key]: e.target.value },
                })}
                placeholder={`Đáp án ${key}`}
                className="flex-1 rounded-lg border border-outline-variant bg-surface-container px-3 py-1.5 text-body-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-md text-label-md">
        {question.type === "multiple_choice" && (
          <label className="flex items-center gap-xs font-medium">
            Đáp án đúng:
            <select
              value={question.correct_answer ?? ""}
              onChange={(e) => onChange({ ...question, correct_answer: e.target.value || null })}
              className="rounded-lg border border-outline-variant bg-surface-container px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">—</option>
              {["A", "B", "C", "D"].map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
        )}
        <label className="flex items-center gap-xs font-medium">
          Điểm:
          <input
            type="number"
            min={1}
            max={100}
            value={question.max_score}
            onChange={(e) => onChange({ ...question, max_score: parseInt(e.target.value) || 1 })}
            className="w-16 rounded-lg border border-outline-variant bg-surface-container px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
      </div>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function QuestionBankCreator({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showFormat, setShowFormat] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setUploading(true);

    if (demo) {
      // Demo: parse giả lập
      await new Promise((r) => setTimeout(r, 800));
      setQuestions([
        { content: "What is the capital of England?", type: "multiple_choice", options: { A: "Paris", B: "London", C: "Berlin", D: "Rome" }, correct_answer: "B", max_score: 1 },
        { content: "What is 2 + 2?", type: "multiple_choice", options: { A: "3", B: "4", C: "5", D: "6" }, correct_answer: "B", max_score: 1 },
        { content: "Describe your favourite season in 3–5 sentences.", type: "essay", options: null, correct_answer: null, max_score: 5 },
      ]);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/teacher/question-bank/parse-word", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setParseError(json.error ?? "Không thể đọc file.");
      } else {
        setQuestions(json.questions as ParsedQuestion[]);
      }
    } catch {
      setParseError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function addBlankQuestion() {
    setQuestions([...questions, {
      content: "",
      type: "multiple_choice",
      options: { A: "", B: "", C: "", D: "" },
      correct_answer: null,
      max_score: 1,
    }]);
  }

  async function handleSave() {
    setSaveError(null);
    if (!title.trim()) { setSaveError("Vui lòng nhập tên ngân hàng."); return; }
    if (questions.length === 0) { setSaveError("Ngân hàng phải có ít nhất 1 câu hỏi."); return; }

    if (demo) {
      await new Promise((r) => setTimeout(r, 600));
      router.push("/teacher/question-bank");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/teacher/question-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), subject: subject.trim(), questions }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSaveError(json.error ?? "Không thể lưu ngân hàng.");
      } else {
        router.push(`/teacher/question-bank/${json.id}`);
      }
    } catch {
      setSaveError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  const mcCount = questions.filter((q) => q.type === "multiple_choice").length;
  const essayCount = questions.filter((q) => q.type === "essay").length;

  return (
    <div className="flex flex-col gap-lg">
      {/* Thông tin ngân hàng */}
      <Card>
        <h2 className="mb-md text-headline-sm">Thông tin ngân hàng</h2>
        <div className="flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <label className="text-label-md font-semibold">Tên ngân hàng *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Trắc nghiệm Unit 1–5"
              className="h-14 rounded-xl border border-outline-variant bg-surface-container px-4 text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <div className="flex flex-col gap-xs">
              <label className="text-label-md font-semibold">Môn học</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="VD: Tiếng Anh"
                className="h-14 rounded-xl border border-outline-variant bg-surface-container px-4 text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-xs">
              <label className="text-label-md font-semibold">Mô tả</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="VD: Vocabulary & Grammar"
                className="h-14 rounded-xl border border-outline-variant bg-surface-container px-4 text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Upload Word */}
      <Card>
        <div className="flex items-center justify-between mb-md">
          <h2 className="text-headline-sm">Import từ file Word</h2>
          <button
            onClick={() => setShowFormat(!showFormat)}
            className="text-label-md text-primary hover:underline"
          >
            {showFormat ? "Ẩn mẫu" : "Xem mẫu định dạng"}
          </button>
        </div>

        {showFormat && (
          <div className="mb-md rounded-xl bg-surface-container p-4">
            <p className="mb-sm text-label-md font-semibold text-on-surface-variant">Định dạng Word mẫu:</p>
            <pre className="whitespace-pre-wrap text-label-md text-on-surface-variant font-mono">{FORMAT_EXAMPLE}</pre>
          </div>
        )}

        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-md rounded-xl border-2 border-dashed border-outline-variant bg-surface-container px-6 py-10 transition-colors hover:border-primary hover:bg-primary-fixed/30"
        >
          {uploading ? (
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          ) : (
            <Upload size={32} className="text-primary opacity-60" />
          )}
          <div className="text-center">
            <p className="text-body-md font-semibold">
              {uploading ? "Đang phân tích file..." : "Nhấn để chọn file .docx"}
            </p>
            <p className="text-label-md text-on-surface-variant">Tối đa 5MB · chỉ hỗ trợ .docx</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          className="hidden"
          onChange={handleFileUpload}
          disabled={uploading}
        />

        {parseError && (
          <div className="mt-sm flex items-start gap-sm rounded-xl bg-error-container px-4 py-3 text-on-error-container">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p className="text-body-md">{parseError}</p>
          </div>
        )}
      </Card>

      {/* Preview + edit câu hỏi */}
      {questions.length > 0 && (
        <section className="flex flex-col gap-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-headline-sm">Câu hỏi ({questions.length})</h2>
              <p className="text-label-md text-on-surface-variant">
                {mcCount} trắc nghiệm · {essayCount} tự luận
              </p>
            </div>
            <div className="flex items-center gap-sm">
              <CheckCircle2 size={18} className="text-tertiary" />
              <span className="text-label-md text-tertiary font-medium">Đã parse xong</span>
            </div>
          </div>

          <div className="flex flex-col gap-sm">
            {questions.map((q, i) => (
              <QuestionEditor
                key={i}
                question={q}
                index={i}
                onChange={(updated) => setQuestions(questions.map((x, idx) => idx === i ? updated : x))}
                onDelete={() => setQuestions(questions.filter((_, idx) => idx !== i))}
              />
            ))}
          </div>

          <button
            onClick={addBlankQuestion}
            className="flex items-center justify-center gap-sm rounded-xl border-2 border-dashed border-outline-variant py-4 text-body-md text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
          >
            <Plus size={18} /> Thêm câu hỏi thủ công
          </button>
        </section>
      )}

      {questions.length === 0 && (
        <button
          onClick={addBlankQuestion}
          className="flex items-center justify-center gap-sm rounded-xl border-2 border-dashed border-outline-variant py-6 text-body-md text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        >
          <Plus size={18} /> Thêm câu hỏi thủ công (không cần file Word)
        </button>
      )}

      {/* Save */}
      {saveError && (
        <p className="rounded-xl bg-error-container px-4 py-3 text-body-md text-on-error-container">{saveError}</p>
      )}

      <div className="flex gap-sm">
        <Button onClick={handleSave} loading={saving} disabled={questions.length === 0 || !title.trim()}>
          <FileText size={16} />
          Lưu ngân hàng ({questions.length} câu)
        </Button>
      </div>
    </div>
  );
}
