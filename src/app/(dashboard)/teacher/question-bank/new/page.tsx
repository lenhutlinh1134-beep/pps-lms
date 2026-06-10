import Link from "next/link";
import { ArrowLeft, Database } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { QuestionBankCreator } from "@/components/teacher/QuestionBankCreator";

export const dynamic = "force-dynamic";

export default async function NewQuestionBankPage() {
  const profile = await requireRole("teacher");
  const isDemo = profile.id.startsWith("demo-");

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-3xl flex-col gap-lg">
        <div>
          <Link
            href="/teacher/question-bank"
            className="mb-sm inline-flex items-center gap-xs text-label-md text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft size={16} /> Quay lại
          </Link>
          <div className="flex items-start gap-md">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed">
              <Database size={24} className="text-primary" />
            </span>
            <div>
              <h1 className="text-display-lg">Tạo ngân hàng câu hỏi</h1>
              <p className="mt-xs text-body-lg text-on-surface-variant">
                Upload file Word hoặc thêm câu hỏi thủ công
              </p>
            </div>
          </div>
        </div>

        <QuestionBankCreator demo={isDemo} />
      </div>
    </DashboardShell>
  );
}
