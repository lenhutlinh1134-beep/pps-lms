import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState } from "@/components/EmptyState";
import { type LectureItem } from "@/components/lectures/LectureGrid";
import { LectureBrowser } from "@/components/lectures/LectureBrowser";

export const dynamic = "force-dynamic";

export default async function StudentLecturesPage() {
  const profile = await requireRole("student");

  let lectures: LectureItem[] = [];
  let watchedIds: string[] = [];

  if (profile.id.startsWith("demo-")) {
    // Demo mode: dữ liệu giả, không qua RLS
    lectures = [
      {
        id: "demo-lecture-001",
        title: "[DEMO] Phát âm chuẩn tiếng Anh — Bảng chữ cái IPA",
        type: "theory",
        teacher_name: "PPS Demo Teacher",
        created_at: new Date().toISOString(),
        class: { name: "Lớp Demo A1" },
      },
      {
        id: "demo-lecture-002",
        title: "[DEMO] Grammar: Thì hiện tại đơn (Present Simple)",
        type: "video",
        teacher_name: "PPS Demo Teacher",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        class: { name: "Lớp Demo A1" },
      },
    ];
  } else {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("lectures")
        .select("id, title, type, teacher_name, created_at, class:classes(name)")
        .order("created_at", { ascending: false });
      lectures = (data as unknown as LectureItem[]) ?? [];
      const { data: views } = await supabase.from("lecture_views").select("lecture_id");
      watchedIds = (views ?? []).map((v: { lecture_id: string }) => v.lecture_id);
    } catch {
      lectures = [];
    }
  }

  return (
    <DashboardShell role="student" userName={profile.full_name || "Học sinh"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-lg">
        <div>
          <Link
            href="/student"
            className="mb-sm inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary"
          >
            <ArrowLeft size={16} /> Về trang chủ
          </Link>
          <div className="flex items-center gap-md">
            <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-secondary-fixed text-secondary">
              <BookOpen size={28} />
            </span>
            <div>
              <h1 className="text-display-lg">Học lý thuyết</h1>
              <p className="mt-xs text-body-lg text-on-surface-variant">Video & bài giảng từ giáo viên của bạn</p>
            </div>
          </div>
        </div>

        {lectures.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Chưa có bài giảng nào"
            description="Khi giáo viên đăng video hoặc tài liệu cho lớp của bạn, chúng sẽ hiện ở đây."
          />
        ) : (
          <>
            <div className="flex items-center gap-md rounded-lg bg-surface-container-low p-md">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-high">
                <div className="h-full rounded-full bg-premium"
                  style={{ width: `${Math.round((watchedIds.length / lectures.length) * 100)}%` }} />
              </div>
              <span className="text-label-md font-semibold text-on-surface-variant">
                Đã học {watchedIds.length}/{lectures.length}
              </span>
            </div>
            <LectureBrowser lectures={lectures} basePath="/student/lectures" watchedIds={watchedIds} />
          </>
        )}
      </div>
    </DashboardShell>
  );
}
