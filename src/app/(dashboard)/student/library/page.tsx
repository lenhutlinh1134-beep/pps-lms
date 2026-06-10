import { BookOpen } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { LibraryViewer } from "@/components/student/LibraryViewer";
import type { Topic } from "@/components/teacher/LibraryManager";

export const dynamic = "force-dynamic";

const DEMO_TOPICS: Topic[] = [
  { id: "demo-t1", title: "Ngữ pháp cơ bản" },
  { id: "demo-t2", title: "Từ vựng theo chủ đề" },
  { id: "demo-t3", title: "Tài liệu IELTS" },
];

export default async function StudentLibraryPage() {
  const profile = await requireRole("student");
  const isDemo = profile.id.startsWith("demo-");

  let topics: Topic[] = [];

  if (isDemo) {
    topics = DEMO_TOPICS;
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("library_topics")
      .select("id, title")
      .order("created_at", { ascending: false });
    topics = (data as Topic[]) ?? [];
  }

  return (
    <DashboardShell role="student" userName={profile.full_name || "Học sinh"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-xl">

        {/* Header */}
        <div className="flex items-center gap-md">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-secondary-fixed text-secondary">
            <BookOpen size={28} />
          </span>
          <div>
            <h1 className="text-display-lg">Kho tài liệu tham khảo</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Tài liệu giáo viên chia sẻ cho lớp của bạn
            </p>
          </div>
        </div>

        <LibraryViewer initialTopics={topics} isDemo={isDemo} />
      </div>
    </DashboardShell>
  );
}
