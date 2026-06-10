import { requireRole } from "@/lib/supabase/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { ProfileView } from "@/components/profile/ProfileView";

export const dynamic = "force-dynamic";

export default async function ManagerProfile() {
  const profile = await requireRole("manager");
  return (
    <DashboardShell role="manager" userName={profile.full_name || "Quản lý"}>
      <ProfileView profile={profile} />
    </DashboardShell>
  );
}
