import { Building2, Users, GraduationCap, BarChart3, MessageSquarePlus, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

interface Stats {
  totalClasses: number;
  totalStudents: number;
  totalTeachers: number;
  activeClasses: number;
  pendingFeedback: number;
}

const DEMO_STATS: Stats = {
  totalClasses: 12,
  totalStudents: 248,
  totalTeachers: 8,
  activeClasses: 10,
  pendingFeedback: 3,
};

export default async function ManagerDashboardPage() {
  const profile = await requireRole("manager");
  const isDemo = profile.id.startsWith("demo-");

  let stats: Stats = { totalClasses: 0, totalStudents: 0, totalTeachers: 0, activeClasses: 0, pendingFeedback: 0 };

  if (isDemo) {
    stats = DEMO_STATS;
  } else {
    const supabase = await createClient();

    try {
      const [classesRes, studentsRes, teachersRes, activeRes, feedbackRes] = await Promise.all([
        supabase.from("classes").select("id", { count: "exact", head: true }),
        supabase.from("class_students").select("student_id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
        supabase.from("classes").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("parent_feedback").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      stats = {
        totalClasses: classesRes.count ?? 0,
        totalStudents: studentsRes.count ?? 0,
        totalTeachers: teachersRes.count ?? 0,
        activeClasses: activeRes.count ?? 0,
        pendingFeedback: feedbackRes.count ?? 0,
      };
    } catch {
      // fallback: giữ giá trị 0
    }
  }

  const hasData = stats.totalClasses > 0 || stats.totalStudents > 0;

  const statCards = [
    {
      label: "Tổng lớp học",
      value: stats.totalClasses,
      icon: Building2,
      color: "text-primary",
    },
    {
      label: "Tổng học sinh",
      value: stats.totalStudents,
      icon: Users,
      color: "text-secondary",
    },
    {
      label: "Giáo viên đang dạy",
      value: stats.totalTeachers,
      icon: GraduationCap,
      color: "text-tertiary",
    },
    {
      label: "Lớp đang hoạt động",
      value: stats.activeClasses,
      icon: BarChart3,
      color: "text-primary",
    },
  ];

  return (
    <DashboardShell role="manager" userName={profile.full_name || "Quản lý"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-lg">
        <div>
          <h1 className="text-display-lg">Tổng quan</h1>
          <p className="mt-xs text-body-lg text-on-surface-variant">
            Xem nhanh toàn bộ hoạt động của trung tâm.
          </p>
        </div>

        {hasData ? (
          <>
            <div className="grid grid-cols-2 gap-md lg:grid-cols-4">
              {statCards.map((card) => (
                <Card key={card.label} padding="md" className="text-center">
                  <div className="flex justify-center mb-sm">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container">
                      <card.icon size={20} className={card.color} />
                    </span>
                  </div>
                  <p className={`font-display text-display-sm ${card.color}`}>{card.value}</p>
                  <p className="text-label-md text-on-surface-variant">{card.label}</p>
                </Card>
              ))}
            </div>

            {/* Alert row — phản hồi chờ xử lý */}
            {stats.pendingFeedback > 0 && (
              <Card padding="md" className="flex items-center justify-between gap-md border border-error-container bg-error-container/10">
                <div className="flex items-center gap-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error-container">
                    <MessageSquarePlus size={20} className="text-on-error-container" />
                  </span>
                  <div>
                    <p className="text-body-md font-semibold text-on-error-container">
                      {stats.pendingFeedback} phản hồi phụ huynh chờ xử lý
                    </p>
                    <p className="text-label-sm text-on-surface-variant">Chưa có giáo viên nào trả lời</p>
                  </div>
                </div>
                <Link
                  href="/manager/feedback"
                  className="shrink-0 rounded-xl bg-error px-4 py-2 text-label-md font-semibold text-on-error transition-opacity hover:opacity-90"
                >
                  Xem ngay →
                </Link>
              </Card>
            )}
          </>
        ) : (
          <EmptyState
            icon={BarChart3}
            title="Chưa có dữ liệu"
            description="Dữ liệu sẽ xuất hiện khi trung tâm bắt đầu tạo lớp và thêm học sinh."
          />
        )}
      </div>
    </DashboardShell>
  );
}
