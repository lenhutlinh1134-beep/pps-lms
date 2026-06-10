import Link from "next/link";
import { ClipboardCheck, ArrowRight, Users } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

interface ClassRow {
  id: string;
  name: string;
  year: string | null;
  school: { name: string } | { name: string }[] | null;
}

export default async function AttendancePage() {
  const profile = await requireRole("teacher");
  const supabase = await createClient();

  const { data } = await supabase
    .from("class_teachers")
    .select("class:classes(id, name, year, school:schools(name))")
    .eq("teacher_id", profile.id)
    .order("added_at", { ascending: false });

  const classes: ClassRow[] = ((data ?? []) as unknown as Array<{ class: ClassRow | ClassRow[] | null }>)
    .flatMap((r) => (Array.isArray(r.class) ? r.class : r.class ? [r.class] : []));

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-4xl flex-col gap-lg">
        <div>
          <h1 className="text-display-lg">Điểm danh</h1>
          <p className="mt-xs text-body-lg text-on-surface-variant">
            Chọn lớp để điểm danh hôm nay.
          </p>
        </div>

        {classes.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Chưa có lớp nào"
            description="Tạo lớp trước khi điểm danh."
            action={
              <Link href="/teacher/classes/new" className="inline-flex items-center gap-1 text-label-md font-semibold text-primary">
                Tạo lớp mới <ArrowRight size={16} />
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => {
              const schoolName = Array.isArray(c.school) ? c.school[0]?.name : (c.school as { name: string } | null)?.name;
              return (
                <Link key={c.id} href={`/teacher/classes/${c.id}`}>
                  <Card interactive className="flex h-full flex-col gap-md">
                    <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-fixed text-primary">
                      <Users size={22} />
                    </span>
                    <div className="flex-1">
                      <h3 className="text-headline-sm">{c.name}</h3>
                      <p className="mt-xs text-body-md text-on-surface-variant">{schoolName ?? "—"}</p>
                    </div>
                    <p className="flex items-center gap-1 text-label-md font-semibold text-primary">
                      <ClipboardCheck size={16} /> Điểm danh ngay <ArrowRight size={14} />
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        <p className="text-body-md text-on-surface-variant">
          Bảng điểm danh nằm trong tab <strong>Điểm danh</strong> của từng lớp.
        </p>
      </div>
    </DashboardShell>
  );
}
