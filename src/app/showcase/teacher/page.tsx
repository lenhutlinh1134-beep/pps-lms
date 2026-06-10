import Link from "next/link";
import { Users, Video, ClipboardCheck, BarChart3, Plus, GraduationCap, Calendar, Info, Activity, MessageSquarePlus } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { Card, Chip } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatTile } from "@/components/EmptyState";
import { DEMO_CLASSES, DEMO_TEACHER_STATS, DEMO_TEACHER_NAME } from "@/lib/demo-data";

const quickActions = [
  { icon: Users,          label: "Tạo lớp mới",   desc: "Trường, lớp, năm học…",     color: "text-primary",   bg: "bg-primary-fixed" },
  { icon: Video,          label: "Đăng bài giảng", desc: "Video & file lý thuyết",    color: "text-secondary", bg: "bg-secondary-fixed" },
  { icon: ClipboardCheck, label: "Điểm danh",      desc: "Ghi nhận có mặt / vắng",   color: "text-tertiary",  bg: "bg-tertiary-fixed" },
  { icon: BarChart3,      label: "Xem báo cáo",   desc: "Tiến trình & cảnh báo",     color: "text-primary",   bg: "bg-primary-fixed" },
  { icon: Activity,       label: "Giám sát",       desc: "Học sinh đang online",       color: "text-secondary", bg: "bg-secondary-fixed" },
  { icon: MessageSquarePlus, label: "Phản hồi PH", desc: "Tin nhắn từ phụ huynh",   color: "text-tertiary",  bg: "bg-tertiary-fixed" },
];

export default function ShowcaseTeacherPage() {
  return (
    <DashboardShell role="teacher" userName={DEMO_TEACHER_NAME}>
      <div className="mx-auto flex max-w-5xl flex-col gap-lg">
        {/* Demo banner */}
        <div className="flex items-start gap-3 rounded-xl border border-secondary/20 bg-secondary-fixed px-4 py-3">
          <Info size={18} className="mt-0.5 shrink-0 text-secondary" />
          <div className="flex-1 text-body-md text-on-surface">
            <span className="font-semibold text-secondary">Chế độ xem thử — </span>
            Dữ liệu minh hoạ, không ảnh hưởng hệ thống thật.{" "}
            <Link href="/login" className="font-semibold text-secondary underline">Đăng nhập thật →</Link>
          </div>
          <Link href="/showcase" className="shrink-0 text-label-md text-on-surface-variant hover:text-on-surface">
            ← Trang demo
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div>
            <h1 className="text-display-lg">Bảng điều khiển</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Quản lý lớp học, bài giảng và theo dõi học sinh.
            </p>
          </div>
          <Button>
            <Plus size={20} /> Tạo lớp mới
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-md lg:grid-cols-4">
          <StatTile label="Lớp đang dạy"  value={`${DEMO_TEACHER_STATS.classes}`} />
          <StatTile label="Tổng học sinh" value={`${DEMO_TEACHER_STATS.students}`} />
          <StatTile label="Đang online"   value={`${DEMO_TEACHER_STATS.online}`}  hint="Theo thời gian thực" />
          <StatTile label="Cảnh báo"      value={`${DEMO_TEACHER_STATS.flags}`}   hint="Học sinh cần chú ý" />
        </div>

        {/* Quick actions */}
        <section>
          <h2 className="mb-md text-headline-sm">Thao tác nhanh</h2>
          <div className="grid grid-cols-2 gap-md lg:grid-cols-3">
            {quickActions.map((a) => (
              <Card key={a.label} interactive padding="md" className="flex h-full flex-col gap-sm">
                <span className={`flex h-11 w-11 items-center justify-center rounded-md ${a.bg} ${a.color}`}>
                  <a.icon size={22} />
                </span>
                <div>
                  <p className="text-body-md font-semibold">{a.label}</p>
                  <p className="text-label-sm text-on-surface-variant">{a.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Classes */}
        <section>
          <div className="mb-md flex items-center justify-between">
            <h2 className="text-headline-sm">Lớp của tôi</h2>
            <span className="text-label-md font-semibold text-primary">Xem tất cả</span>
          </div>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
            {DEMO_CLASSES.map((c) => (
              <Card key={c.id} interactive className="flex h-full flex-col gap-md">
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
            ))}

            {/* Thêm lớp mới card */}
            <Card interactive className="flex h-full cursor-pointer flex-col items-center justify-center gap-md border-2 border-dashed border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container">
                <Plus size={24} />
              </span>
              <p className="text-body-md font-semibold">Tạo lớp mới</p>
            </Card>
          </div>
        </section>

        {/* Students overview */}
        <section>
          <h2 className="mb-md text-headline-sm">Học sinh cần chú ý</h2>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            {[
              { name: "Hoàng Nhật Minh", issue: "Nghỉ học 2 buổi liên tiếp", class: "Lớp 6A", severity: "error" },
              { name: "Nguyễn Minh An", issue: "Tiến trình chậm hơn trung bình", class: "Lớp 6A", severity: "warning" },
            ].map((s) => (
              <Card key={s.name} padding="md" className="flex items-start gap-md">
                <span className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-on-primary ${s.severity === "error" ? "bg-error text-on-error" : "bg-secondary text-on-secondary"}`}>
                  {s.name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body-md font-semibold">{s.name}</p>
                  <p className="text-label-md text-on-surface-variant">{s.class} · {s.issue}</p>
                </div>
                <Button variant="ghost" size="sm">Nhận xét</Button>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
