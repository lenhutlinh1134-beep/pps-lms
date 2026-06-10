import Link from "next/link";
import {
  Users, Video, ClipboardCheck, BarChart3, Plus, GraduationCap, Calendar,
  FileQuestion, FolderOpen, MessagesSquare, ClipboardList, AlertTriangle,
  Clock, MapPin, ArrowRight, CheckCircle2,
} from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card, Chip } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatTile, EmptyState } from "@/components/EmptyState";
import { isDemoId, DEMO_CLASSES, DEMO_TEACHER_STATS, DEMO_SESSIONS } from "@/lib/demo-data";
import { NewsWidget } from "@/components/news/NewsWidget";

export const dynamic = "force-dynamic";

const quickActions = [
  { icon: Users, label: "Tạo lớp mới", desc: "Trường, lớp, năm học…", color: "text-primary", bg: "bg-primary-fixed", href: "/teacher/classes/new" },
  { icon: Video, label: "Đăng bài giảng", desc: "Video & file lý thuyết", color: "text-secondary", bg: "bg-secondary-fixed", href: "/teacher/lectures/new" },
  { icon: ClipboardList, label: "Giao bài tập", desc: "Trắc nghiệm, tự luận", color: "text-tertiary", bg: "bg-tertiary-fixed", href: "/teacher/exercises/new-assignment" },
  { icon: ClipboardCheck, label: "Điểm danh", desc: "Ghi nhận có mặt / vắng", color: "text-primary", bg: "bg-primary-fixed", href: "/teacher/attendance" },
  { icon: FileQuestion, label: "Ngân hàng đề", desc: "Câu hỏi & đề thi", color: "text-secondary", bg: "bg-secondary-fixed", href: "/teacher/question-bank" },
  { icon: FolderOpen, label: "Kho tài liệu", desc: "Chia sẻ cho học sinh", color: "text-tertiary", bg: "bg-tertiary-fixed", href: "/teacher/library" },
  { icon: MessagesSquare, label: "Phản hồi PH", desc: "Trả lời phụ huynh", color: "text-primary", bg: "bg-primary-fixed", href: "/teacher/feedback" },
  { icon: BarChart3, label: "Xem báo cáo", desc: "Tiến trình & cảnh báo", color: "text-secondary", bg: "bg-secondary-fixed", href: "/teacher/reports" },
];

interface Overview { total_classes: number; total_students: number; online_now: number }

interface TodaySession {
  id: string;
  class_id: string;
  class_name: string;
  start_time: string;
  end_time: string;
  room: string | null;
}

interface TodoCounts { ungraded: number; pendingFeedback: number; flags: number }

/** day_of_week trong DB: 1=CN, 2=Thứ 2 … 7=Thứ 7 (xem migration 0008). */
const todayDow = () => new Date().getDay() + 1;

const fmtTime = (t: string) => t.slice(0, 5); // "08:00:00" → "08:00"

export default async function TeacherDashboard() {
  const profile = await requireRole("teacher");
  const demo = isDemoId(profile.id);

  let overview: Overview = { total_classes: 0, total_students: 0, online_now: 0 };
  let todaySessions: TodaySession[] = [];
  let todos: TodoCounts = { ungraded: 0, pendingFeedback: 0, flags: 0 };

  if (demo) {
    const dow = todayDow();
    todaySessions = DEMO_SESSIONS.filter((s) => s.day_of_week === dow).map((s) => ({
      id: s.id, class_id: s.class_id, class_name: s.class_name,
      start_time: s.start_time, end_time: s.end_time, room: s.room,
    }));
    todos = { ungraded: 3, pendingFeedback: 1, flags: DEMO_TEACHER_STATS.flags };
  } else {
    try {
      const supabase = await createClient();
      const { data } = await supabase.rpc("get_teacher_overview");
      if (data && Array.isArray(data) && data[0]) overview = data[0] as Overview;

      // Lấy lớp của GV 1 lần, dùng chung cho lịch hôm nay + việc cần xử lý (tránh N+1)
      const { data: ctRows } = await supabase
        .from("class_teachers")
        .select("class:classes(id, name)")
        .eq("teacher_id", profile.id);
      const myClasses = ((ctRows ?? []) as unknown as Array<{ class: { id: string; name: string } | { id: string; name: string }[] | null }>)
        .flatMap((r) => (Array.isArray(r.class) ? r.class : r.class ? [r.class] : []));
      const classIds = myClasses.map((c) => c.id);
      const nameById = new Map(myClasses.map((c) => [c.id, c.name]));

      if (classIds.length > 0) {
        const [sessRes, fbRes, ungradedRes] = await Promise.all([
          supabase
            .from("class_sessions")
            .select("id, class_id, start_time, end_time, room")
            .in("class_id", classIds)
            .eq("day_of_week", todayDow())
            .order("start_time"),
          supabase
            .from("parent_feedback")
            .select("id", { count: "exact", head: true })
            .in("class_id", classIds)
            .eq("status", "pending"),
          supabase
            .from("submissions")
            .select("id, assignment:assignments!inner(class_id)", { count: "exact", head: true })
            .is("score", null)
            .in("assignment.class_id", classIds),
        ]);
        todaySessions = ((sessRes.data ?? []) as Array<Omit<TodaySession, "class_name">>).map((s) => ({
          ...s,
          class_name: nameById.get(s.class_id) ?? "Lớp",
        }));
        todos = { ungraded: ungradedRes.count ?? 0, pendingFeedback: fbRes.count ?? 0, flags: 0 };
      }
    } catch { /* bỏ qua lỗi khi chưa cấu hình Supabase */ }
  }

  const stats = demo
    ? DEMO_TEACHER_STATS
    : { classes: overview.total_classes, students: overview.total_students, online: overview.online_now, flags: 0 };

  const todoItems = [
    { count: todos.ungraded, label: "bài nộp chưa chấm", href: "/teacher/exercises", icon: ClipboardList, color: "text-secondary", bg: "bg-secondary-fixed" },
    { count: todos.pendingFeedback, label: "phản hồi PH chưa trả lời", href: "/teacher/feedback", icon: MessagesSquare, color: "text-tertiary", bg: "bg-tertiary-fixed" },
    { count: todos.flags, label: "học sinh cần chú ý", href: "/teacher/reports", icon: AlertTriangle, color: "text-error", bg: "bg-error-container" },
  ].filter((t) => t.count > 0);

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

        {/* ── Hôm nay: lịch dạy + điểm danh 1 chạm ── */}
        <section>
          <div className="mb-md flex items-center justify-between">
            <h2 className="text-headline-sm">Lịch dạy hôm nay</h2>
            <Link href="/teacher/schedule" className="text-label-md font-semibold text-primary">Xem cả tuần</Link>
          </div>
          {todaySessions.length === 0 ? (
            <Card padding="md" className="flex items-center gap-md">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-tertiary-fixed text-tertiary">
                <CheckCircle2 size={22} />
              </span>
              <div>
                <p className="text-body-md font-semibold">Hôm nay không có lịch dạy</p>
                <p className="text-label-sm text-on-surface-variant">Tranh thủ soạn bài giảng hoặc chấm bài nhé.</p>
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-sm">
              {todaySessions.map((s) => (
                <Card key={s.id} padding="md" className="flex flex-wrap items-center gap-md">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary-fixed text-primary">
                    <Clock size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-md font-semibold">{s.class_name}</p>
                    <p className="flex flex-wrap items-center gap-md text-label-sm text-on-surface-variant">
                      <span>{fmtTime(s.start_time)} – {fmtTime(s.end_time)}</span>
                      {s.room && <span className="flex items-center gap-1"><MapPin size={12} /> {s.room}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-sm">
                    <Link href={`/teacher/classes/${s.class_id}?tab=attendance`}>
                      <Button size="sm">
                        <ClipboardCheck size={16} /> Điểm danh ngay
                      </Button>
                    </Link>
                    <Link
                      href={`/teacher/classes/${s.class_id}`}
                      className="hidden items-center gap-1 text-label-md font-semibold text-primary sm:flex"
                    >
                      Vào lớp <ArrowRight size={14} />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ── Việc cần xử lý ── */}
        {todoItems.length > 0 && (
          <section>
            <h2 className="mb-md text-headline-sm">Việc cần xử lý</h2>
            <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
              {todoItems.map((t) => (
                <Link key={t.label} href={t.href}>
                  <Card interactive padding="md" className="flex h-full items-center gap-md">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${t.bg} ${t.color}`}>
                      <t.icon size={22} />
                    </span>
                    <div>
                      <p className="text-headline-sm leading-none">{t.count}</p>
                      <p className="mt-xs text-label-sm text-on-surface-variant">{t.label}</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Thao tác nhanh */}
        <section>
          <h2 className="mb-md text-headline-sm">Thao tác nhanh</h2>
          <div className="grid grid-cols-2 gap-md lg:grid-cols-4">
            {quickActions.map((a) => (
              <Link key={a.label} href={a.href}>
                <Card interactive padding="md" className="flex h-full flex-col gap-sm">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-md ${a.bg} ${a.color}`}>
                    <a.icon size={22} />
                  </span>
                  <div>
                    <p className="text-body-md font-semibold">{a.label}</p>
                    <p className="text-label-sm text-on-surface-variant">{a.desc}</p>
                  </div>
                </Card>
              </Link>
            ))}
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
                      <div className="flex items-center gap-xs">
                        <span className="rounded-full bg-primary-fixed px-2.5 py-0.5 text-label-sm font-bold text-primary">
                          {c.level}
                        </span>
                        <Chip color="secondary">Chủ lớp</Chip>
                      </div>
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
