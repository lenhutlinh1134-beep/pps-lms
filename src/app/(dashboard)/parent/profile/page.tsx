import { requireRole } from "@/lib/supabase/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { ProfileView } from "@/components/profile/ProfileView";

export const dynamic = "force-dynamic";

export default async function ParentProfile() {
  const profile = await requireRole("parent");
  return (
    <DashboardShell role="parent" userName={profile.full_name || "Phụ huynh"}>
      <ProfileView profile={profile} />
    </DashboardShell>
  );
}
