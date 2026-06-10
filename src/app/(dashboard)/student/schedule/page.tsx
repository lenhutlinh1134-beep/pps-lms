import { Calendar, AlertCircle, Clock, MapPin } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";
import { ScheduleCalendar, type ScheduleLecture } from "@/components/student/ScheduleCalendar";

export const dynamic = "force-dynamic";

interface SessionRow {
  id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  class_name: string;
}

const DOW_LABEL: Record<number, string> = {
  2: "Thứ 2", 3: "Thứ 3", 4: "Thứ 4", 5: "Thứ 5", 6: "Thứ 6", 7: "Thứ 7", 8: "Chủ nhật",
};

const DEMO_SESSIONS: SessionRow[] = [
  { id: "ds1", class_id: "c1", day_of_week: 2, start_time: "08:00", end_time: "09:30", room: "P.201", class_name: "Lớp Demo A1" },
  { id: "ds2", class_id: "c1", day_of_week: 4, start_time: "08:00", end_time: "09:30", room: "P.201", class_name: "Lớp Demo A1" },
  { id: "ds3", class_id: "c2", day_of_week: 3, start_time: "14:00", end_time: "15:30", room: "P.305", class_name: "Lớp Demo B2" },
  { id: "ds4", class_id: "c2", day_of_week: 6, start_time: "09:00", end_time: "10:30", room: "P.305", class_name: "Lớp Demo B2" },
];

export default async function StudentSchedulePage() {
  const profile = await requireRole("student");

  let lectures: ScheduleLecture[] = [];
  let sessions: SessionRow[] = [];
  let fetchError = false;

  if (profile.id.startsWith("demo-")) {
    const today = new Date();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    lectures = [
      { id: "demo-l1", title: "[DEMO] Phát âm IPA", type: "theory", dateKey: fmt(today), className: "Lớp Demo A1" },
      { id: "demo-l2", title: "[DEMO] Thì hiện tại đơn", type: "video", dateKey: fmt(today), className: "Lớp Demo A1" },
      { id: "demo-l3", title: "[DEMO] Từ vựng chủ đề Du lịch", type: "theory",
        dateKey: fmt(new Date(today.getTime() - 3 * 86400000)), className: "Lớp Demo B2" },
    ];
    sessions = DEMO_SESSIONS;
  } else {
    try {
      const supabase = await createClient();

      // Lấy class IDs của học sinh
      const { data: enrollments } = await supabase
        .from("class_students")
        .select("class_id, class:classes(name)");

      const classMap: Record<string, string> = {};
      for (const e of enrollments ?? []) {
        const name = (e.class as unknown as { name: string } | null)?.name ?? "—";
        classMap[e.class_id] = name;
      }
      const classIds = Object.keys(classMap);

      // Lịch cố định từ class_sessions
      if (classIds.length > 0) {
        const { data: sessionsData } = await supabase
          .from("class_sessions")
          .select("id, class_id, day_of_week, start_time, end_time, room")
          .in("class_id", classIds)
          .order("day_of_week")
          .order("start_time");

        sessions = (sessionsData ?? []).map((s) => ({
          ...s,
          class_name: classMap[s.class_id] ?? "—",
        }));
      }

      // Bài giảng (ngày đăng)
      const { data: lectureData, error } = await supabase
        .from("lectures")
        .select("id, title, type, created_at, class:classes(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      lectures = (lectureData ?? []).map((l) => {
        const d = new Date(l.created_at);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return {
          id: l.id,
          title: l.title,
          type: l.type as "video" | "theory",
          dateKey,
          className: (l.class as unknown as { name: string } | null)?.name ?? "—",
        };
      });
    } catch {
      fetchError = true;
    }
  }

  // Group sessions by day_of_week
  const sessionsByDay: Record<number, SessionRow[]> = {};
  for (const s of sessions) {
    if (!sessionsByDay[s.day_of_week]) sessionsByDay[s.day_of_week] = [];
    sessionsByDay[s.day_of_week].push(s);
  }
  const activeDays = [2, 3, 4, 5, 6, 7, 8].filter((d) => sessionsByDay[d]?.length);

  return (
    <DashboardShell role="student" userName={profile.full_name || "Học sinh"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-xl">

        {/* Header */}
        <div className="flex items-center gap-md">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
            <Calendar size={28} />
          </span>
          <div>
            <h1 className="text-display-lg">Lịch học</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Lịch học cố định hàng tuần và bài giảng mới
            </p>
          </div>
        </div>

        {/* Error state */}
        {fetchError && (
          <Card className="border border-error-container bg-error-container/20">
            <div className="flex items-center gap-sm text-on-error-container">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-body-md">Không thể tải dữ liệu. Vui lòng thử lại sau.</p>
            </div>
          </Card>
        )}

        {/* ===== Lịch học cố định theo tuần ===== */}
        {!fetchError && (
          <section>
            <h2 className="mb-md text-headline-sm">Lịch học cố định</h2>
            {sessions.length === 0 ? (
              <Card className="py-lg text-center">
                <p className="text-body-md text-on-surface-variant">
                  Giáo viên chưa cài đặt lịch học cố định.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-4">
                {activeDays.map((dow) => (
                  <Card key={dow} padding="md" className="flex flex-col gap-sm">
                    <p className="text-label-md font-semibold text-primary">{DOW_LABEL[dow]}</p>
                    {sessionsByDay[dow].map((s) => (
                      <div key={s.id} className="rounded-md bg-surface-container p-sm">
                        <p className="text-body-md font-medium leading-snug">{s.class_name}</p>
                        <div className="mt-xs flex items-center gap-1 text-label-sm text-on-surface-variant">
                          <Clock size={11} />
                          {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                        </div>
                        {s.room && (
                          <div className="mt-0.5 flex items-center gap-1 text-label-sm text-on-surface-variant">
                            <MapPin size={11} /> {s.room}
                          </div>
                        )}
                      </div>
                    ))}
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ===== Lịch bài giảng theo tháng ===== */}
        {!fetchError && (
          <section>
            <h2 className="mb-md text-headline-sm">Bài giảng theo tháng</h2>
            {lectures.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Chưa có bài giảng nào"
                description="Khi giáo viên đăng bài giảng mới, ngày đăng sẽ hiện trên lịch này."
              />
            ) : (
              <ScheduleCalendar lectures={lectures} />
            )}
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
