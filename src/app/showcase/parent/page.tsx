import Link from "next/link";
import {
  Baby, Plus, MessageSquare, GraduationCap, ArrowRight,
  ClipboardCheck, Wifi, WifiOff, Calendar, BarChart3, Info, AlertTriangle,
} from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatTile } from "@/components/EmptyState";

const DEMO_CHILDREN = [
  {
    id: "dc1",
    full_name: "Nguyễn Bảo An",
    class_names: ["Lớp 6A — Tiếng Anh giao tiếp"],
    present: 3, absent: 0, online: true,
  },
  {
    id: "dc2",
    full_name: "Nguyễn Minh Khoa",
    class_names: ["Lớp 7B — Luyện thi PET"],
    present: 2, absent: 1, online: false,
  },
];

const DEMO_NOTES = [
  {
    id: "dn1", student_name: "Bảo An",
    note: "Bảo An tiến bộ rõ phần luyện nghe, phát âm tự tin hơn. Cần luyện thêm thì quá khứ.",
    date: "10/06/2026",
  },
  {
    id: "dn2", student_name: "Minh Khoa",
    note: "Minh Khoa cần ôn lại phần Listening Part 2, hay nhầm chi tiết. Nhờ phụ huynh nhắc luyện thêm ở nhà.",
    date: "09/06/2026",
  },
  {
    id: "dn3", student_name: "Bảo An",
    note: "Bảo An làm bài tập về nhà đầy đủ, tích cực phát biểu trong giờ học. Khen ngợi!",
    date: "07/06/2026",
  },
];

const DEMO_SCHEDULE = [
  { day: "Thứ 2 & Thứ 4", time: "08:00 – 09:30", room: "P.201", child: "Bảo An", class: "Lớp 6A" },
  { day: "Thứ 3 & Thứ 5", time: "14:00 – 15:45", room: "P.305", child: "Minh Khoa", class: "Lớp 7B" },
];

export default function ShowcaseParentPage() {
  return (
    <DashboardShell role="parent" userName="Chị Nguyễn Lan Anh">
      <div className="mx-auto flex max-w-5xl flex-col gap-lg">
        {/* Demo banner */}
        <div className="flex items-start gap-3 rounded-xl border border-tertiary/20 bg-tertiary-fixed px-4 py-3">
          <Info size={18} className="mt-0.5 shrink-0 text-tertiary" />
          <div className="flex-1 text-body-md text-on-surface">
            <span className="font-semibold text-tertiary">Chế độ xem thử — </span>
            Dữ liệu minh hoạ, không ảnh hưởng hệ thống thật.{" "}
            <Link href="/login" className="font-semibold text-tertiary underline">Đăng nhập thật →</Link>
          </div>
          <Link href="/showcase" className="shrink-0 text-label-md text-on-surface-variant hover:text-on-surface">
            ← Trang demo
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div>
            <h1 className="text-display-lg">Theo dõi con</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Nắm bắt tiến trình học, điểm danh và nhận xét của giáo viên.
            </p>
          </div>
          <Button variant="ghost">
            <Plus size={20} /> Liên kết con
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-md lg:grid-cols-3">
          <StatTile label="Con đang theo dõi" value="2" />
          <StatTile label="Buổi có mặt / tuần" value="5" />
          <StatTile label="Nhận xét mới (2 ngày)" value="2" />
        </div>

        {/* Cảnh báo */}
        <Card padding="md" className="flex items-start gap-md border border-error-container bg-error-container/30">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-error" />
          <div className="flex-1">
            <p className="text-body-md font-semibold text-on-error-container">Cảnh báo: Minh Khoa vắng 1 buổi tuần này</p>
            <p className="mt-1 text-label-md text-on-surface-variant">Nhắc con học bù bài học hôm đó nhé.</p>
          </div>
          <Button variant="ghost" size="sm">Xem chi tiết</Button>
        </Card>

        {/* Children cards */}
        <section>
          <div className="mb-md flex items-center justify-between">
            <h2 className="text-headline-sm">Con của tôi ({DEMO_CHILDREN.length})</h2>
            <span className="text-label-md font-semibold text-primary">Quản lý</span>
          </div>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            {DEMO_CHILDREN.map((c) => (
              <Card key={c.id} className="flex flex-col gap-md">
                <div className="flex items-center gap-md">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-display text-headline-sm font-bold text-on-primary-fixed">
                    {c.full_name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-md font-semibold">{c.full_name}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-medium ${c.online ? "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-surface-container text-on-surface-variant"}`}>
                      {c.online ? <Wifi size={12} /> : <WifiOff size={12} />}
                      {c.online ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
                <p className="flex items-center gap-1 text-label-md text-on-surface-variant">
                  <GraduationCap size={14} /> {c.class_names[0]}
                </p>
                <div className="flex gap-sm text-label-sm">
                  <span className="flex items-center gap-1 text-tertiary">
                    <ClipboardCheck size={12} /> {c.present} có mặt
                  </span>
                  {c.absent > 0 && (
                    <span className="text-error">{c.absent} vắng</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Schedule */}
        <section>
          <div className="mb-md flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            <h2 className="text-headline-sm">Lịch học tuần này</h2>
          </div>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            {DEMO_SCHEDULE.map((s) => (
              <Card key={s.child + s.day} padding="md" className="flex flex-col gap-sm">
                <div className="flex items-center justify-between">
                  <span className="text-label-md font-semibold text-primary">{s.day}</span>
                  <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-on-primary-fixed">{s.child}</span>
                </div>
                <p className="text-body-md font-medium">{s.class}</p>
                <div className="flex items-center gap-2 text-label-md text-on-surface-variant">
                  <span>🕐 {s.time}</span>
                  <span>·</span>
                  <span>📍 {s.room}</span>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Progress link */}
        <section>
          <div className="mb-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-primary" />
              <h2 className="text-headline-sm">Tiến độ học tập</h2>
            </div>
            <span className="flex items-center gap-1 text-label-md font-semibold text-primary">
              Xem chi tiết <ArrowRight size={14} />
            </span>
          </div>
          <Card padding="md" className="flex items-center gap-md">
            <div className="flex-1">
              <p className="text-body-md font-semibold">Bảo An — Lớp 6A</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-container">
                <div className="h-full w-[72%] rounded-full bg-primary" />
              </div>
              <p className="mt-1 text-label-sm text-on-surface-variant">72% mục tiêu tuần · 4 bài đã học</p>
            </div>
          </Card>
          <Card padding="md" className="mt-sm flex items-center gap-md">
            <div className="flex-1">
              <p className="text-body-md font-semibold">Minh Khoa — Lớp 7B</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-container">
                <div className="h-full w-[45%] rounded-full bg-secondary" />
              </div>
              <p className="mt-1 text-label-sm text-on-surface-variant">45% mục tiêu tuần · 2 bài đã học</p>
            </div>
          </Card>
        </section>

        {/* Teacher notes */}
        <section>
          <div className="mb-md flex items-center justify-between">
            <h2 className="text-headline-sm">Nhận xét từ giáo viên</h2>
            <span className="flex items-center gap-1 text-label-md font-semibold text-primary">
              Xem tất cả <ArrowRight size={14} />
            </span>
          </div>
          <div className="flex flex-col gap-sm">
            {DEMO_NOTES.map((n) => (
              <Card key={n.id} padding="md" className="flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-body-md font-semibold text-primary">{n.student_name}</span>
                  <span className="shrink-0 text-label-sm text-on-surface-variant">{n.date}</span>
                </div>
                <p className="line-clamp-2 text-body-md text-on-surface">{n.note}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Feedback CTA */}
        <Card padding="md" className="flex items-center gap-md bg-surface-container">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-secondary-fixed text-secondary">
            <MessageSquare size={22} />
          </span>
          <div className="flex-1">
            <p className="text-body-md font-semibold">Gửi phản hồi cho giáo viên</p>
            <p className="text-label-md text-on-surface-variant">Chia sẻ băn khoăn hoặc góp ý về quá trình học của con.</p>
          </div>
          <Button variant="ghost" size="sm">Gửi tin</Button>
        </Card>
      </div>
    </DashboardShell>
  );
}
