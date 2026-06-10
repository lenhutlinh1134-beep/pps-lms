import { requireRole } from "@/lib/supabase/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { ProfileView } from "@/components/profile/ProfileView";

export const dynamic = "force-dynamic";

export default async function TeacherProfile() {
  const profile = await requireRole("teacher");
  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <ProfileView profile={profile} />
    </DashboardShell>
  );
}
