import { BarChart3, Building2, Users } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

interface ClassRow {
  id: string;
  name: string;
  student_count: number;
  teacher_count: number;
}

const DEMO_CLASSES: ClassRow[] = [
  { id: "c1", name: "Lớp A1 - Cơ bản", student_count: 22, teacher_count: 2 },
  { id: "c2", name: "Lớp B2 - Trung cấp", student_count: 18, teacher_count: 1 },
  { id: "c3", name: "Lớp C3 - Nâng cao", student_count: 15, teacher_count: 2 },
  { id: "c4", name: "Lớp IELTS Pro", student_count: 12, teacher_count: 1 },
];

export default async function StatsPage() {
  const profile = await requireRole("manager");
  const isDemo = profile.id.startsWith("demo-");

  let classes: ClassRow[] = [];

  if (isDemo) {
    classes = DEMO_CLASSES;
  } else {
    const supabase = await createClient();
    try {
      // 3 queries thay vì 1 + 2N (fix N+1)
      const [classRes, studentsRes, teachersRes] = await Promise.all([
        supabase.from("classes").select("id, name").order("name", { ascending: true }),
        supabase.from("class_students").select("class_id"),
        supabase.from("class_teachers").select("class_id"),
      ]);

      if (classRes.data && classRes.data.length > 0) {
        // Đếm theo class_id trong JS — không cần thêm query
        const studentCounts = (studentsRes.data ?? []).reduce<Record<string, number>>(
          (acc, r) => { acc[r.class_id] = (acc[r.class_id] ?? 0) + 1; return acc; },
          {}
        );
        const teacherCounts = (teachersRes.data ?? []).reduce<Record<string, number>>(
          (acc, r) => { acc[r.class_id] = (acc[r.class_id] ?? 0) + 1; return acc; },
          {}
        );
        classes = classRes.data.map((cls) => ({
          id: cls.id,
          name: cls.name,
          student_count: studentCounts[cls.id] ?? 0,
          teacher_count: teacherCounts[cls.id] ?? 0,
        }));
      }
    } catch {
      // fallback: giữ mảng rỗng
    }
  }

  const totalEnrollments = classes.reduce((sum, c) => sum + c.student_count, 0);
  const totalClasses = classes.length;

  return (
    <DashboardShell role="manager" userName={profile.full_name || "Quản lý"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-lg">
        <div>
          <h1 className="text-display-lg">Thống kê</h1>
          <p className="mt-xs text-body-lg text-on-surface-variant">
            Tổng quan sĩ số và hoạt động các lớp học.
          </p>
        </div>

        {/* Tóm tắt */}
        <div className="grid grid-cols-2 gap-md">
          <Card padding="md" className="text-center">
            <div className="flex justify-center mb-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container">
                <Building2 size={20} className="text-primary" />
              </span>
            </div>
            <p className="font-display text-display-sm text-primary">{totalClasses}</p>
            <p className="text-label-md text-on-surface-variant">Tổng số lớp</p>
          </Card>
          <Card padding="md" className="text-center">
            <div className="flex justify-center mb-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container">
                <Users size={20} className="text-secondary" />
              </span>
            </div>
            <p className="font-display text-display-sm text-secondary">{totalEnrollments}</p>
            <p className="text-label-md text-on-surface-variant">Tổng lượt ghi danh</p>
          </Card>
        </div>

        {/* Bảng chi tiết lớp học */}
        {classes.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Chưa có dữ liệu thống kê"
            description="Dữ liệu sẽ xuất hiện khi trung tâm tạo lớp và thêm học sinh."
          />
        ) : (
          <section>
            <h2 className="mb-md text-headline-sm">Chi tiết từng lớp</h2>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-body-md">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className="pb-md pr-lg text-label-md font-semibold text-on-surface-variant">
                        Tên lớp
                      </th>
                      <th className="pb-md pr-lg text-label-md font-semibold text-on-surface-variant text-right">
                        Học sinh
                      </th>
                      <th className="pb-md text-label-md font-semibold text-on-surface-variant text-right">
                        Giáo viên
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {classes.map((cls) => (
                      <tr key={cls.id} className="hover:bg-surface-container transition-colors">
                        <td className="py-md pr-lg font-medium">{cls.name}</td>
                        <td className="py-md pr-lg text-right">
                          <span className="inline-flex items-center gap-1">
                            <Users size={14} className="text-on-surface-variant" />
                            <span className="font-semibold text-primary">{cls.student_count}</span>
                          </span>
                        </td>
                        <td className="py-md text-right">
                          <span className="font-semibold text-tertiary">{cls.teacher_count}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
