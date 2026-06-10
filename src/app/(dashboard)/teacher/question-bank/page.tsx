import Link from "next/link";
import { Database, Plus, FileText, BookMarked } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

interface BankRow {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  question_count: number;
  created_at: string;
}

const DEMO_BANKS: BankRow[] = [
  { id: "demo-b1", title: "Trắc nghiệm Unit 1–5", description: "Vocabulary & Grammar", subject: "Tiếng Anh", question_count: 30, created_at: new Date(Date.now() - 86400_000 * 3).toISOString() },
  { id: "demo-b2", title: "Tự luận Writing B2", description: "Câu hỏi tự luận luyện viết", subject: "Tiếng Anh", question_count: 10, created_at: new Date(Date.now() - 86400_000).toISOString() },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function QuestionBankPage() {
  const profile = await requireRole("teacher");
  const isDemo = profile.id.startsWith("demo-");

  let banks: BankRow[] = [];

  if (isDemo) {
    banks = DEMO_BANKS;
  } else {
    const supabase = await createClient();
    try {
      // Lấy banks + đếm số câu hỏi trong 1 query
      const { data } = await supabase
        .from("question_banks")
        .select("id, title, description, subject, created_at, questions(id)")
        .eq("teacher_id", profile.id)
        .order("created_at", { ascending: false });

      banks = ((data ?? []) as unknown as {
        id: string; title: string; description: string | null; subject: string | null;
        created_at: string; questions: { id: string }[];
      }[]).map((b) => ({
        id: b.id,
        title: b.title,
        description: b.description,
        subject: b.subject,
        question_count: b.questions?.length ?? 0,
        created_at: b.created_at,
      }));
    } catch { /* rỗng */ }
  }

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-4xl flex-col gap-lg">

        {/* Header */}
        <div className="flex items-start justify-between gap-md">
          <div className="flex items-start gap-md">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed">
              <Database size={24} className="text-primary" />
            </span>
            <div>
              <h1 className="text-display-lg">Ngân hàng câu hỏi</h1>
              <p className="mt-xs text-body-lg text-on-surface-variant">
                {banks.length} ngân hàng · Upload file Word để tạo nhanh
              </p>
            </div>
          </div>
          <Link href="/teacher/question-bank/new">
            <Button size="sm" className="gap-1 shrink-0">
              <Plus size={16} /> Tạo mới
            </Button>
          </Link>
        </div>

        {/* Empty */}
        {banks.length === 0 ? (
          <EmptyState
            icon={Database}
            title="Chưa có ngân hàng câu hỏi"
            description="Nhấn 'Tạo mới' để tạo ngân hàng đầu tiên — có thể import từ file Word."
          />
        ) : (
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            {banks.map((bank) => (
              <Link key={bank.id} href={`/teacher/question-bank/${bank.id}`}>
                <Card interactive className="flex h-full flex-col gap-md">
                  <div className="flex items-start gap-sm">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-fixed">
                      <BookMarked size={20} className="text-primary" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate text-headline-sm">{bank.title}</h3>
                      {bank.subject && (
                        <span className="inline-block rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
                          {bank.subject}
                        </span>
                      )}
                    </div>
                  </div>
                  {bank.description && (
                    <p className="line-clamp-2 text-body-md text-on-surface-variant">{bank.description}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between border-t border-outline-variant pt-md text-label-md text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <FileText size={14} />
                      {bank.question_count} câu hỏi
                    </span>
                    <span>{formatDate(bank.created_at)}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
