import { Calendar } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { ScheduleManager, type SessionRow } from "@/components/teacher/ScheduleManager";
import { isDemoId, DEMO_CLASSES, DEMO_SESSIONS } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export default async function TeacherSchedulePage() {
  const profile = await requireRole("teacher");
  const demo = isDemoId(profile.id);

  let classes: { id: string; name: string }[] = [];
  let sessions: SessionRow[] = [];

  if (demo) {
    // Demo mode — dùng data mẫu
    classes = DEMO_CLASSES.map((c) => ({ id: c.id, name: c.name }));
    sessions = DEMO_SESSIONS;
  } else {
    try {
      const supabase = await createClient();

      // Lấy danh sách lớp GV đang dạy
      const { data: classRows } = await supabase
        .from("class_teachers")
        .select("class:classes(id, name)")
        .eq("teacher_id", profile.id);

      classes = (classRows ?? [])
        .map((r) => (r.class as unknown as { id: string; name: string } | null))
        .filter(Boolean) as { id: string; name: string }[];

      if (classes.length > 0) {
        const classIds = classes.map((c) => c.id);

        // Lấy sessions của các lớp đó (join lấy class_name)
        const { data: sessionRows } = await supabase
          .from("class_sessions")
          .select("id, class_id, day_of_week, start_time, end_time, room, class:classes(name)")
          .in("class_id", classIds)
          .order("day_of_week", { ascending: true })
          .order("start_time", { ascending: true });

        sessions = (sessionRows ?? []).map((s) => {
          const cls = s.class as unknown as { name: string } | null;
          return {
            id: s.id as string,
            class_id: s.class_id as string,
            class_name: cls?.name ?? "Lớp không xác định",
            day_of_week: s.day_of_week as number,
            start_time: s.start_time as string,
            end_time: s.end_time as string,
            room: s.room as string | null,
          };
        });
      }
    } catch {
      // Bỏ qua lỗi khi chưa cấu hình Supabase — hiện empty state
      classes = [];
      sessions = [];
    }
  }

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-4xl flex-col gap-lg">
        {/* ─── Header ─── */}
        <div className="flex flex-wrap items-start justify-between gap-md">
          <div className="flex items-center gap-md">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-fixed text-primary">
              <Calendar size={26} />
            </span>
            <div>
              <h1 className="text-display-lg">Lịch dạy</h1>
              <p className="mt-xs text-body-lg text-on-surface-variant">
                Quản lý lịch buổi học cố định theo tuần
              </p>
            </div>
          </div>

          {/* Tổng số buổi / tuần */}
          {sessions.length > 0 && (
            <div className="rounded-full bg-primary-fixed px-4 py-2 text-label-md font-semibold text-on-primary-fixed">
              {sessions.length} buổi/tuần
            </div>
          )}
        </div>

        {/* ─── Main content ─── */}
        <ScheduleManager classes={classes} initialSessions={sessions} />
      </div>
    </DashboardShell>
  );
}
