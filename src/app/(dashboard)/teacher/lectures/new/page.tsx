import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { LectureForm } from "@/components/lectures/LectureForm";

export const dynamic = "force-dynamic";

export default async function NewLecturePage() {
  const profile = await requireRole("teacher");

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-2xl flex-col gap-lg">
        <div>
          <Link
            href="/teacher/lectures"
            className="mb-sm inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary"
          >
            <ArrowLeft size={16} /> Danh sách bài giảng
          </Link>
          <h1 className="text-display-lg">Đăng bài giảng</h1>
          <p className="mt-xs text-body-lg text-on-surface-variant">
            Chia sẻ video hoặc tài liệu lý thuyết cho học sinh trong lớp.
          </p>
        </div>
        <LectureForm />
      </div>
    </DashboardShell>
  );
}
