import Link from "next/link";
import { Plus, GraduationCap, Users, Calendar } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card, Chip } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/EmptyState";
import { isDemoId, DEMO_CLASSES } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

interface ClassRow {
  role: string;
  class: {
    id: string;
    name: string;
    year: string | null;
    level: string | null;
    created_at: string;
    school: { name: string } | null;
  } | null;
}

export default async function TeacherClassesPage() {
  const profile = await requireRole("teacher");

  let rows: ClassRow[] = [];
  if (isDemoId(profile.id)) {
    rows = DEMO_CLASSES.map((c) => ({
      role: c.role,
      class: { id: c.id, name: c.name, year: c.year, level: c.level, created_at: "", school: c.school },
    }));
  } else {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("class_teachers")
        .select("role, class:classes(id, name, year, level, created_at, school:schools(name))")
        .eq("teacher_id", profile.id)
        .order("added_at", { ascending: false });
      rows = (data as unknown as ClassRow[]) ?? [];
    } catch {
      rows = [];
    }
  }

  const classes = rows.filter((r) => r.class);

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-lg">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div>
            <h1 className="text-display-lg">Lớp của tôi</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              {classes.length > 0 ? `${classes.length} lớp đang quản lý` : "Quản lý các lớp bạn dạy"}
            </p>
          </div>
          <Link href="/teacher/classes/new">
            <Button><Plus size={20} /> Tạo lớp mới</Button>
          </Link>
        </div>

        {classes.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Bạn chưa có lớp nào"
            description="Tạo lớp đầu tiên với thông tin trường, lớp, năm học. Sau đó mời học sinh và đồng giáo viên tham gia."
            action={
              <Link href="/teacher/classes/new">
                <Button><Plus size={20} /> Tạo lớp đầu tiên</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((r) => (
              <Link key={r.class!.id} href={`/teacher/classes/${r.class!.id}`}>
                <Card interactive className="flex h-full flex-col gap-md">
                  <div className="flex items-start justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary-fixed text-primary">
                      <Users size={24} />
                    </span>
                    <div className="flex items-center gap-xs">
                      {r.class!.level && (
                        <span className="rounded-full bg-primary-fixed px-2.5 py-0.5 text-label-sm font-bold text-primary">
                          {r.class!.level}
                        </span>
                      )}
                      <Chip color={r.role === "owner" ? "secondary" : "neutral"}>
                        {r.role === "owner" ? "Chủ lớp" : "Đồng GV"}
                      </Chip>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-headline-sm">{r.class!.name}</h3>
                    <p className="mt-xs text-body-md text-on-surface-variant">
                      {r.class!.school?.name ?? "Chưa gắn trường"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    {r.class!.year ? (
                      <span className="flex items-center gap-1 text-label-md text-on-surface-variant">
                        <Calendar size={14} /> {r.class!.year}
                      </span>
                    ) : <span />}
                    <span className="text-label-md font-semibold text-primary">Quản lý →</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
