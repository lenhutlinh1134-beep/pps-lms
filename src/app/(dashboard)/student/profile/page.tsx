import { requireRole } from "@/lib/supabase/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { ProfileView } from "@/components/profile/ProfileView";

export const dynamic = "force-dynamic";

export default async function StudentProfile() {
  const profile = await requireRole("student");
  return (
    <DashboardShell role="student" userName={profile.full_name || "Học sinh"}>
      <ProfileView profile={profile} />
    </DashboardShell>
  );
}
