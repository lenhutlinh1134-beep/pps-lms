"use client";

import { useState } from "react";
import { CheckCircle, XCircle, ArrowRight, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Question {
  id?: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
}

interface QuizPayload {
  questions: Question[];
}

interface QuizPlayerProps {
  assignmentId: string;
  title: string;
  payload: QuizPayload;
  onDone?: (score: number) => void;
}

export function QuizPlayer({ assignmentId, title, payload, onDone }: QuizPlayerProps) {
  const questions = payload.questions ?? [];
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(questions.length).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const q = questions[current];
  const selected = answers[current];
  const isLast = current === questions.length - 1;

  function choose(idx: number) {
    if (submitted) return;
    setAnswers((prev) => { const a = [...prev]; a[current] = idx; return a; });
  }

  async function finish() {
    setSubmitted(true);
    const correct = answers.filter((a, i) => a === questions[i].correct_index).length;
    const score = Math.round((correct / questions.length) * 100);
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("submissions").upsert({
          assignment_id: assignmentId,
          student_id: user.id,
          score,
          payload: { answers, time_taken: 0 },
        }, { onConflict: "assignment_id,student_id" });
        await supabase.from("student_logs").insert({
          student_id: user.id,
          type: "assignment",
          score: score / 100,
        });
      }
    } catch { /* noop */ }
    finally { setSaving(false); }
    onDone?.(score);
  }

  if (questions.length === 0) {
    return (
      <Card className="text-center py-xl">
        <p className="text-body-lg text-on-surface-variant">Bài tập này chưa có câu hỏi.</p>
      </Card>
    );
  }

  if (submitted) {
    const correct = answers.filter((a, i) => a === questions[i].correct_index).length;
    const score = Math.round((correct / questions.length) * 100);
    return (
      <Card className="flex flex-col items-center gap-lg py-xl text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <Trophy size={40} />
        </span>
        <div>
          <h2 className="text-display-sm text-primary">{score}%</h2>
          <p className="mt-xs text-body-lg">{correct}/{questions.length} câu đúng</p>
          <p className="mt-sm text-body-md text-on-surface-variant">{title}</p>
        </div>
        {/* Tóm tắt từng câu */}
        <div className="w-full flex flex-col gap-sm text-left">
          {questions.map((q, i) => {
            const isCorrect = answers[i] === q.correct_index;
            return (
              <Card key={i} padding="md" className={cn("flex flex-col gap-1", isCorrect ? "border-l-4 border-tertiary" : "border-l-4 border-error")}>
                <div className="flex items-center gap-2">
                  {isCorrect ? <CheckCircle size={16} className="text-tertiary shrink-0" /> : <XCircle size={16} className="text-error shrink-0" />}
                  <p className="text-body-md font-semibold">{q.question}</p>
                </div>
                <p className="text-body-md text-on-surface-variant ml-6">
                  Đáp án đúng: <span className="font-semibold text-tertiary">{q.options[q.correct_index]}</span>
                  {answers[i] !== null && answers[i] !== q.correct_index && (
                    <span className="ml-2 text-error">· Bạn chọn: {q.options[answers[i]!]}</span>
                  )}
                </p>
                {q.explanation && <p className="ml-6 text-label-md text-on-surface-variant italic">{q.explanation}</p>}
              </Card>
            );
          })}
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-headline-sm">{title}</h2>
        <span className="text-label-md text-on-surface-variant">{current + 1} / {questions.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-surface-container-low overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Câu hỏi */}
      <Card className="flex flex-col gap-md">
        <p className="text-body-lg font-semibold">{q.question}</p>
        <div className="flex flex-col gap-sm">
          {q.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => choose(idx)}
              className={cn(
                "flex items-center gap-md rounded-lg border px-4 py-3 text-left text-body-md transition-colors",
                selected === idx
                  ? "border-primary bg-primary-fixed font-semibold text-on-primary-fixed"
                  : "border-outline-variant bg-surface hover:border-primary hover:bg-primary-fixed/40",
              )}
            >
              <span className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-label-sm font-bold",
                selected === idx ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant",
              )}>
                {String.fromCharCode(65 + idx)}
              </span>
              {opt}
            </button>
          ))}
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
          Câu trước
        </Button>
        {isLast ? (
          <Button onClick={finish} loading={saving} disabled={answers.some((a) => a === null)}>
            <Trophy size={18} /> Nộp bài
          </Button>
        ) : (
          <Button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))} disabled={selected === null}>
            Câu tiếp <ArrowRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
