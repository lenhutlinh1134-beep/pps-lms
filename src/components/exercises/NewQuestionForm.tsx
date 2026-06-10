"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"];

export function NewQuestionForm() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [explanation, setExplanation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setOption(i: number, val: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (correctIndex === null) { setError("Hãy chọn đáp án đúng bằng cách bấm vào hàng."); return; }
    if (options.some((o) => !o.trim())) { setError("Điền đầy đủ cả 4 đáp án."); return; }
    setError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error: err } = await supabase.from("question_bank").insert({
        teacher_id: user!.id,
        question: question.trim(),
        options: options.map((o) => o.trim()),
        correct_index: correctIndex,
        topic: topic.trim() || null,
        difficulty,
        explanation: explanation.trim() || null,
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
      {/* Câu hỏi */}
      <Card>
        <h2 className="mb-md text-headline-sm">Nội dung câu hỏi</h2>
        <textarea
          required
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ví dụ: What is the correct form of 'to be' for 'she'?"
          rows={3}
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-4 text-body-lg text-on-surface outline-none placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </Card>

      {/* 4 đáp án */}
      <Card>
        <h2 className="mb-xs text-headline-sm">4 đáp án</h2>
        <p className="mb-md text-label-md text-on-surface-variant">Bấm vào một hàng để chọn đáp án đúng.</p>
        <div className="flex flex-col gap-sm">
          {LETTERS.map((letter, i) => (
            <div
              key={i}
              onClick={() => setCorrectIndex(i)}
              className={cn(
                "flex cursor-pointer items-center gap-md rounded-lg border-2 p-md transition-colors",
                correctIndex === i
                  ? "border-primary bg-primary-fixed"
                  : "border-outline-variant hover:border-primary/50",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-body-md font-bold",
                  correctIndex === i
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface-variant",
                )}
              >
                {letter}
              </span>
              <input
                type="text"
                required
                placeholder={`Đáp án ${letter}...`}
                value={options[i]}
                onChange={(e) => setOption(i, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-transparent text-body-lg text-on-surface outline-none placeholder:text-outline"
              />
              {correctIndex === i && (
                <span className="flex shrink-0 items-center gap-1 text-label-md font-semibold text-primary">
                  <CheckCircle2 size={16} /> Đúng
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Metadata */}
      <Card>
        <h2 className="mb-md text-headline-sm">Phân loại & giải thích</h2>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <Input
            label="Chủ đề (tuỳ chọn)"
            placeholder="Grammar, Vocabulary, Pronunciation..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <Select
            label="Độ khó"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
          >
            <option value="easy">Dễ</option>
            <option value="medium">Trung bình</option>
            <option value="hard">Khó</option>
          </Select>
        </div>
        <div className="mt-md">
          <label className="mb-2 block text-label-md text-on-surface-variant">
            Giải thích đáp án (tuỳ chọn — hiện sau khi HS trả lời)
          </label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Vì sao đáp án này đúng? Ví dụ: 'She' dùng với 'is', không dùng 'are' hay 'am'."
            rows={2}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-4 text-body-lg text-on-surface outline-none placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </Card>

      {error && (
        <p className="rounded-md bg-error-container px-4 py-3 text-body-md text-on-error-container">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-md">
        <Link href="/teacher/exercises">
          <Button type="button" variant="ghost">Huỷ</Button>
        </Link>
        <Button type="submit" loading={saving}>
          Lưu câu hỏi vào ngân hàng
        </Button>
      </div>
    </form>
  );
}
