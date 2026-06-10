"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  GraduationCap, LogOut, Home, Headphones, BookOpen, ListChecks,
  Users, Video, ClipboardCheck, BarChart3, Baby, MessageSquare, BookMarked,
  Activity, MessageCircle, Calendar, Library, Building2, FolderOpen, Settings,
  AlertTriangle, MessageSquarePlus, Newspaper, CalendarDays, CalendarOff, Database,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/supabase/auth";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV: Record<Role, NavItem[]> = {
  student: [
    { label: "Tổng quan", href: "/student", icon: Home },
    { label: "Lớp học", href: "/student/courses", icon: GraduationCap },
    { label: "Lịch học", href: "/student/schedule", icon: Calendar },
    { label: "Thư viện", href: "/student/library", icon: Library },
    { label: "Luyện nghe", href: "/student/listening", icon: Headphones },
    { label: "Bài tập", href: "/student/exercises", icon: ListChecks },
    { label: "Điểm danh", href: "/student/attendance", icon: ClipboardCheck },
    { label: "Nhắn tin", href: "/student/chat", icon: MessageCircle },
  ],
  teacher: [
    { label: "Tổng quan", href: "/teacher", icon: Home },
    { label: "Lớp học", href: "/teacher/classes", icon: Users },
    { label: "Lịch dạy", href: "/teacher/schedule", icon: Calendar },
    { label: "Bài giảng", href: "/teacher/lectures", icon: Video },
    { label: "Bài tập", href: "/teacher/exercises", icon: BookMarked },
    { label: "Kho tài liệu", href: "/teacher/library", icon: FolderOpen },
    { label: "Ngân hàng ĐT", href: "/teacher/question-bank", icon: Database },
    { label: "Phản hồi PH", href: "/teacher/feedback", icon: MessageSquarePlus },
    { label: "Xin nghỉ", href: "/teacher/leaves", icon: CalendarOff },
    { label: "Giám sát", href: "/teacher/monitor", icon: Activity },
    { label: "Nhắn tin", href: "/teacher/chat", icon: MessageCircle },
    { label: "Báo cáo", href: "/teacher/reports", icon: BarChart3 },
  ],
  manager: [
    { label: "Tổng quan", href: "/manager", icon: Home },
    { label: "Nhân viên", href: "/manager/staff", icon: Users },
    { label: "Lịch dạy", href: "/manager/schedule", icon: CalendarDays },
    { label: "Thống kê", href: "/manager/stats", icon: BarChart3 },
    { label: "Tin tức", href: "/manager/news", icon: Newspaper },
    { label: "Chương trình", href: "/manager/programs", icon: GraduationCap },
    { label: "Đơn nghỉ", href: "/manager/leaves", icon: CalendarOff },
    { label: "Cấu hình", href: "/manager/settings", icon: Settings },
  ],
  parent: [
    { label: "Tổng quan", href: "/parent", icon: Home },
    { label: "Con của tôi", href: "/parent/children", icon: Baby },
    { label: "Lịch học", href: "/parent/schedule", icon: Calendar },
    { label: "Tiến độ", href: "/parent/progress", icon: BarChart3 },
    { label: "Nhận xét", href: "/parent/notes", icon: MessageSquare },
    { label: "Cảnh báo", href: "/parent/alerts", icon: AlertTriangle },
    { label: "Phản hồi GV", href: "/parent/feedback", icon: MessageSquarePlus },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  student: "Học sinh",
  teacher: "Giáo viên",
  parent: "Phụ huynh",
  manager: "Quản lý",
};

export function DashboardShell({
  role,
  userName,
  children,
}: {
  role: Role;
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV[role];

  async function handleLogout() {
    // Xoá cookie cửa sau demo (nếu có)
    document.cookie = "pps_demo_role=; path=/; max-age=0; samesite=lax";
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      /* bỏ qua */
    }
    router.replace("/login");
    router.refresh();
  }

  const isActive = (href: string) =>
    href === `/${role}` ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-background">
      {/* ===== Sidebar (desktop) ===== */}
      <aside className="glass fixed inset-y-0 left-0 z-30 hidden w-64 flex-col p-lg md:flex">
        <Link href={`/${role}`} className="mb-xl flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-premium text-white">
            <GraduationCap size={22} />
          </span>
          <span className="font-display text-headline-sm">PPS LMS</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-xs">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-sm rounded-md px-4 py-3 text-body-md font-medium transition-colors",
                isActive(item.href)
                  ? "bg-primary text-on-primary shadow-card-hover"
                  : "text-on-surface-variant hover:bg-surface-container",
              )}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-sm rounded-md px-4 py-3 text-body-md font-medium text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
        >
          <LogOut size={20} /> Đăng xuất
        </button>
      </aside>

      {/* ===== Khu nội dung ===== */}
      <div className="md:pl-64">
        {/* Header */}
        <header className="glass sticky top-0 z-20 flex items-center justify-between px-margin-mobile py-md md:px-lg">
          <div className="flex items-center gap-2 md:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-premium text-white">
              <GraduationCap size={18} />
            </span>
            <span className="font-display text-headline-sm">PPS LMS</span>
          </div>
          <Link
            href={`/${role}/profile`}
            title="Hồ sơ cá nhân"
            className="ml-auto flex items-center gap-sm rounded-full p-1 pl-3 transition-colors hover:bg-surface-container"
          >
            <div className="text-right">
              <p className="text-body-md font-semibold leading-tight">{userName}</p>
              <p className="text-label-sm text-on-surface-variant">{ROLE_LABEL[role]}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed font-display text-body-md font-bold text-on-primary-fixed">
              {userName.charAt(0).toUpperCase()}
            </span>
          </Link>
        </header>

        {/* Nội dung trang */}
        <main className="px-margin-mobile py-lg pb-[96px] md:px-lg md:pb-lg">{children}</main>
      </div>

      {/* ===== Bottom nav (mobile, glassmorphic) ===== */}
      <nav className="glass fixed inset-x-0 bottom-0 z-30 flex items-center justify-around px-sm py-sm md:hidden">
        {items.slice(0, 5).map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-1 py-1"
            >
              <item.icon size={22} className={active ? "text-primary" : "text-on-surface-variant"} />
              <span className={cn("text-label-sm", active ? "text-primary" : "text-on-surface-variant")}>
                {item.label}
              </span>
              {active && <span className="h-1 w-1 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
