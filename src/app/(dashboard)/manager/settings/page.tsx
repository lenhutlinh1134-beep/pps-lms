import {
  Settings,
  Building2,
  Users,
  GraduationCap,
  Newspaper,
  UserCircle,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { requireRole } from "@/lib/supabase/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ManagerSettingsPage() {
  const profile = await requireRole("manager");

  const quickLinks = [
    {
      label: "Chương trình học",
      description: "Quản lý môn học, cấp bậc và học phí",
      href: "/manager/programs",
      icon: GraduationCap,
      color: "text-primary",
      bg: "bg-primary-fixed",
    },
    {
      label: "Nhân viên",
      description: "Xem danh sách giáo viên đang công tác",
      href: "/manager/staff",
      icon: Users,
      color: "text-secondary",
      bg: "bg-secondary-fixed",
    },
    {
      label: "Tin tức & Thông báo",
      description: "Đăng thông báo cho học sinh, phụ huynh và giáo viên",
      href: "/manager/news",
      icon: Newspaper,
      color: "text-tertiary",
      bg: "bg-tertiary-fixed",
    },
    {
      label: "Hồ sơ cá nhân",
      description: "Cập nhật tên, ảnh đại diện tài khoản quản lý",
      href: "/manager/profile",
      icon: UserCircle,
      color: "text-primary",
      bg: "bg-primary-fixed",
    },
  ];

  return (
    <DashboardShell role="manager" userName={profile.full_name || "Quản lý"}>
      <div className="mx-auto flex max-w-3xl flex-col gap-lg">

        {/* Header */}
        <div className="flex items-start gap-md">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed">
            <Settings size={24} />
          </span>
          <div>
            <h1 className="text-display-lg">Cấu hình</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Thông tin trung tâm và các cài đặt hệ thống
            </p>
          </div>
        </div>

        {/* Center info */}
        <Card>
          <div className="flex items-center gap-sm mb-md">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-fixed">
              <Building2 size={18} className="text-primary" />
            </span>
            <h2 className="text-headline-sm">Thông tin trung tâm</h2>
          </div>
          <div className="flex flex-col gap-sm">
            <div className="flex items-center gap-sm text-body-md">
              <Building2 size={16} className="shrink-0 text-on-surface-variant" />
              <span className="font-semibold">PPS Vietnam English Center</span>
            </div>
            <div className="flex items-center gap-sm text-body-md text-on-surface-variant">
              <MapPin size={16} className="shrink-0" />
              <span>TP. Hồ Chí Minh, Việt Nam</span>
            </div>
            <div className="flex items-center gap-sm text-body-md text-on-surface-variant">
              <Phone size={16} className="shrink-0" />
              <span>—</span>
            </div>
            <div className="flex items-center gap-sm text-body-md text-on-surface-variant">
              <Mail size={16} className="shrink-0" />
              <span>—</span>
            </div>
          </div>
          <p className="mt-md text-label-sm text-on-surface-variant">
            Để cập nhật thông tin trung tâm, vui lòng liên hệ quản trị hệ thống.
          </p>
        </Card>

        {/* Quick links */}
        <div>
          <h2 className="mb-md text-headline-sm">Quản lý nhanh</h2>
          <div className="flex flex-col gap-sm">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-md rounded-xl border border-outline-variant bg-surface p-md transition-colors hover:bg-surface-container"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.bg}`}>
                  <item.icon size={20} className={item.color} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-semibold">{item.label}</p>
                  <p className="text-label-md text-on-surface-variant truncate">{item.description}</p>
                </div>
                <ChevronRight
                  size={18}
                  className="shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            ))}
          </div>
        </div>

        {/* App version */}
        <p className="text-center text-label-sm text-on-surface-variant">
          PPS LMS · v1.0.0
        </p>
      </div>
    </DashboardShell>
  );
}
