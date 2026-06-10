import Link from "next/link";
import { Users, Video, ClipboardCheck, BarChart3, Plus, GraduationCap, Calendar } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card, Chip } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatTile, EmptyState } from "@/components/EmptyState";
import { isDemoId, DEMO_CLASSES, DEMO_TEACHER_STATS } from "@/lib/demo-data";
import { NewsWidget } from "@/components/news/NewsWidget";

export const dynamic = "force-dynamic";

const quickActions = [
  { icon: Users, label: "Tạo lớp mới", desc: "Trường, lớp, năm học…", color: "text-primary", bg: "bg-primary-fixed", href: "/teacher/classes/new" },
  { icon: Video, label: "Đăng bài giảng", desc: "Video & file lý thuyết", color: "text-secondary", bg: "bg-secondary-fixed", href: "/teacher/lectures/new" },
  { icon: ClipboardCheck, label: "Điểm danh", desc: "Ghi nhận có mặt / vắng", color: "text-tertiary", bg: "bg-tertiary-fixed", href: null },
  { icon: BarChart3, label: "Xem báo cáo", desc: "Tiến trình & cảnh báo", color: "text-primary", bg: "bg-primary-fixed", href: null },
];

interface Overview { total_classes: number; total_students: number; online_now: number }

export default async function TeacherDashboard() {
  const profile = await requireRole("teacher");
  const demo = isDemoId(profile.id);

  let overview: Overview = { total_classes: 0, total_students: 0, online_now: 0 };
  if (!demo) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.rpc("get_teacher_overview");
      if (data && Array.isArray(data) && data[0]) overview = data[0] as Overview;
    } catch { /* bỏ qua lỗi khi chưa cấu hình Supabase */ }
  }

  const stats = demo
    ? DEMO_TEACHER_STATS
    : { classes: overview.total_classes, students: overview.total_students, online: overview.online_now, flags: 0 };

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-lg">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div>
            <h1 className="text-display-lg">Bảng điều khiển</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Quản lý lớp học, bài giảng và theo dõi học sinh.
            </p>
          </div>
          <Link href="/teacher/classes/new">
            <Button>
              <Plus size={20} /> Tạo lớp mới
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-md lg:grid-cols-4">
          <StatTile label="Lớp đang dạy" value={`${stats.classes}`} hint={stats.classes ? undefined : "Chưa có lớp"} />
          <StatTile label="Tổng học sinh" value={`${stats.students}`} />
          <StatTile label="Đang online" value={`${stats.online}`} hint="Theo thời gian thực" />
          <StatTile label="Cảnh báo" value={`${stats.flags}`} hint="Học sinh cần chú ý" />
        </div>

        {/* Thao tác nhanh */}
        <section>
          <h2 className="mb-md text-headline-sm">Thao tác nhanh</h2>
          <div className="grid grid-cols-2 gap-md lg:grid-cols-4">
            {quickActions.map((a) => {
              const card = (
                <Card interactive padding="md" className="flex h-full flex-col gap-sm">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-md ${a.bg} ${a.color}`}>
                    <a.icon size={22} />
                  </span>
                  <div>
                    <p className="text-body-md font-semibold">{a.label}</p>
                    <p className="text-label-sm text-on-surface-variant">{a.desc}</p>
                  </div>
                </Card>
              );
              return a.href ? (
                <Link key={a.label} href={a.href}>{card}</Link>
              ) : (
                <div key={a.label}>{card}</div>
              );
            })}
          </div>
        </section>

        {/* Danh sách lớp */}
        <section>
          <div className="mb-md flex items-center justify-between">
            <h2 className="text-headline-sm">Lớp của tôi</h2>
            {demo && <Link href="/teacher/classes" className="text-label-md font-semibold text-primary">Xem tất cả</Link>}
          </div>
          {demo ? (
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
              {DEMO_CLASSES.map((c) => (
                <Link key={c.id} href={`/teacher/classes/${c.id}`}>
                  <Card interactive className="flex h-full flex-col gap-md">
                    <div className="flex items-start justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary-fixed text-primary">
                        <Users size={24} />
                      </span>
                      <Chip color="secondary">Chủ lớp</Chip>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-headline-sm">{c.name}</h3>
                      <p className="mt-xs text-body-md text-on-surface-variant">{c.school.name}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-label-md text-on-surface-variant">
                        <Calendar size={14} /> {c.year}
                      </span>
                      <span className="text-label-md font-semibold text-primary">Quản lý →</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
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
          )}
        </section>
        {/* Tin tức & Thông báo */}
        <NewsWidget role="teacher" />
      </div>
    </DashboardShell>
  );
}
