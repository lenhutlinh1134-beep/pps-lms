import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { NewClassForm } from "@/components/teacher/NewClassForm";

export const dynamic = "force-dynamic";

export default async function NewClassPage() {
  const profile = await requireRole("teacher");

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-2xl flex-col gap-lg">
        <div>
          <Link
            href="/teacher/classes"
            className="mb-sm inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary"
          >
            <ArrowLeft size={16} /> Danh sách lớp
          </Link>
          <h1 className="text-display-lg">Tạo lớp mới</h1>
          <p className="mt-xs text-body-lg text-on-surface-variant">
            Nhập thông tin lớp. Bạn sẽ là chủ lớp và có thể mời đồng giáo viên sau.
          </p>
        </div>

        <NewClassForm />
      </div>
    </DashboardShell>
  );
}
