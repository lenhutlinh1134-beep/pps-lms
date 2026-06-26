import Link from "next/link";
import { Plus, Video } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/EmptyState";
import { type LectureItem } from "@/components/lectures/LectureGrid";
import { LectureBrowser } from "@/components/lectures/LectureBrowser";
import { isDemoId, DEMO_LECTURES } from "@/lib/demo-data";

import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function TeacherLecturesPage() {
  const profile = await requireRole("teacher");

  let lectures: LectureItem[] = [];
  if (isDemoId(profile.id)) {
    lectures = DEMO_LECTURES;
  } else {
    try {
      const supabase = getAdminSupabase();
      const { data, error } = await supabase
        .from("lectures")
        .select(`
          id, title, type, teacher_name, created_at,
          class:classes(name),
          lecture_views(count),
          lecture_comments(count)
        `)
        .eq("teacher_id", profile.id)
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Lectures fetch error:", error);
      }
      
      lectures = ((data ?? []) as unknown[]).map((row: unknown) => {
        const r = row as Record<string, unknown>;
        return {
          ...r,
          view_count: (r.lecture_views as Array<{ count: number }>)?.[0]?.count ?? 0,
          comment_count: (r.lecture_comments as Array<{ count: number }>)?.[0]?.count ?? 0,
        };
      }) as unknown as LectureItem[];
    } catch (err) {
      console.error("Lectures catch error:", err);
      lectures = [];
    }
  }

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-lg">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div>
            <h1 className="text-display-lg">Bài giảng</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              {lectures.length > 0 ? `${lectures.length} bài giảng` : "Đăng video & tài liệu cho học sinh"}
            </p>
          </div>
          <Link href="/teacher/lectures/new">
            <Button><Plus size={20} /> Đăng bài giảng</Button>
          </Link>
        </div>

        {lectures.length === 0 ? (
          <EmptyState
            icon={Video}
            title="Chưa có bài giảng nào"
            description="Đăng video bài giảng (YouTube/mp4) hoặc tài liệu lý thuyết để học sinh học và đặt câu hỏi."
            action={
              <Link href="/teacher/lectures/new">
                <Button><Plus size={20} /> Đăng bài giảng đầu tiên</Button>
              </Link>
            }
          />
        ) : (
          <LectureBrowser lectures={lectures} basePath="/teacher/lectures" />
        )}
      </div>
    </DashboardShell>
  );
}
