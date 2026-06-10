import Link from "next/link";
import { Headphones, ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { topicsMeta } from "@/lib/listening-data";
import { DashboardShell } from "@/components/DashboardShell";
import { ListeningBrowser } from "@/components/listening/ListeningBrowser";
import type { CEFRLevel } from "@/lib/listening";

export const dynamic = "force-dynamic";

const DEMO_CLASS_LEVEL: CEFRLevel = "B1";

export default async function ListeningTopicsPage() {
  const profile = await requireRole("student");
  const isDemo = profile.id.startsWith("demo-");

  let classLevel: CEFRLevel | undefined;

  if (isDemo) {
    classLevel = DEMO_CLASS_LEVEL;
  } else {
    try {
      const supabase = await createClient();
      // Lấy level của lớp học sinh đang học (lấy lớp đầu tiên nếu có nhiều lớp)
      const { data } = await supabase
        .from("class_students")
        .select("classes(level)")
        .eq("student_id", profile.id)
        .limit(1)
        .maybeSingle();

      const raw = (data as { classes?: { level?: string } } | null)?.classes?.level;
      if (raw) classLevel = raw as CEFRLevel;
    } catch {
      // fallback: không lọc
    }
  }

  // Lọc topics theo level lớp, hoặc hiện tất cả nếu chưa biết level
  const topics = classLevel
    ? topicsMeta.filter((t) => t.level === classLevel)
    : topicsMeta;

  const totalParas = topics.reduce((a, t) => a + t.count, 0);

  return (
    <DashboardShell role="student" userName={profile.full_name || "Học sinh"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-lg">
        {/* Header */}
        <div>
          <Link
            href="/student"
            className="mb-sm inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary"
          >
            <ArrowLeft size={16} /> Về trang chủ
          </Link>
          <div className="flex items-center gap-md">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-fixed text-primary shadow-card">
              <Headphones size={28} />
            </span>
            <div>
              <h1 className="text-display-lg">Luyện nghe</h1>
              <p className="mt-xs text-body-lg text-on-surface-variant">
                {topics.length} chủ đề · {totalParas} đoạn · 3 chế độ luyện
                {classLevel && (
                  <span className="ml-sm inline-flex items-center rounded-full bg-primary-fixed px-2.5 py-0.5 text-label-sm font-bold text-primary">
                    Cấp {classLevel}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Browser với search + filter */}
        <ListeningBrowser topics={topics} classLevel={classLevel} />
      </div>
    </DashboardShell>
  );
}
