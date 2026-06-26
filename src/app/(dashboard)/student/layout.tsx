import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { OnlinePresence } from "@/components/student/OnlinePresence";
import { StudentOnboarding } from "@/components/student/StudentOnboarding";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("student");
  const supabase = await createClient();

  const { count } = await supabase
    .from("class_students")
    .select("*", { count: "exact", head: true })
    .eq("student_id", profile.id);

  if (count === 0 && !profile.id.startsWith("demo-")) {
    return <StudentOnboarding userName={profile.full_name ?? "Học sinh"} />;
  }

  return (
    <>
      <OnlinePresence />
      {children}
    </>
  );
}
