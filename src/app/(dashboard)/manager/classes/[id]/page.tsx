import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, Users, GraduationCap, School, Calendar, Clock } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

interface StudentRow {
  id: string;
  full_name: string | null;
  email: string | null;
  last_seen: string | null;
  joined_at: string | null;
}

const DEMO_CLASS = {
  id: "c1",
  name: "A1 Thứ 2-4",
  level: "A1",
  year: "2025-2026",
  is_active: true,
  school: "Trường THCS Lê Lợi",
  teacher_name: "Nguyễn Thị Lan",
  teacher_id: "t1",
};

const DEMO_STUDENTS: StudentRow[] = [
  { id: "s1", full_name: "Trần Minh Khoa", email: "khoa@example.com", last_seen: new Date(Date.now() - 3_600_000).toISOString(), joined_at: "2025-09-01T00:00:00Z" },
  { id: "s2", full_name: "Nguyễn Thị Bích", email: "bich@example.com", last_seen: new Date(Date.now() - 86_400_000).toISOString(), joined_at: "2025-09-01T00:00:00Z" },
  { id: "s3", full_name: "Lê Quang Hưng", email: "hung@example.com", last_seen: new Date(Date.now() - 7 * 86_400_000).toISOString(), joined_at: "2025-09-05T00:00:00Z" },
  { id: "s4", full_name: "Phạm Thúy Nga", email: "nga@example.com", last_seen: null, joined_at: "2025-09-10T00:00:00Z" },
];

function onlineStatus(lastSeen: string | null): { label: string; color: string } {
  if (!lastSeen) return { label: "Chưa đăng nhập", color: "text-on-surface-variant" };
  const diff = Date.now() - new Date(lastSeen).getTime();
  if (diff < 5 * 60_000) return { label: "Đang online", color: "text-tertiary" };
  if (diff < 60 * 60_000) return { label: `${Math.round(diff / 60_000)} phút trước`, color: "text-on-surface-variant" };
  if (diff < 24 * 3_600_000) return { label: `${Math.round(diff / 3_600_000)} giờ trước`, color: "text-on-surface-variant" };
  return { label: `${Math.round(diff / 86_400_000)} ngày trước`, color: "text-error" };
}

export default async function ManagerClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole("manager");
  const isDemo = profile.id.startsWith("demo-");

  let cls: typeof DEMO_CLASS | null = null;
  let students: StudentRow[] = [];

  if (isDemo) {
    cls = DEMO_CLASS;
    students = DEMO_STUDENTS;
  } else {
    try {
      const supabase = await createClient();

      const [classRes, studentsRes, teacherRes] = await Promise.all([
        supabase
          .from("classes")
          .select("id, name, level, year, is_active, school:schools(name)")
          .eq("id", id)
          .single(),
        supabase
          .from("class_students")
          .select("joined_at, student:profiles(id, full_name, email, last_seen)")
          .eq("class_id", id),
        supabase
          .from("class_teachers")
          .select("teacher:profiles(id, full_name)")
          .eq("class_id", id)
          .limit(1)
          .single(),
      ]);

      if (!classRes.data) return notFound();

      const raw = classRes.data as {
        id: string; name: string; level: string | null; year: string | null; is_active: boolean;
        school: { name: string } | { name: string }[] | null;
      };
      const schoolName = Array.isArray(raw.school) ? raw.school[0]?.name : raw.school?.name;
      const teacherRaw = teacherRes.data?.teacher as { id: string; full_name: string | null } | { id: string; full_name: string | null }[] | null;
      const teacherData = Array.isArray(teacherRaw) ? teacherRaw[0] : teacherRaw;

      cls = {
        id: raw.id,
        name: raw.name,
        level: raw.level ?? "",
        year: raw.year ?? "",
        is_active: raw.is_active,
        school: schoolName ?? "",
        teacher_name: teacherData?.full_name ?? "Chưa có GV",
        teacher_id: teacherData?.id ?? "",
      };

      const rows = (studentsRes.data ?? []) as Array<{
        joined_at: string | null;
        student: StudentRow | StudentRow[] | null;
      }>;

      students = rows.flatMap((r) => {
        const s = Array.isArray(r.student) ? r.student[0] : r.student;
        return s ? [{ ...s, joined_at: r.joined_at }] : [];
      });
    } catch {
      return notFound();
    }
  }

  if (!cls) return notFound();

  return (
    <DashboardShell role="manager" userName={profile.full_name || "Quản lý"}>
      <div className="mx-auto flex max-w-4xl flex-col gap-lg">

        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-label-md text-on-surface-variant">
          <Link href="/manager/staff" className="hover:text-primary flex items-center gap-1">
            <ArrowLeft size={16} /> Nhân viên
          </Link>
          <ChevronRight size={14} />
          {cls.teacher_id ? (
            <Link href={`/manager/staff/${cls.teacher_id}`} className="hover:text-primary">
              {cls.teacher_name}
            </Link>
          ) : (
            <span>{cls.teacher_name}</span>
          )}
          <ChevronRight size={14} />
          <span className="text-on-surface">{cls.name}</span>
        </div>

        {/* Class info card */}
        <Card padding="md">
          <div className="flex flex-wrap items-start justify-between gap-md">
            <div>
              <div className="flex flex-wrap items-center gap-sm">
                <h1 className="text-display-sm font-bold">{cls.name}</h1>
                {cls.level && (
                  <span className="rounded-full bg-primary-fixed px-3 py-1 text-label-md font-bold text-primary">
                    Cấp {cls.level}
                  </span>
                )}
                <span
                  className={`rounded-full px-3 py-1 text-label-sm font-medium ${
                    cls.is_active
                      ? "bg-tertiary-fixed text-on-tertiary-fixed"
                      : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {cls.is_active ? "Đang học" : "Kết thúc"}
                </span>
              </div>
              <div className="mt-sm flex flex-wrap gap-md text-body-md text-on-surface-variant">
                {cls.school && <span className="flex items-center gap-1"><School size={14} /> {cls.school}</span>}
                {cls.year && <span className="flex items-center gap-1"><Calendar size={14} /> {cls.year}</span>}
                <span className="flex items-center gap-1">
                  <GraduationCap size={14} />
                  {cls.teacher_id ? (
                    <Link href={`/manager/staff/${cls.teacher_id}`} className="hover:text-primary underline-offset-2 hover:underline">
                      {cls.teacher_name}
                    </Link>
                  ) : (
                    cls.teacher_name
                  )}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-primary-fixed px-4 py-2 text-primary">
              <Users size={16} />
              <span className="font-display text-title-lg font-bold">{students.length}</span>
              <span className="text-label-md">học sinh</span>
            </div>
          </div>
        </Card>

        {/* Student list */}
        <div>
          <h2 className="mb-md text-title-lg font-semibold">Danh sách học sinh</h2>

          {students.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Chưa có học sinh"
              description="Lớp này chưa có học sinh nào được thêm vào."
            />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-body-md">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className="pb-md pr-lg text-label-md font-semibold text-on-surface-variant">Học sinh</th>
                      <th className="pb-md pr-lg text-label-md font-semibold text-on-surface-variant hidden md:table-cell">Email</th>
                      <th className="pb-md pr-lg text-label-md font-semibold text-on-surface-variant hidden sm:table-cell">Vào lớp</th>
                      <th className="pb-md text-label-md font-semibold text-on-surface-variant">Hoạt động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {students.map((student) => {
                      const initials = (student.full_name ?? "?").charAt(0).toUpperCase();
                      const status = onlineStatus(student.last_seen);
                      const joinedDate = student.joined_at
                        ? new Date(student.joined_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
                        : "—";
                      return (
                        <tr key={student.id} className="hover:bg-surface-container transition-colors">
                          <td className="py-md pr-lg">
                            <div className="flex items-center gap-sm">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary-fixed font-display text-label-md font-bold text-on-secondary-fixed">
                                {initials}
                              </span>
                              <div>
                                <p className="font-semibold leading-tight">{student.full_name ?? "(Chưa có tên)"}</p>
                                <p className="text-label-sm text-on-surface-variant md:hidden">{student.email ?? "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-md pr-lg text-on-surface-variant hidden md:table-cell">
                            {student.email ?? "—"}
                          </td>
                          <td className="py-md pr-lg hidden sm:table-cell">
                            <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                              <Clock size={13} /> {joinedDate}
                            </span>
                          </td>
                          <td className="py-md">
                            <span className={`text-label-sm font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-md text-label-sm text-on-surface-variant">
                Tổng: {students.length} học sinh
              </p>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
