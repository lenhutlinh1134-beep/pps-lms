import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { NewAssignmentForm, type QuestionItem, type ClassItem } from "@/components/exercises/NewAssignmentForm";

export const dynamic = "force-dynamic";

export default async function NewAssignmentPage() {
  const profile = await requireRole("teacher");
  const supabase = await createClient();

  const [{ data: classData }, { data: questionData }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name")
      .eq("teacher_id", profile.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("question_bank")
      .select("id, question, options, correct_index, explanation, topic, difficulty")
      .eq("teacher_id", profile.id)
      .order("created_at", { ascending: false }),
  ]);

  const classes = (classData as ClassItem[]) ?? [];
  const questions = (questionData as QuestionItem[]) ?? [];

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto max-w-2xl">
        <Link
          href="/teacher/exercises"
          className="mb-md inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary"
        >
          <ArrowLeft size={16} /> Ngân hàng câu hỏi
        </Link>
        <h1 className="mb-lg text-display-lg">Tạo bài tập</h1>
        <NewAssignmentForm classes={classes} questions={questions} />
      </div>
    </DashboardShell>
  );
}
