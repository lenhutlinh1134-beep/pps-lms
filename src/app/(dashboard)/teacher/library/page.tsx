import { FolderOpen } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { LibraryManager, type Topic } from "@/components/teacher/LibraryManager";

export const dynamic = "force-dynamic";

export default async function TeacherLibraryPage() {
  const profile = await requireRole("teacher");

  let topics: Topic[] = [];

  if (profile.id.startsWith("demo-")) {
    topics = [
      { id: "demo-t1", title: "Ngữ pháp cơ bản" },
      { id: "demo-t2", title: "Từ vựng theo chủ đề" },
      { id: "demo-t3", title: "Tài liệu IELTS" },
    ];
  } else {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("library_topics")
        .select("id, title")
        .order("created_at", { ascending: false });
      topics = (data as Topic[]) ?? [];
    } catch { /* trả về mảng rỗng */ }
  }

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-xl">

        {/* Header */}
        <div className="flex items-center gap-md">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
            <FolderOpen size={28} />
          </span>
          <div>
            <h1 className="text-display-lg">Kho tài liệu tham khảo</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Tổ chức tài liệu theo chủ đề — học sinh xem được từ Thư viện
            </p>
          </div>
        </div>

        {/* 2-panel manager */}
        <LibraryManager initialTopics={topics} teacherId={profile.id} />
      </div>
    </DashboardShell>
  );
}
