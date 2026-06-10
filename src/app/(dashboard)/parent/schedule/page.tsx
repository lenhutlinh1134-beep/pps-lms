import { Calendar, Clock, MapPin, AlertCircle, Users } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

const DOW_LABEL: Record<number, string> = {
  2: "Thứ 2",
  3: "Thứ 3",
  4: "Thứ 4",
  5: "Thứ 5",
  6: "Thứ 6",
  7: "Thứ 7",
  1: "Chủ nhật",
};

interface ChildRow {
  student_id: string;
  full_name: string | null;
  class_names: string[];
}

interface SessionEntry {
  id: string;
  class_id: string;
  class_name: string;
  student_id: string;
  student_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
}

/** Demo data: 3 buổi cho 2 con demo */
function buildDemoSessions(): SessionEntry[] {
  return [
    {
      id: "demo-s1",
      class_id: "c1",
      class_name: "Lớp Sunshine A1",
      student_id: "demo-child-1",
      student_name: "Nguyễn Bảo An",
      day_of_week: 2,
      start_time: "08:00",
      end_time: "09:30",
      room: "P.201",
    },
    {
      id: "demo-s2",
      class_id: "c1",
      class_name: "Lớp Sunshine A1",
      student_id: "demo-child-1",
      student_name: "Nguyễn Bảo An",
      day_of_week: 4,
      start_time: "08:00",
      end_time: "09:30",
      room: "P.201",
    },
    {
      id: "demo-s3",
      class_id: "c2",
      class_name: "Lớp Rainbow B2",
      student_id: "demo-child-2",
      student_name: "Nguyễn Minh Khoa",
      day_of_week: 3,
      start_time: "14:00",
      end_time: "15:30",
      room: "P.305",
    },
  ];
}

export default async function ParentSchedulePage() {
  const profile = await requireRole("parent");

  let sessions: SessionEntry[] = [];
  let fetchError = false;

  if (profile.id.startsWith("demo-")) {
    sessions = buildDemoSessions();
  } else {
    try {
      const supabase = await createClient();

      // 1. Lấy danh sách con
      const { data: childrenRaw } = await supabase.rpc("get_my_children");
      const children: ChildRow[] = (childrenRaw as ChildRow[]) ?? [];
      const childIds = children.map((c) => c.student_id);

      if (childIds.length > 0) {
        // 2. Lấy class IDs của tất cả con (1 query, tránh N+1)
        const { data: enrollments } = await supabase
          .from("class_students")
          .select("class_id, student_id")
          .in("student_id", childIds);

        const classIds = [...new Set((enrollments ?? []).map((e) => e.class_id))];

        if (classIds.length > 0) {
          // 3. Lấy sessions join classes trong 1 query
          const { data: sessionsRaw } = await supabase
            .from("class_sessions")
            .select("id, class_id, day_of_week, start_time, end_time, room, class:classes(name)")
            .in("class_id", classIds)
            .order("day_of_week")
            .order("start_time");

          // Build lookup: class_id → student(s)
          const classToStudents: Record<string, { student_id: string; student_name: string }[]> = {};
          for (const e of enrollments ?? []) {
            if (!classToStudents[e.class_id]) classToStudents[e.class_id] = [];
            const child = children.find((c) => c.student_id === e.student_id);
            classToStudents[e.class_id].push({
              student_id: e.student_id,
              student_name: child?.full_name ?? "(Không có tên)",
            });
          }

          // Expand: 1 session → 1 entry per student in that class
          for (const s of sessionsRaw ?? []) {
            const className =
              (s.class as unknown as { name: string } | null)?.name ?? "—";
            const students = classToStudents[s.class_id] ?? [];
            for (const stu of students) {
              sessions.push({
                id: `${s.id}-${stu.student_id}`,
                class_id: s.class_id,
                class_name: className,
                student_id: stu.student_id,
                student_name: stu.student_name,
                day_of_week: s.day_of_week,
                start_time: s.start_time,
                end_time: s.end_time,
                room: s.room ?? null,
              });
            }
          }
        }
      }
    } catch {
      fetchError = true;
    }
  }

  // Group by day_of_week
  const byDay: Record<number, SessionEntry[]> = {};
  for (const s of sessions) {
    if (!byDay[s.day_of_week]) byDay[s.day_of_week] = [];
    byDay[s.day_of_week].push(s);
  }
  const activeDays = [2, 3, 4, 5, 6, 7, 1].filter((d) => byDay[d]?.length);

  // Check if multiple children (to show student name badge)
  const uniqueStudentIds = new Set(sessions.map((s) => s.student_id));
  const hasMultipleChildren = uniqueStudentIds.size > 1;

  return (
    <DashboardShell role="parent" userName={profile.full_name || "Phụ huynh"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-xl">

        {/* Header */}
        <div className="flex items-center gap-md">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
            <Calendar size={28} />
          </span>
          <div>
            <h1 className="text-display-lg">Lịch học của con</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Xem lịch học cố định hàng tuần của con
            </p>
          </div>
        </div>

        {/* Error state */}
        {fetchError && (
          <Card className="border border-error-container bg-error-container/20">
            <div className="flex items-center gap-sm text-on-error-container">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-body-md">
                Không thể tải dữ liệu. Vui lòng thử lại sau.
              </p>
            </div>
          </Card>
        )}

        {/* Empty state */}
        {!fetchError && sessions.length === 0 && (
          <EmptyState
            icon={Calendar}
            title="Con chưa có lịch học cố định nào"
            description="Giáo viên sẽ cập nhật lịch học sớm. Vui lòng quay lại sau."
          />
        )}

        {/* Weekly grid */}
        {!fetchError && sessions.length > 0 && (
          <section>
            <div className="mb-md flex items-center gap-2">
              <h2 className="text-headline-sm">Lịch theo tuần</h2>
              {hasMultipleChildren && (
                <span className="flex items-center gap-1 rounded-full bg-surface-container px-3 py-1 text-label-sm text-on-surface-variant">
                  <Users size={12} />
                  {uniqueStudentIds.size} con
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-4">
              {activeDays.map((dow) => (
                <Card key={dow} padding="md" className="flex flex-col gap-sm">
                  {/* Day header */}
                  <p className="text-label-md font-semibold text-primary">
                    {DOW_LABEL[dow]}
                  </p>

                  {/* Sessions in this day */}
                  {byDay[dow].map((s) => (
                    <div
                      key={s.id}
                      className="rounded-md bg-surface-container p-sm"
                    >
                      <p className="text-body-md font-medium leading-snug">
                        {s.class_name}
                      </p>

                      {/* Student name badge — only if multiple children */}
                      {hasMultipleChildren && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-on-primary-fixed">
                          {s.student_name}
                        </span>
                      )}

                      <div className="mt-xs flex items-center gap-1 text-label-sm text-on-surface-variant">
                        <Clock size={11} />
                        {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                      </div>

                      {s.room && (
                        <div className="mt-0.5 flex items-center gap-1 text-label-sm text-on-surface-variant">
                          <MapPin size={11} />
                          {s.room}
                        </div>
                      )}
                    </div>
                  ))}
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
