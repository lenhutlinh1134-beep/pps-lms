import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { NewQuestionForm } from "@/components/exercises/NewQuestionForm";

export default async function NewQuestionPage() {
  const profile = await requireRole("teacher");

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto max-w-2xl">
        <Link
          href="/teacher/exercises"
          className="mb-md inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary"
        >
          <ArrowLeft size={16} /> Ngân hàng câu hỏi
        </Link>
        <h1 className="mb-lg text-display-lg">Thêm câu hỏi mới</h1>
        <NewQuestionForm />
      </div>
    </DashboardShell>
  );
}
