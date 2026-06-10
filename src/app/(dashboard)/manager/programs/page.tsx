import { GraduationCap } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { ProgramManager, type Program, type Specialty } from "@/components/manager/ProgramManager";

export const dynamic = "force-dynamic";

const DEMO_PROGRAMS: Program[] = [
  { id: "p1", code: "ANH-CO-BAN", name: "Tiếng Anh Cơ Bản", level: 1, tuition: 2500000, specialty_id: null, specialty_name: "Tiếng Anh", created_at: new Date().toISOString() },
  { id: "p2", code: "ANH-TRUNG-CAP", name: "Tiếng Anh Trung Cấp", level: 2, tuition: 3000000, specialty_id: null, specialty_name: "Tiếng Anh", created_at: new Date().toISOString() },
  { id: "p3", code: "IELTS-PRO", name: "Luyện Thi IELTS", level: 3, tuition: 4500000, specialty_id: null, specialty_name: "Tiếng Anh", created_at: new Date().toISOString() },
];

const DEMO_SPECIALTIES: Specialty[] = [
  { id: "s1", name: "Tiếng Anh" },
  { id: "s2", name: "Toán" },
  { id: "s3", name: "Ngữ Văn" },
];

export default async function ProgramsPage() {
  const profile = await requireRole("manager");
  const isDemo = profile.id.startsWith("demo-");

  let programs: Program[] = [];
  let specialties: Specialty[] = [];

  if (isDemo) {
    programs = DEMO_PROGRAMS;
    specialties = DEMO_SPECIALTIES;
  } else {
    const supabase = await createClient();
    const [progRes, specRes] = await Promise.all([
      supabase
        .from("programs")
        .select("id, code, name, level, tuition, specialty_id, created_at, specialties(name)")
        .order("level", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("specialties")
        .select("id, name")
        .order("name", { ascending: true }),
    ]);

    programs = ((progRes.data ?? []) as unknown as {
      id: string; code: string; name: string; level: number; tuition: number;
      specialty_id: string | null; created_at: string; specialties: { name: string } | null;
    }[]).map(r => ({
      id: r.id, code: r.code, name: r.name, level: r.level,
      tuition: r.tuition, specialty_id: r.specialty_id,
      specialty_name: r.specialties?.name ?? null,
      created_at: r.created_at,
    }));

    specialties = (specRes.data as Specialty[]) ?? [];
  }

  return (
    <DashboardShell role="manager" userName={profile.full_name || "Quản lý"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-xl">

        {/* Header */}
        <div className="flex items-center gap-md">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
            <GraduationCap size={28} />
          </span>
          <div>
            <h1 className="text-display-lg">Chương trình học</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Quản lý các chương trình và học phí của trung tâm.
            </p>
          </div>
        </div>

        <ProgramManager
          initialPrograms={programs}
          specialties={specialties}
          managerId={profile.id}
        />
      </div>
    </DashboardShell>
  );
}
