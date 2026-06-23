import { requireRole } from "@/lib/supabase/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { TeacherExamsClient } from "./_client";

export const dynamic = "force-dynamic";

export default async function TeacherExamsPage() {
  const profile = await requireRole("teacher");
  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <TeacherExamsClient />
    </DashboardShell>
  );
}
