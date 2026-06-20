"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckSquare, Square, BookOpen, AlertCircle, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface QuestionItem {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  topic: string | null;
  difficulty: "easy" | "medium" | "hard";
}

export interface ClassItem {
  id: string;
  name: string;
}

const DIFF_LABEL: Record<string, string> = {
  easy: "Dễ",
  medium: "Trung bình",
  hard: "Khó",
};
const DIFF_STYLE: Record<string, string> = {
  easy: "bg-tertiary-fixed text-on-tertiary-fixed",
  medium: "bg-secondary-fixed text-on-secondary-fixed",
  hard: "bg-error-container text-on-error-container",
};

export function NewAssignmentForm({ classes, questions }: { classes: ClassItem[]; questions: QuestionItem[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === questions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(questions.map((q) => q.id)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!classId) { setError("Chọn lớp để giao bài."); return; }
    if (selected.size === 0) { setError("Chọn ít nhất 1 câu hỏi."); return; }

    const payload = {
      questions: questions
        .filter((q) => selected.has(q.id))
        .map((q) => ({
          id: q.id,
          question: q.question,
          options: q.options,
          correct_index: q.correct_index,
          explanation: q.explanation,
        })),
    };

    setError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.from("assignments").insert({
        title: title.trim(),
        class_id: classId,
        type: "quiz",
        payload,
        description: description.trim() || null,
        due_date: dueDate || null,
      });
      if (err) { setError(err.message); return; }
      router.push("/teacher/exercises");
      router.refresh();
    } catch {
      setError("Có lỗi xảy ra. Thử lại.");
    } finally {
      setSaving(false);
    }
  }

  const allSelected = selected.size === questions.length && questions.length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
      {/* Thông tin bài tập */}
      <Card>
        <h2 className="mb-md text-headline-sm">Thông tin bài tập</h2>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <Input
            label="Tên bài tập"
            required
            placeholder="Ví dụ: Kiểm tra Grammar Unit 1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Select
            label="Giao cho lớp"
            required
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            {classes.length === 0 ? (
              <option value="">— Bạn chưa có lớp nào —</option>
            ) : (
              classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))
            )}
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-label-md font-medium text-on-surface-variant">
              Mô tả <span className="text-label-sm font-normal">(tuỳ chọn)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Hướng dẫn hoặc lưu ý cho bài tập..."
              rows={3}
              className="w-full resize-none rounded-xl border border-outline-variant bg-surface px-4 py-3 text-body-md placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-label-md font-medium text-on-surface-variant">
              <span className="flex items-center gap-1">
                <Calendar size={14} /> Hạn nộp bài <span className="text-label-sm font-normal">(tuỳ chọn)</span>
              </span>
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-14 w-full rounded-xl border border-outline-variant bg-surface px-4 text-body-md focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Chọn câu hỏi */}
      <Card>
        <div className="mb-md flex items-center justify-between">
          <div>
            <h2 className="text-headline-sm">Chọn câu hỏi</h2>
            <p className="mt-xs text-label-md text-on-surface-variant">
              Đã chọn {selected.size}/{questions.length} câu
            </p>
          </div>
          {questions.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="text-label-md font-semibold text-primary hover:underline"
            >
              {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </button>
          )}
        </div>

        {questions.length === 0 ? (
          <div className="flex items-center gap-md rounded-lg bg-surface-container px-4 py-6 text-on-surface-variant">
            <AlertCircle size={20} className="shrink-0" />
            <div>
              <p className="text-body-md font-semibold">Ngân hàng câu hỏi trống</p>
              <p className="text-label-md">
                Hãy{" "}
                <Link href="/teacher/exercises/new-question" className="font-semibold text-primary hover:underline">
                  thêm câu hỏi
                </Link>{" "}
                trước khi tạo bài tập.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-sm">
            {questions.map((q) => {
              const isSelected = selected.has(q.id);
              return (
                <div
                  key={q.id}
                  onClick={() => toggle(q.id)}
                  className={cn(
                    "flex cursor-pointer items-start gap-md rounded-lg border-2 p-md transition-colors",
                    isSelected
                      ? "border-primary bg-primary-fixed"
                      : "border-outline-variant hover:border-primary/50",
                  )}
                >
                  <span className={cn("mt-0.5 shrink-0", isSelected ? "text-primary" : "text-outline")}>
                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-body-md font-medium text-on-surface">{q.question}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {q.topic && (
                        <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-on-primary-fixed">
                          {q.topic}
                        </span>
                      )}
                      <span className={cn("rounded-full px-2 py-0.5 text-label-sm", DIFF_STYLE[q.difficulty])}>
                        {DIFF_LABEL[q.difficulty]}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-label-sm text-on-surface-variant">
                    {q.options.length} đáp án
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Tóm tắt */}
      {selected.size > 0 && (
        <Card padding="md" className="flex items-center gap-md bg-primary-fixed">
          <BookOpen size={20} className="shrink-0 text-primary" />
          <p className="flex-1 text-body-md text-on-surface">
            Bài tập sẽ gồm <b>{selected.size} câu hỏi</b> giao cho lớp{" "}
            <b>{classes.find((c) => c.id === classId)?.name ?? ""}</b>.
          </p>
        </Card>
      )}

      {error && (
        <p className="rounded-md bg-error-container px-4 py-3 text-body-md text-on-error-container">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-md">
        <Link href="/teacher/exercises">
          <Button type="button" variant="ghost">Huỷ</Button>
        </Link>
        <Button type="submit" loading={saving} disabled={selected.size === 0 || classes.length === 0}>
          Giao bài tập
        </Button>
      </div>
    </form>
  );
}
