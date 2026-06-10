import Link from "next/link";
import {
  Headphones, BookOpen, ListChecks, ArrowRight, Sparkles,
  Flame, Trophy, Clock, Target,
} from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { StatCard, QuestItem, ContinueCard } from "@/components/dashboard/Widgets";
import { NewsWidget } from "@/components/news/NewsWidget";

export const dynamic = "force-dynamic";

interface WeeklyStats {
  study_minutes_week: number;
  listens_week: number;
  points_total: number;
  streak_days: number;
}

const learnCards = [
  {
    icon: Headphones,
    title: "Học từ kết nối",
    desc: "Luyện nghe & ghi nhớ từ vựng theo chủ đề.",
    href: "/student/listening",
    bg: "bg-primary-fixed", color: "text-primary",
  },
  {
    icon: BookOpen,
    title: "Học lý thuyết",
    desc: "Xem bài giảng & video của giáo viên.",
    href: "/student/lectures",
    bg: "bg-secondary-fixed", color: "text-secondary",
  },
  {
    icon: ListChecks,
    title: "Làm bài tập",
    desc: "Sắp ra mắt — trắc nghiệm & luyện tập.",
    href: "/student/exercises",
    bg: "bg-tertiary-fixed", color: "text-tertiary",
  },
];

// Nhiệm vụ ngày (gamification) — bám thiết kế Stitch. Trạng thái done lấy từ log thật sau này.
const dailyQuests = [
  { title: "Hoàn thành 1 bài luyện nghe", points: 50, done: false },
  { title: "Xem 1 bài giảng lý thuyết", points: 30, done: false },
  { title: "Làm 1 bài tập nhanh", points: 100, done: false },
];

const WEEKLY_GOAL_MINUTES = 60; // Mục tiêu 60 phút/tuần

export default async function StudentDashboard() {
  const profile = await requireRole("student");
  const firstName = (profile.full_name || "bạn").split(" ").slice(-1)[0];

  // Lấy số liệu thật từ student_logs
  let stats: WeeklyStats = { study_minutes_week: 0, listens_week: 0, points_total: 0, streak_days: 0 };
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_my_weekly_stats");
    if (data && Array.isArray(data) && data[0]) stats = data[0] as WeeklyStats;
  } catch { /* bỏ qua lỗi khi chưa cấu hình Supabase */ }

  const weeklyGoalPct = Math.min(100, Math.round((stats.study_minutes_week / WEEKLY_GOAL_MINUTES) * 100));
  const streakDays = stats.streak_days;
  const classRank = "—";

  return (
    <DashboardShell role="student" userName={profile.full_name || "Học sinh"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-xl">
        {/* ===== Lời chào + mục tiêu tuần ===== */}
        <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-display-lg">Xin chào, {firstName} 👋</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Bạn đã hoàn thành <span className="font-semibold text-primary">{weeklyGoalPct}%</span> mục tiêu tuần này.
            </p>
          </div>
          <Link href="/student/listening">
            <Button>Tiếp tục học <ArrowRight size={16} /></Button>
          </Link>
        </div>

        {/* ===== Thống kê nhanh ===== */}
        <div className="grid grid-cols-2 gap-md lg:grid-cols-4">
          <StatCard icon={Clock} value={`${stats.study_minutes_week}`} label="Phút học / tuần" delta="Mục tiêu 60'" tone="primary" />
          <StatCard icon={Headphones} value={`${stats.listens_week}`} label="Lượt nghe / tuần" delta={stats.listens_week >= 3 ? "Đạt mục tiêu ✓" : "Mục tiêu ≥ 3 bài"} tone="secondary" />
          <StatCard icon={Trophy} value={`${stats.points_total}`} label="Điểm tích luỹ" tone="tertiary" />
          <StatCard icon={Flame} value={`${streakDays}`} label="Chuỗi ngày học 🔥" tone="secondary" />
        </div>

        {/* ===== Nhiệm vụ hôm nay (banner gamification) ===== */}
        <Card className="flex items-center gap-md bg-premium text-white">
          <Sparkles size={28} className="shrink-0" />
          <div className="flex-1">
            <h3 className="font-display text-headline-sm text-white">Nhiệm vụ hôm nay</h3>
            <p className="text-body-md text-white/85">Hoàn thành 1 bài luyện nghe để giữ chuỗi học tập.</p>
          </div>
          <Link href="/student/listening" className="hidden sm:block">
            <Button variant="ghost" className="border-white/50 bg-white/10 text-white hover:bg-white/20">
              Bắt đầu
            </Button>
          </Link>
        </Card>

        {/* ===== Lưới chính: Tiếp tục học + Mục tiêu/Nhiệm vụ ===== */}
        <div className="grid grid-cols-1 gap-xl lg:grid-cols-3">
          {/* Cột trái: Tiếp tục học */}
          <div className="flex flex-col gap-md lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-headline-sm">Tiếp tục học</h2>
              <Link href="/student/listening" className="text-label-md font-semibold text-primary">
                Xem tất cả
              </Link>
            </div>
            <ContinueCard
              href="/student/listening"
              title="Luyện nghe — Học từ kết nối"
              meta="11 chủ đề · bắt đầu ngay"
              progress={0}
              tone="primary"
            />
            <ContinueCard
              href="/student/lectures"
              title="Bài giảng lý thuyết"
              meta="Video & tài liệu từ giáo viên"
              progress={0}
              tone="secondary"
            />

            {/* Các khu vực học */}
            <div className="mt-sm grid grid-cols-1 gap-md sm:grid-cols-3">
              {learnCards.map((c) => (
                <Link key={c.title} href={c.href}>
                  <Card interactive className="flex h-full flex-col gap-md">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-md ${c.bg} ${c.color}`}>
                      <c.icon size={24} />
                    </span>
                    <div className="flex-1">
                      <h3 className="text-headline-sm">{c.title}</h3>
                      <p className="mt-xs text-body-md text-on-surface-variant">{c.desc}</p>
                    </div>
                    <span className="flex items-center gap-1 text-label-md font-semibold text-primary">
                      Vào học <ArrowRight size={16} />
                    </span>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Cột phải: Mục tiêu tuần + Nhiệm vụ ngày + Tin tức */}
          <div className="flex flex-col gap-xl">
            {/* Mục tiêu tuần */}
            <Card className="flex flex-col items-center gap-md text-center">
              <h3 className="self-start text-headline-sm">Mục tiêu tuần</h3>
              <ProgressRing value={weeklyGoalPct} sublabel="hoàn thành" size={140} />
              <p className="text-body-md text-on-surface-variant">
                Học thêm để đạt mục tiêu tuần này nhé!
              </p>
              <div className="grid w-full grid-cols-2 gap-md">
                <div className="rounded-md bg-surface-container-low p-md text-center">
                  <p className="flex items-center justify-center gap-1 font-display text-headline-sm text-secondary">
                    <Flame size={18} /> {streakDays}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">Ngày liên tục</p>
                </div>
                <div className="rounded-md bg-surface-container-low p-md text-center">
                  <p className="flex items-center justify-center gap-1 font-display text-headline-sm text-primary">
                    <Target size={18} /> {classRank}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">Xếp hạng lớp</p>
                </div>
              </div>
            </Card>

            {/* Nhiệm vụ ngày */}
            <Card padding="lg">
              <div className="flex items-center justify-between">
                <h3 className="text-headline-sm">Nhiệm vụ ngày</h3>
                <span className="rounded-full bg-secondary-fixed px-2.5 py-1 text-label-md text-on-secondary-fixed">
                  +180
                </span>
              </div>
              <div className="mt-sm divide-y divide-outline-variant/50">
                {dailyQuests.map((q) => (
                  <QuestItem key={q.title} title={q.title} points={q.points} done={q.done} />
                ))}
              </div>
            </Card>

            {/* Tin tức & Thông báo */}
            <NewsWidget role="student" />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
