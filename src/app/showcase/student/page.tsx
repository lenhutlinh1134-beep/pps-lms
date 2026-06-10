import Link from "next/link";
import {
  Headphones, BookOpen, ListChecks, ArrowRight, Sparkles,
  Flame, Trophy, Clock, Target, Info,
} from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { StatCard, QuestItem, ContinueCard } from "@/components/dashboard/Widgets";

const MOCK_STATS = { minutes: 35, listens: 4, points: 820, streak: 7 };
const WEEKLY_GOAL_PCT = Math.round((MOCK_STATS.minutes / 60) * 100);

const learnCards = [
  { icon: Headphones, title: "Học từ kết nối", desc: "Luyện nghe & ghi nhớ từ vựng theo chủ đề.", href: "/showcase/student", bg: "bg-primary-fixed", color: "text-primary" },
  { icon: BookOpen, title: "Học lý thuyết", desc: "Xem bài giảng & video của giáo viên.", href: "/showcase/student", bg: "bg-secondary-fixed", color: "text-secondary" },
  { icon: ListChecks, title: "Làm bài tập", desc: "Trắc nghiệm & luyện tập theo bài.", href: "/showcase/student", bg: "bg-tertiary-fixed", color: "text-tertiary" },
];

const dailyQuests = [
  { title: "Hoàn thành 1 bài luyện nghe", points: 50, done: true },
  { title: "Xem 1 bài giảng lý thuyết", points: 30, done: true },
  { title: "Làm 1 bài tập nhanh", points: 100, done: false },
];

export default function ShowcaseStudentPage() {
  return (
    <DashboardShell role="student" userName="Nguyễn Minh An">
      <div className="mx-auto flex max-w-5xl flex-col gap-xl">
        {/* Demo banner */}
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary-fixed px-4 py-3">
          <Info size={18} className="mt-0.5 shrink-0 text-primary" />
          <div className="flex-1 text-body-md text-on-surface">
            <span className="font-semibold text-primary">Chế độ xem thử — </span>
            Dữ liệu minh hoạ, không ảnh hưởng hệ thống thật.{" "}
            <Link href="/login" className="font-semibold text-primary underline">Đăng nhập thật →</Link>
          </div>
          <Link href="/showcase" className="shrink-0 text-label-md text-on-surface-variant hover:text-on-surface">
            ← Trang demo
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-display-lg">Xin chào, An 👋</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Bạn đã hoàn thành <span className="font-semibold text-primary">{WEEKLY_GOAL_PCT}%</span> mục tiêu tuần này.
            </p>
          </div>
          <Button>Tiếp tục học <ArrowRight size={16} /></Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-md lg:grid-cols-4">
          <StatCard icon={Clock} value={`${MOCK_STATS.minutes}`} label="Phút học / tuần" delta="Mục tiêu 60'" tone="primary" />
          <StatCard icon={Headphones} value={`${MOCK_STATS.listens}`} label="Lượt nghe / tuần" delta="Đạt mục tiêu ✓" tone="secondary" />
          <StatCard icon={Trophy} value={`${MOCK_STATS.points}`} label="Điểm tích luỹ" tone="tertiary" />
          <StatCard icon={Flame} value={`${MOCK_STATS.streak}`} label="Chuỗi ngày học 🔥" tone="secondary" />
        </div>

        {/* Gamification banner */}
        <Card className="flex items-center gap-md bg-premium text-white">
          <Sparkles size={28} className="shrink-0" />
          <div className="flex-1">
            <h3 className="font-display text-headline-sm text-white">Nhiệm vụ hôm nay</h3>
            <p className="text-body-md text-white/85">Hoàn thành 1 bài luyện nghe để giữ chuỗi học tập.</p>
          </div>
          <Button variant="ghost" className="hidden border-white/50 bg-white/10 text-white hover:bg-white/20 sm:flex">
            Bắt đầu
          </Button>
        </Card>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-xl lg:grid-cols-3">
          <div className="flex flex-col gap-md lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-headline-sm">Tiếp tục học</h2>
              <span className="text-label-md font-semibold text-primary">Xem tất cả</span>
            </div>
            <ContinueCard href="/showcase/student" title="Luyện nghe — Học từ kết nối" meta="11 chủ đề · 3/4 bài hôm nay" progress={58} tone="primary" />
            <ContinueCard href="/showcase/student" title="Bài giảng lý thuyết" meta="Present Simple — đang học" progress={30} tone="secondary" />
            <div className="mt-sm grid grid-cols-1 gap-md sm:grid-cols-3">
              {learnCards.map((c) => (
                <Card key={c.title} interactive className="flex h-full flex-col gap-md">
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
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-xl">
            <Card className="flex flex-col items-center gap-md text-center">
              <h3 className="self-start text-headline-sm">Mục tiêu tuần</h3>
              <ProgressRing value={WEEKLY_GOAL_PCT} sublabel="hoàn thành" size={140} />
              <p className="text-body-md text-on-surface-variant">Học thêm 25 phút để đạt mục tiêu tuần!</p>
              <div className="grid w-full grid-cols-2 gap-md">
                <div className="rounded-md bg-surface-container-low p-md text-center">
                  <p className="flex items-center justify-center gap-1 font-display text-headline-sm text-secondary">
                    <Flame size={18} /> {MOCK_STATS.streak}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">Ngày liên tục</p>
                </div>
                <div className="rounded-md bg-surface-container-low p-md text-center">
                  <p className="flex items-center justify-center gap-1 font-display text-headline-sm text-primary">
                    <Target size={18} /> #3
                  </p>
                  <p className="text-label-sm text-on-surface-variant">Xếp hạng lớp</p>
                </div>
              </div>
            </Card>

            <Card padding="lg">
              <div className="flex items-center justify-between">
                <h3 className="text-headline-sm">Nhiệm vụ ngày</h3>
                <span className="rounded-full bg-secondary-fixed px-2.5 py-1 text-label-md text-on-secondary-fixed">+180</span>
              </div>
              <div className="mt-sm divide-y divide-outline-variant/50">
                {dailyQuests.map((q) => (
                  <QuestItem key={q.title} title={q.title} points={q.points} done={q.done} />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
