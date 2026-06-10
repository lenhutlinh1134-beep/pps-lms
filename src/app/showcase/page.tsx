import Link from "next/link";
import {
  GraduationCap, ArrowRight, CheckCircle2, Headphones, BookOpen,
  ListChecks, Users, Video, BarChart3, Baby, MessageSquare,
  Calendar, Activity, Shield, Sparkles,
} from "lucide-react";

const roles = [
  {
    id: "student",
    title: "Học sinh",
    emoji: "🎓",
    colorClass: "text-primary",
    bgClass: "bg-primary-fixed",
    borderClass: "hover:border-primary/40",
    desc: "Luyện nghe, học bài giảng, làm bài tập và theo dõi tiến trình mọi lúc mọi nơi.",
    features: [
      "Luyện nghe theo chủ đề với dữ liệu thật",
      "Xem video bài giảng từ giáo viên",
      "Làm bài tập trắc nghiệm tự chấm điểm",
      "Streak học tập & điểm tích lũy gamification",
      "Lịch học tự động hàng tuần",
      "Hỏi đáp trực tiếp dưới bài giảng",
    ],
    icons: [Headphones, BookOpen, ListChecks],
    href: "/showcase/student",
  },
  {
    id: "teacher",
    title: "Giáo viên",
    emoji: "👩‍🏫",
    colorClass: "text-secondary",
    bgClass: "bg-secondary-fixed",
    borderClass: "hover:border-secondary/40",
    desc: "Quản lý lớp học, đăng bài giảng, điểm danh và nhận xét học sinh dễ dàng.",
    features: [
      "Tạo và quản lý nhiều lớp học",
      "Đăng video & tài liệu bài giảng",
      "Điểm danh có mặt / vắng / muộn",
      "Viết nhận xét gửi phụ huynh",
      "Giám sát học sinh đang online",
      "Ngân hàng câu hỏi & tạo đề thi",
    ],
    icons: [Users, Video, BarChart3],
    href: "/showcase/teacher",
  },
  {
    id: "parent",
    title: "Phụ huynh",
    emoji: "👪",
    colorClass: "text-tertiary",
    bgClass: "bg-tertiary-fixed",
    borderClass: "hover:border-tertiary/40",
    desc: "Theo dõi tiến trình học tập của con, nhận thông báo và nhận xét từ giáo viên.",
    features: [
      "Xem lịch học hàng tuần của con",
      "Theo dõi điểm danh & tiến trình",
      "Nhận nhận xét trực tiếp từ giáo viên",
      "Cảnh báo thông minh khi con nghỉ nhiều",
      "Gửi phản hồi lại cho giáo viên",
      "Theo dõi nhiều con cùng lúc",
    ],
    icons: [Baby, MessageSquare, Calendar],
    href: "/showcase/parent",
  },
];

const highlights = [
  { icon: Shield, text: "Bảo mật phân quyền chặt chẽ — mỗi người chỉ thấy dữ liệu của mình" },
  { icon: Activity, text: "Giám sát học sinh online theo thời gian thực" },
  { icon: Sparkles, text: "Hệ thống gamification — streak & điểm thưởng tăng động lực học" },
];

export default function ShowcasePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="glass sticky top-0 z-30 flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-premium text-white">
            <GraduationCap size={22} />
          </span>
          <span className="font-display text-headline-sm">PPS LMS</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-secondary-fixed px-3 py-1.5 text-label-md font-semibold text-on-secondary-fixed sm:block">
            Bản xem thử
          </span>
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90"
          >
            Đăng nhập <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16 md:px-12">
        {/* Hero */}
        <div className="mb-16 flex flex-col items-center gap-6 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-premium text-white shadow-card-hover">
            <GraduationCap size={40} />
          </span>
          <div>
            <h1 className="font-display text-display-lg leading-tight">
              PPS LMS
            </h1>
            <p className="mt-2 text-headline-sm text-on-surface-variant">
              Hệ thống học tiếng Anh online · Trung tâm Anh ngữ PPS Vietnam
            </p>
          </div>
          <p className="max-w-2xl text-body-lg text-on-surface-variant">
            Kết nối 3 bên: <strong>Học sinh</strong> luyện tập — <strong>Giáo viên</strong> quản lý — <strong>Phụ huynh</strong> theo dõi.
            Mọi thứ trong một nền tảng, trên mọi thiết bị.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {roles.map((r) => (
              <Link
                key={r.id}
                href={r.href}
                className="flex items-center gap-2 rounded-xl bg-surface-container px-4 py-2 text-body-md font-semibold transition-colors hover:bg-primary hover:text-on-primary"
              >
                <span>{r.emoji}</span> Xem demo {r.title}
              </Link>
            ))}
          </div>
        </div>

        {/* Role Cards */}
        <section className="mb-16">
          <h2 className="mb-8 text-center text-headline-sm text-on-surface-variant">
            3 giao diện — 1 hệ thống
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {roles.map((r) => (
              <div
                key={r.id}
                className={`flex flex-col rounded-2xl border-2 border-outline-variant bg-surface p-6 transition-all ${r.borderClass} hover:shadow-card-hover`}
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className={`flex h-14 w-14 items-center justify-center rounded-xl text-3xl ${r.bgClass}`}>
                    {r.emoji}
                  </span>
                  <div>
                    <h3 className="font-display text-headline-sm">{r.title}</h3>
                    <p className="text-label-md text-on-surface-variant">Góc nhìn đầy đủ</p>
                  </div>
                </div>

                <p className="mb-5 text-body-md text-on-surface-variant">{r.desc}</p>

                <ul className="mb-6 flex flex-1 flex-col gap-2">
                  {r.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-body-md">
                      <CheckCircle2 size={17} className={`mt-0.5 shrink-0 ${r.colorClass}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={r.href}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 text-body-md font-semibold transition-opacity hover:opacity-90 ${
                    r.id === "student"
                      ? "bg-primary text-on-primary"
                      : r.id === "teacher"
                      ? "bg-secondary text-on-secondary"
                      : "bg-tertiary text-on-tertiary"
                  }`}
                >
                  Xem giao diện {r.title} <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Highlights */}
        <section className="mb-16 rounded-2xl bg-surface-container p-8">
          <h2 className="mb-6 text-center font-display text-headline-sm">Điểm nổi bật</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {highlights.map((h) => (
              <div key={h.text} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                  <h.icon size={20} />
                </span>
                <p className="text-body-md text-on-surface">{h.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="flex flex-col items-center gap-4 text-center">
          <h2 className="font-display text-headline-sm">Sẵn sàng sử dụng?</h2>
          <p className="text-body-lg text-on-surface-variant">
            Đăng nhập bằng tài khoản được cấp bởi trung tâm PPS.
          </p>
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-xl bg-premium px-8 py-3 text-body-lg font-semibold text-white shadow-card-hover transition-opacity hover:opacity-90"
          >
            Đăng nhập ngay <ArrowRight size={18} />
          </Link>
        </section>
      </main>
    </div>
  );
}
