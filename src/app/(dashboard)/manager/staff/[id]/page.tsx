import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, ChevronRight, Users, BookOpen } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

interface ClassRow {
  id: string;
  name: string;
  level: string | null;
  year: string | null;
  is_active: boolean;
  student_count: number;
}

const DEMO_TEACHER = {
  id: "t1",
  full_name: "Nguyễn Thị Lan",
  email: "lan.nguyen@pps.edu.vn",
  avatar_url: null as string | null,
};

const DEMO_CLASSES: ClassRow[] = [
  { id: "c1", name: "A1 Thứ 2-4", level: "A1", year: "2025-2026", is_active: true, student_count: 12 },
  { id: "c2", name: "A2 Thứ 3-5", level: "A2", year: "2025-2026", is_active: true, student_count: 9 },
  { id: "c3", name: "B1 Thứ 7", level: "B1", year: "2024-2025", is_active: false, student_count: 6 },
];

export default async function ManagerTeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole("manager");
  const isDemo = profile.id.startsWith("demo-");

  let teacher: typeof DEMO_TEACHER | null = null;
  let classes: ClassRow[] = [];

  if (isDemo) {
    teacher = DEMO_TEACHER;
    classes = DEMO_CLASSES;
  } else {
    try {
      const supabase = await createClient();
      const [teacherRes, classTeachersRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .eq("id", id)
          .eq("role", "teacher")
          .single(),
        supabase
          .from("class_teachers")
          .select("class_id, classes(id, name, level, year, is_active)")
          .eq("teacher_id", id),
      ]);

      if (!teacherRes.data) return notFound();
      teacher = teacherRes.data as typeof DEMO_TEACHER;

      const classIds = (classTeachersRes.data ?? [])
        .map((r: { classes: { id: string } | { id: string }[] | null }) =>
          Array.isArray(r.classes) ? r.classes[0] : r.classes
        )
        .filter(Boolean) as { id: string; name: string; level: string | null; year: string | null; is_active: boolean }[];

      if (classIds.length > 0) {
        const ids = classIds.map((c) => c.id);
        const { data: counts } = await supabase
          .from("class_students")
          .select("class_id")
          .in("class_id", ids);

        const countMap: Record<string, number> = {};
        (counts ?? []).forEach((r: { class_id: string }) => {
          countMap[r.class_id] = (countMap[r.class_id] ?? 0) + 1;
        });

        classes = classIds.map((c) => ({
          ...c,
          student_count: countMap[c.id] ?? 0,
        }));
      }
    } catch {
      return notFound();
    }
  }

  if (!teacher) return notFound();

  const initials = (teacher.full_name ?? "?").charAt(0).toUpperCase();
  const activeClasses = classes.filter((c) => c.is_active);
  const totalStudents = classes.reduce((s, c) => s + c.student_count, 0);

  return (
    <DashboardShell role="manager" userName={profile.full_name || "Quản lý"}>
      <div className="mx-auto flex max-w-4xl flex-col gap-lg">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-label-md text-on-surface-variant">
          <Link href="/manager/staff" className="hover:text-primary flex items-center gap-1">
            <ArrowLeft size={16} /> Nhân viên
          </Link>
          <ChevronRight size={14} />
          <span className="text-on-surface">{teacher.full_name ?? "Giáo viên"}</span>
        </div>

        {/* Teacher profile card */}
        <Card padding="md">
          <div className="flex items-center gap-lg">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-display text-display-sm font-bold text-on-primary-fixed">
              {initials}
            </span>
            <div className="flex-1">
              <h1 className="text-display-sm font-bold">{teacher.full_name ?? "(Chưa có tên)"}</h1>
              <div className="mt-xs flex flex-wrap items-center gap-md text-body-md text-on-surface-variant">
                {teacher.email && (
                  <span className="flex items-center gap-1">
                    <Mail size={14} /> {teacher.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="mt-lg grid grid-cols-3 gap-md border-t border-outline-variant pt-lg">
            <div className="text-center">
              <p className="font-display text-display-sm font-bold text-primary">{classes.length}</p>
              <p className="text-label-sm text-on-surface-variant">Tổng lớp</p>
            </div>
            <div className="text-center">
              <p className="font-display text-display-sm font-bold text-tertiary">{activeClasses.length}</p>
              <p className="text-label-sm text-on-surface-variant">Đang hoạt động</p>
            </div>
            <div className="text-center">
              <p className="font-display text-display-sm font-bold text-secondary">{totalStudents}</p>
              <p className="text-label-sm text-on-surface-variant">Tổng học sinh</p>
            </div>
          </div>
        </Card>

        {/* Class list */}
        <div>
          <h2 className="mb-md text-title-lg font-semibold">Danh sách lớp</h2>

          {classes.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Chưa có lớp nào"
              description="Giáo viên này chưa được phân công lớp nào."
            />
          ) : (
            <div className="flex flex-col gap-sm">
              {classes.map((cls) => (
                <Link
                  key={cls.id}
                  href={`/manager/classes/${cls.id}`}
                  className="block"
                >
                  <Card padding="md" interactive className="flex items-center justify-between gap-md">
                    <div className="flex items-center gap-md">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-fixed text-secondary">
                        <BookOpen size={18} />
                      </span>
                      <div>
                        <p className="font-semibold leading-tight">{cls.name}</p>
                        <div className="mt-xs flex flex-wrap items-center gap-sm text-label-sm text-on-surface-variant">
                          {cls.level && <span>Cấp {cls.level}</span>}
                          {cls.year && <span>· {cls.year}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-md">
                      <div className="hidden sm:flex items-center gap-1 text-label-md text-on-surface-variant">
                        <Users size={14} />
                        <span>{cls.student_count} học sinh</span>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-label-sm font-medium ${
                          cls.is_active
                            ? "bg-tertiary-fixed text-on-tertiary-fixed"
                            : "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        {cls.is_active ? "Đang học" : "Kết thúc"}
                      </span>
                      <ChevronRight size={18} className="text-on-surface-variant" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
