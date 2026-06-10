import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { QuizPlayer } from "@/components/quiz/QuizPlayer";

export const dynamic = "force-dynamic";

interface QuizPayload {
  questions: Array<{
    id?: string;
    question: string;
    options: string[];
    correct_index: number;
    explanation?: string;
  }>;
}

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole("student");
  const supabase = await createClient();

  const { data } = await supabase
    .from("assignments")
    .select("id, title, type, payload, class_id")
    .eq("id", id)
    .single();

  if (!data) notFound();

  return (
    <DashboardShell role="student" userName={profile.full_name || "Học sinh"}>
      <div className="mx-auto flex max-w-3xl flex-col gap-lg">
        <div>
          <Link href="/student/exercises" className="mb-sm inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary">
            <ArrowLeft size={16} /> Danh sách bài tập
          </Link>
          <h1 className="text-display-lg">{data.title}</h1>
        </div>

        <QuizPlayer
          assignmentId={data.id}
          title={data.title}
          payload={(data.payload as QuizPayload) ?? { questions: [] }}
        />
      </div>
    </DashboardShell>
  );
}
