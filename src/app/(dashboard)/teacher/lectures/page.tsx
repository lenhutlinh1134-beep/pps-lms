import Link from "next/link";
import { Plus, Video } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/EmptyState";
import { type LectureItem } from "@/components/lectures/LectureGrid";
import { LectureBrowser } from "@/components/lectures/LectureBrowser";
import { isDemoId, DEMO_LECTURES } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export default async function TeacherLecturesPage() {
  const profile = await requireRole("teacher");

  let lectures: LectureItem[] = [];
  let fetchError: string | null = null;

  if (isDemoId(profile.id)) {
    lectures = DEMO_LECTURES;
  } else {
    try {
      // Ưu tiên dùng admin client để bypass RLS (tránh lỗi session server-side).
      // Vẫn an toàn vì filter chặt bằng teacher_id = profile.id.
      // Fallback về regular client nếu service role key chưa cấu hình.
      const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabase = hasServiceKey ? getAdminSupabase() : await createClient();

      const { data, error } = await supabase
        .from("lectures")
        .select(`
          id, title, type, teacher_name, created_at,
          class:classes!lectures_class_id_fkey(name)
        `)
        .eq("teacher_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Lectures fetch error:", error);
        fetchError = error.message;
      }

      lectures = ((data ?? []) as unknown[]).map((row: unknown) => {
        return row as LectureItem;
      });
    } catch (err) {
      console.error("Lectures catch error:", err);
      fetchError = String(err);
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

        {fetchError ? (
          <div className="rounded-xl bg-error-container px-6 py-4 text-on-error-container">
            <p className="font-semibold">Lỗi tải dữ liệu</p>
            <p className="mt-1 text-sm">{fetchError}</p>
          </div>
        ) : lectures.length === 0 ? (
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
