import { Newspaper } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import NewsManager, { type NewsRow } from "@/components/manager/NewsManager";

export const dynamic = "force-dynamic";

// ─────────── Demo data ───────────
const DEMO_NEWS: NewsRow[] = [
  {
    id: "demo-1",
    title: "Khai giảng khóa học hè 2026",
    content:
      "Trung tâm PPS Vietnam thông báo khai giảng các lớp hè 2026. Các khóa học bao gồm: Tiếng Anh giao tiếp, Luyện thi IELTS, và English for Kids. Đăng ký sớm để nhận ưu đãi học phí đặc biệt từ ngày 15/06 đến 30/06/2026.",
    publisher_name: "Nguyễn Quản Lý",
    is_pinned: true,
    target_roles: ["student", "parent"],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "demo-2",
    title: "Họp giáo viên tháng 6/2026",
    content:
      "Kính mời toàn bộ giáo viên tham dự buổi họp định kỳ tháng 6 vào lúc 9:00 sáng thứ 7 ngày 14/06/2026 tại phòng họp tầng 3. Nội dung: Đánh giá kết quả học kỳ, lên kế hoạch hè, và chia sẻ phương pháp giảng dạy mới.",
    publisher_name: "Nguyễn Quản Lý",
    is_pinned: false,
    target_roles: ["teacher"],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "demo-3",
    title: "Lịch thi cuối kỳ học kỳ 2 năm học 2025-2026",
    content:
      "Lịch thi cuối kỳ học kỳ 2 đã được xác nhận. Thời gian thi từ 20/06 đến 25/06/2026. Học sinh cần mang theo thẻ học sinh và bút bi khi đi thi. Chi tiết lịch thi từng lớp xem tại bảng thông báo của từng lớp.",
    publisher_name: "Nguyễn Quản Lý",
    is_pinned: false,
    target_roles: ["student", "parent", "teacher"],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

export default async function NewsPage() {
  const profile = await requireRole("manager");
  const isDemo = profile.id.startsWith("demo-");

  let news: NewsRow[] = [];

  if (isDemo) {
    news = DEMO_NEWS;
  } else {
    const supabase = await createClient();
    try {
      const { data } = await supabase
        .from("news")
        .select("id, title, content, publisher_name, is_pinned, target_roles, created_at, updated_at")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
      news = (data as NewsRow[]) ?? [];
    } catch {
      // Fallback: mảng rỗng, component xử lý empty state
    }
  }

  return (
    <DashboardShell role="manager" userName={profile.full_name || "Quản lý"}>
      <div className="mx-auto flex max-w-6xl flex-col gap-lg">
        {/* Header */}
        <div className="flex items-start gap-md">
          <span className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-fixed">
            <Newspaper size={24} className="text-on-primary-fixed" />
          </span>
          <div>
            <h1 className="text-display-lg">Tin tức &amp; Thông báo</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Đăng thông báo cho học sinh, phụ huynh và giáo viên
            </p>
          </div>
        </div>

        {/* Client component quản lý danh sách */}
        <NewsManager initialNews={news} managerName={profile.full_name || "Quản lý"} />
      </div>
    </DashboardShell>
  );
}
