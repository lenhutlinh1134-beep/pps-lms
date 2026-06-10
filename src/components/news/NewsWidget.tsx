import { Pin, Newspaper } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";

// ─────────── Types ───────────

interface NewsItem {
  id: string;
  title: string;
  is_pinned: boolean;
  created_at: string;
  target_roles: string[];
}

interface Props {
  /** Role của user hiện tại để filter tin phù hợp */
  role: "student" | "teacher" | "parent";
  /** Số tin tối đa hiển thị (mặc định 3) */
  limit?: number;
}

// ─────────── Demo fallback ───────────

const DEMO_NEWS: Record<string, NewsItem[]> = {
  student: [
    {
      id: "d1",
      title: "Khai giảng khóa học hè 2026",
      is_pinned: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      target_roles: ["student", "parent"],
    },
    {
      id: "d3",
      title: "Lịch thi cuối kỳ học kỳ 2",
      is_pinned: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      target_roles: ["student", "parent", "teacher"],
    },
  ],
  teacher: [
    {
      id: "d2",
      title: "Họp giáo viên tháng 6/2026",
      is_pinned: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      target_roles: ["teacher"],
    },
    {
      id: "d3",
      title: "Lịch thi cuối kỳ học kỳ 2",
      is_pinned: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      target_roles: ["student", "parent", "teacher"],
    },
  ],
  parent: [
    {
      id: "d1",
      title: "Khai giảng khóa học hè 2026",
      is_pinned: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      target_roles: ["student", "parent"],
    },
    {
      id: "d3",
      title: "Lịch thi cuối kỳ học kỳ 2",
      is_pinned: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      target_roles: ["student", "parent", "teacher"],
    },
  ],
};

// ─────────── Component ───────────

/**
 * NewsWidget — server component nhỏ.
 * Dùng trong student/page.tsx và parent/page.tsx:
 *
 * ```tsx
 * import { NewsWidget } from "@/components/news/NewsWidget";
 * // ...
 * <NewsWidget role="student" />
 * ```
 */
export async function NewsWidget({ role, limit = 3 }: Props) {
  let news: NewsItem[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("news")
        .select("id, title, is_pinned, created_at, target_roles")
        .contains("target_roles", [role])
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);

      news = (data as NewsItem[]) ?? [];
    } else {
      // Demo mode
      news = (DEMO_NEWS[role] ?? []).slice(0, limit);
    }
  } catch {
    // Fallback demo nếu DB chưa có bảng news
    news = (DEMO_NEWS[role] ?? []).slice(0, limit);
  }

  return (
    <Card padding="md">
      {/* Header */}
      <div className="flex items-center gap-sm mb-md">
        <Newspaper size={18} className="text-primary" />
        <h3 className="text-headline-sm">Tin tức &amp; Thông báo</h3>
      </div>

      {/* Content */}
      {news.length === 0 ? (
        <p className="py-md text-center text-body-md text-on-surface-variant">
          Chưa có thông báo nào.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-outline-variant">
          {news.map((item) => {
            const date = new Date(item.created_at).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
            });

            return (
              <li key={item.id} className="flex items-start gap-sm py-sm first:pt-0 last:pb-0">
                {/* Pin indicator */}
                <span className="mt-0.5 shrink-0">
                  {item.is_pinned ? (
                    <Pin size={14} className="text-secondary" />
                  ) : (
                    <div className="h-3.5 w-3.5" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-body-md font-medium leading-snug line-clamp-2">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-label-sm text-on-surface-variant">{date}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
