"use client";

import { useRouter } from "next/navigation";
import { GraduationCap, Users, Baby, Building2, ArrowRight, Link2 } from "lucide-react";
import { DEMO_COOKIE } from "@/lib/demo";

// ─── Nhân vật trong câu chuyện demo ──────────────────────────────────────────

const STORY = {
  manager: {
    name: "Anh Nguyễn Văn Tùng",
    title: "Quản lý PPS Vietnam",
    avatar: "T",
    avatarColor: "bg-primary text-on-primary",
    role: "manager" as const,
    icon: Building2,
    accent: "border-primary",
    headerBg: "bg-primary-fixed",
    headerText: "text-primary",
    badge: "bg-primary text-on-primary",
    description: "Điều hành toàn bộ trung tâm — xem lịch dạy của tất cả GV, thống kê chất lượng, đăng thông báo cho mọi người.",
    sees: [
      "📊 Tổng quan: 12 lớp · 248 HS · 8 GV",
      "📅 Lịch dạy tổng quan tất cả lớp",
      "📢 Đăng tin tức cho HS / PH / GV",
      "⚠️ Alert: 3 phản hồi PH chờ xử lý",
      "📈 Thống kê chất lượng toàn trung tâm",
    ],
    linkedTo: ["Giám sát lịch của Cô Hà", "Xem phản hồi PH về con An"],
  },
  teacher: {
    name: "Cô Trần Thu Hà",
    title: "Giáo viên Tiếng Anh",
    avatar: "H",
    avatarColor: "bg-secondary text-on-secondary",
    role: "teacher" as const,
    icon: Users,
    accent: "border-secondary",
    headerBg: "bg-secondary-fixed",
    headerText: "text-secondary",
    badge: "bg-secondary text-on-secondary",
    description: "Dạy 2 lớp (6A & 7B) với 13 học sinh. Đăng bài giảng, điểm danh, phát hiện HS ít học, nhận phản hồi từ phụ huynh.",
    sees: [
      "📚 Lớp 6A — 8 HS | Lớp 7B — 5 HS",
      "📅 Lịch dạy: T2/T4/T6 lớp 6A · T3/T5 lớp 7B",
      "🚨 Flag: Nhật Minh nghỉ 2 buổi liên tiếp",
      "📝 Nhận xét: Minh An tiến bộ phát âm",
      "💬 1 phản hồi PH chờ trả lời",
    ],
    linkedTo: ["Dạy An trong lớp 6A", "Nhận phản hồi từ PH của An"],
  },
  student: {
    name: "Nguyễn Minh An",
    title: "Học sinh · Lớp 6A",
    avatar: "A",
    avatarColor: "bg-tertiary text-on-tertiary",
    role: "student" as const,
    icon: GraduationCap,
    accent: "border-tertiary",
    headerBg: "bg-tertiary-fixed",
    headerText: "text-tertiary",
    badge: "bg-tertiary text-on-tertiary",
    description: "Học sinh lớp 6A, đang luyện tiếng Anh giao tiếp. Xem bài giảng của Cô Hà, luyện nghe, làm bài tập, theo dõi lịch học.",
    sees: [
      "📅 Lịch học cố định: T2 · T4 · T6 · 08:00 · P.201",
      "🎧 Đã nghe 3/11 chủ đề tuần này",
      "📖 2 bài giảng mới từ Cô Hà",
      "✓ Điểm danh: 7 buổi có mặt / 8 buổi",
      "🏆 Streak 5 ngày · 180 điểm tích lũy",
    ],
    linkedTo: ["Học trong lớp Cô Hà dạy", "PH theo dõi tiến trình của An"],
  },
  parent: {
    name: "Chị Lê Thị Mai",
    title: "Phụ huynh của Minh An",
    avatar: "M",
    avatarColor: "bg-error text-on-error",
    role: "parent" as const,
    icon: Baby,
    accent: "border-error",
    headerBg: "bg-error-container",
    headerText: "text-on-error-container",
    badge: "bg-error text-on-error",
    description: "Mẹ của Minh An. Theo dõi lịch học, điểm danh, tiến trình học và nhận cảnh báo từ hệ thống. Gửi phản hồi đến Cô Hà.",
    sees: [
      "📅 Lịch học con: T2/T4/T6 sáng · P.201",
      "📊 Tiến độ: 7/8 buổi có mặt tuần này",
      "⚠️ Cảnh báo: Nghe chưa đủ 3 bài/tuần",
      "💬 Đã gửi phản hồi Cô Hà · Chờ trả lời",
      "📢 Tin tức: Khai giảng hè 2026",
    ],
    linkedTo: ["Con đang học lớp Cô Hà", "Gửi phản hồi → Cô Hà trả lời"],
  },
};

const ORDER: (keyof typeof STORY)[] = ["manager", "teacher", "student", "parent"];

const FLOW = [
  { from: "Quản lý", to: "Giáo viên", desc: "Xem lịch dạy + thống kê lớp", arrow: "→" },
  { from: "Giáo viên", to: "Học sinh", desc: "Đăng bài · Điểm danh · Flag cảnh báo", arrow: "→" },
  { from: "Học sinh", to: "Phụ huynh", desc: "Điểm danh & tiến trình tự động cập nhật", arrow: "→" },
  { from: "Phụ huynh", to: "Giáo viên", desc: "Gửi phản hồi · Giáo viên trả lời", arrow: "⇄" },
  { from: "Quản lý", to: "Tất cả", desc: "Đăng tin tức · Nhận cảnh báo HS nguy cơ", arrow: "📢" },
];

export default function TestDrivePage() {
  const router = useRouter();

  function enterAs(role: keyof typeof STORY) {
    document.cookie = `${DEMO_COOKIE}=${role}; path=/; max-age=86400; samesite=lax`;
    router.push(`/${role}`);
    router.refresh();
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-xl px-margin-mobile py-lg md:px-lg">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-display-lg">Test Drive — PPS LMS</h1>
        <p className="mt-sm text-body-lg text-on-surface-variant">
          Một trung tâm · Bốn góc nhìn. Nhấn vào vai trò để vào thử ngay.
        </p>
      </div>

      {/* Relationship flow */}
      <div className="rounded-xl border border-outline-variant bg-surface-container p-md">
        <p className="mb-md flex items-center gap-2 text-label-md font-semibold text-on-surface-variant">
          <Link2 size={14} /> Quan hệ tác động giữa 4 vai trò
        </p>
        <div className="flex flex-wrap gap-sm">
          {FLOW.map((f) => (
            <div key={f.from + f.to} className="flex items-center gap-xs rounded-full bg-surface-container-lowest px-md py-xs text-label-sm text-on-surface">
              <span className="font-semibold text-primary">{f.from}</span>
              <span className="text-on-surface-variant">{f.arrow}</span>
              <span className="font-semibold text-secondary">{f.to}</span>
              <span className="hidden text-on-surface-variant sm:inline">· {f.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-4">
        {ORDER.map((key) => {
          const p = STORY[key];
          const Icon = p.icon;
          return (
            <div
              key={key}
              className={`flex flex-col overflow-hidden rounded-2xl border-2 ${p.accent} bg-surface shadow-card-hover transition-transform hover:-translate-y-1`}
            >
              {/* Header */}
              <div className={`${p.headerBg} px-lg py-md`}>
                <div className="flex items-center gap-md">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${p.avatarColor} font-display text-headline-sm font-bold`}>
                    {p.avatar}
                  </span>
                  <div className="min-w-0">
                    <p className={`truncate text-body-md font-bold ${p.headerText}`}>{p.name}</p>
                    <p className="text-label-sm text-on-surface-variant">{p.title}</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col gap-md p-lg">
                <p className="text-body-md text-on-surface-variant">{p.description}</p>

                {/* What they see */}
                <ul className="flex flex-col gap-xs">
                  {p.sees.map((item) => (
                    <li key={item} className="text-label-md text-on-surface">{item}</li>
                  ))}
                </ul>

                {/* Linked to */}
                <div className="mt-auto border-t border-outline-variant pt-md">
                  <p className="mb-xs text-label-sm font-semibold text-on-surface-variant">Liên kết với:</p>
                  {p.linkedTo.map((link) => (
                    <p key={link} className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                      <Link2 size={10} className="shrink-0" /> {link}
                    </p>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => enterAs(key)}
                  className={`flex w-full items-center justify-center gap-sm rounded-xl px-md py-3 text-body-md font-semibold transition-opacity hover:opacity-90 ${p.badge}`}
                >
                  <Icon size={18} />
                  Vào thử · {p.name.split(" ").slice(-1)[0]}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick navigation */}
      <div className="rounded-xl border border-outline-variant bg-surface-container p-lg">
        <p className="mb-md text-headline-sm">Kiểm tra nhanh các trang quan trọng</p>
        <div className="grid grid-cols-2 gap-sm sm:grid-cols-3 lg:grid-cols-4">
          {[
            { label: "📅 Lịch học (HS)", href: "/student/schedule", role: "student" },
            { label: "✓ Điểm danh (HS)", href: "/student/attendance", role: "student" },
            { label: "📅 Lịch dạy (GV)", href: "/teacher/schedule", role: "teacher" },
            { label: "💬 Phản hồi PH (GV)", href: "/teacher/feedback", role: "teacher" },
            { label: "📅 Lịch học con (PH)", href: "/parent/schedule", role: "parent" },
            { label: "⚠️ Cảnh báo (PH)", href: "/parent/alerts", role: "parent" },
            { label: "📊 Tiến độ (PH)", href: "/parent/progress", role: "parent" },
            { label: "📅 Lịch GV (QL)", href: "/manager/schedule", role: "manager" },
            { label: "📢 Tin tức (QL)", href: "/manager/news", role: "manager" },
            { label: "📈 Thống kê (QL)", href: "/manager/stats", role: "manager" },
            { label: "🎧 Luyện nghe (HS)", href: "/student/listening", role: "student" },
            { label: "🚨 Báo cáo Flag (GV)", href: "/teacher/reports", role: "teacher" },
          ].map((item) => (
            <button
              key={item.href}
              onClick={() => {
                document.cookie = `${DEMO_COOKIE}=${item.role}; path=/; max-age=86400; samesite=lax`;
                router.push(item.href);
                router.refresh();
              }}
              className="rounded-lg bg-surface-container-lowest px-md py-sm text-left text-label-md font-medium text-on-surface transition-colors hover:bg-primary-fixed hover:text-primary"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-label-sm text-on-surface-variant">
        Dữ liệu hoàn toàn giả · Không lưu vào database · Tắt tự động khi deploy production
      </p>
    </main>
  );
}
