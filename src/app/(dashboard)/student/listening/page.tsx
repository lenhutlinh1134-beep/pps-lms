import Link from "next/link";
import { Headphones, ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { topicsMeta } from "@/lib/listening-data";
import { DashboardShell } from "@/components/DashboardShell";
import { ListeningBrowser } from "@/components/listening/ListeningBrowser";

export const dynamic = "force-dynamic";

export default async function ListeningTopicsPage() {
  const profile = await requireRole("student");
  const totalParas = topicsMeta.reduce((a, t) => a + t.count, 0);

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
                {topicsMeta.length} chủ đề · {totalParas} đoạn · 3 chế độ luyện
              </p>
            </div>
          </div>
        </div>

        {/* Browser với search + filter */}
        <ListeningBrowser topics={topicsMeta} />
      </div>
    </DashboardShell>
  );
}
