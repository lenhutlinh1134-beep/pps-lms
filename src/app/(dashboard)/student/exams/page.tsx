import { requireRole } from "@/lib/supabase/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { StudentExamsClient } from "./_client";

export const dynamic = "force-dynamic";

export default async function StudentExamsPage() {
  const profile = await requireRole("student");
  return (
    <DashboardShell role="student" userName={profile.full_name || "Học sinh"}>
      <StudentExamsClient />
    </DashboardShell>
  );
}
