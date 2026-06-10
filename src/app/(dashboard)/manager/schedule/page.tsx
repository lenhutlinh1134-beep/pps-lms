import { CalendarDays, Clock, BookOpen, Users } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface SessionDisplay {
  id: string;
  class_id: string;
  class_name: string;
  teacher_name: string;
  day_of_week: number; // 2=T2 ... 8=CN
  start_time: string;
  end_time: string;
  room: string | null;
  is_active: boolean;
}

// ─── Demo data ───────────────────────────────────────────────
const DEMO_SESSIONS: SessionDisplay[] = [
  { id: "s1", class_id: "c1", class_name: "A1 Sáng", teacher_name: "Cô Lan",  day_of_week: 2, start_time: "08:00", end_time: "09:30", room: "P.201", is_active: true },
  { id: "s2", class_id: "c1", class_name: "A1 Sáng", teacher_name: "Cô Lan",  day_of_week: 4, start_time: "08:00", end_time: "09:30", room: "P.201", is_active: true },
  { id: "s3", class_id: "c1", class_name: "A1 Sáng", teacher_name: "Cô Lan",  day_of_week: 6, start_time: "08:00", end_time: "09:30", room: "P.201", is_active: true },
  { id: "s4", class_id: "c2", class_name: "B2 Chiều", teacher_name: "Thầy Minh", day_of_week: 3, start_time: "14:00", end_time: "15:30", room: "P.305", is_active: true },
  { id: "s5", class_id: "c2", class_name: "B2 Chiều", teacher_name: "Thầy Minh", day_of_week: 5, start_time: "14:00", end_time: "15:30", room: "P.305", is_active: true },
  { id: "s6", class_id: "c3", class_name: "C3 Tối",   teacher_name: "Cô Thu",   day_of_week: 2, start_time: "18:00", end_time: "19:30", room: "P.102", is_active: false },
  { id: "s7", class_id: "c3", class_name: "C3 Tối",   teacher_name: "Cô Thu",   day_of_week: 4, start_time: "18:00", end_time: "19:30", room: "P.102", is_active: false },
  { id: "s8", class_id: "c3", class_name: "C3 Tối",   teacher_name: "Cô Thu",   day_of_week: 7, start_time: "09:00", end_time: "10:30", room: "P.102", is_active: false },
];

// ─── Helpers ──────────────────────────────────────────────────
const DAY_LABELS: Record<number, string> = {
  2: "Thứ 2", 3: "Thứ 3", 4: "Thứ 4", 5: "Thứ 5",
  6: "Thứ 6", 7: "Thứ 7", 8: "Chủ nhật",
};

function formatTime(t: string) {
  // "08:00:00" → "08:00"
  return t.slice(0, 5);
}

// ─── Page ─────────────────────────────────────────────────────
export default async function ManagerSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; day?: string }>;
}) {
  const profile = await requireRole("manager");
  const isDemo = profile.id.startsWith("demo-");
  const params = await searchParams;

  let sessions: SessionDisplay[] = [];

  if (isDemo) {
    sessions = DEMO_SESSIONS;
  } else {
    const supabase = await createClient();
    try {
      const { data, error } = await supabase
        .from("class_sessions")
        .select(`
          id,
          class_id,
          day_of_week,
          start_time,
          end_time,
          room,
          classes (
            name,
            is_active
          ),
          class_teachers (
            profiles (
              full_name
            )
          )
        `)
        .order("day_of_week", { ascending: true })
        .order("start_time",   { ascending: true });

      if (!error && data) {
        sessions = (data as unknown[]).map((row: unknown) => {
          const r = row as {
            id: string;
            class_id: string;
            day_of_week: number;
            start_time: string;
            end_time: string;
            room: string | null;
            classes: { name: string; is_active: boolean } | null;
            class_teachers: Array<{ profiles: { full_name: string } | null }>;
          };
          const teacherName =
            r.class_teachers?.[0]?.profiles?.full_name ?? "—";
          return {
            id: r.id,
            class_id: r.class_id,
            class_name: r.classes?.name ?? "—",
            teacher_name: teacherName,
            day_of_week: r.day_of_week,
            start_time: formatTime(r.start_time),
            end_time: formatTime(r.end_time),
            room: r.room,
            is_active: r.classes?.is_active ?? false,
          };
        });
      }
    } catch {
      // fallback: mảng rỗng → EmptyState
    }
  }

  // ─── Client-side filter (server searchParams) ─────────────
  const query = (params.q ?? "").toLowerCase().trim();
  const dayFilter = params.day ? Number(params.day) : 0;

  const filtered = sessions.filter((s) => {
    const matchQ =
      !query ||
      s.class_name.toLowerCase().includes(query) ||
      s.teacher_name.toLowerCase().includes(query);
    const matchDay = !dayFilter || s.day_of_week === dayFilter;
    return matchQ && matchDay;
  });

  // ─── Stats ────────────────────────────────────────────────
  const totalSessions = filtered.length;
  const uniqueClasses  = new Set(filtered.map((s) => s.class_id)).size;
  const uniqueTeachers = new Set(filtered.map((s) => s.teacher_name)).size;

  // ─── Grid: nhóm theo thứ ──────────────────────────────────
  const activeDays = Array.from(new Set(filtered.map((s) => s.day_of_week))).sort(
    (a, b) => a - b,
  );
  const byDay: Record<number, SessionDisplay[]> = {};
  for (const s of filtered) {
    if (!byDay[s.day_of_week]) byDay[s.day_of_week] = [];
    byDay[s.day_of_week].push(s);
  }

  const statTiles = [
    { label: "Tổng buổi/tuần", value: totalSessions,  icon: CalendarDays, color: "text-primary"   },
    { label: "Số lớp có lịch", value: uniqueClasses,  icon: BookOpen,     color: "text-secondary" },
    { label: "Số GV đang dạy", value: uniqueTeachers, icon: Users,        color: "text-tertiary"  },
  ];

  return (
    <DashboardShell role="manager" userName={profile.full_name || "Quản lý"}>
      <div className="mx-auto flex max-w-6xl flex-col gap-lg">

        {/* ── Header ── */}
        <div className="flex items-start gap-md">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-fixed">
            <CalendarDays size={24} className="text-on-primary-fixed" />
          </span>
          <div>
            <h1 className="text-display-lg">Lịch dạy tổng quan</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Xem lịch dạy của tất cả lớp học trong tuần.
            </p>
          </div>
        </div>

        {/* ── Stat tiles ── */}
        <div className="grid grid-cols-3 gap-md">
          {statTiles.map((tile) => (
            <Card key={tile.label} padding="md" className="text-center">
              <div className="mb-sm flex justify-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container">
                  <tile.icon size={20} className={tile.color} />
                </span>
              </div>
              <p className={`font-display text-display-sm ${tile.color}`}>{tile.value}</p>
              <p className="text-label-md text-on-surface-variant">{tile.label}</p>
            </Card>
          ))}
        </div>

        {/* ── Filter bar ── */}
        <Card padding="md">
          <form method="GET" className="flex flex-col gap-sm sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <input
                type="text"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Tìm theo tên lớp hoặc giáo viên..."
                className="w-full rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <select
              name="day"
              defaultValue={params.day ?? ""}
              className="rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Tất cả các thứ</option>
              {[2, 3, 4, 5, 6, 7, 8].map((d) => (
                <option key={d} value={d}>
                  {DAY_LABELS[d]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-xl bg-primary px-6 py-3 text-label-md font-semibold text-on-primary transition-opacity hover:opacity-90"
            >
              Lọc
            </button>
            {(params.q || params.day) && (
              <a
                href="/manager/schedule"
                className="rounded-xl border border-outline-variant px-6 py-3 text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-surface-container text-center"
              >
                Xoá lọc
              </a>
            )}
          </form>
        </Card>

        {/* ── Nội dung chính ── */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Chưa có lớp nào tạo lịch dạy cố định."
            description={
              query || dayFilter
                ? "Không tìm thấy buổi dạy phù hợp với bộ lọc. Hãy thử thay đổi điều kiện tìm kiếm."
                : "Lịch dạy sẽ hiển thị ở đây sau khi giáo viên tạo lịch cho lớp học."
            }
          />
        ) : (
          <>
            {/* ── Weekly grid view ── */}
            {activeDays.length > 0 && (
              <div className="flex flex-col gap-lg">
                {activeDays.map((day) => (
                  <div key={day}>
                    {/* Day header */}
                    <div className="mb-sm flex items-center gap-sm">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-label-sm font-bold text-on-primary">
                        {day === 8 ? "CN" : `T${day}`}
                      </span>
                      <h2 className="text-headline-sm font-semibold">{DAY_LABELS[day]}</h2>
                      <span className="ml-auto text-label-sm text-on-surface-variant">
                        {byDay[day].length} buổi
                      </span>
                    </div>

                    {/* Session cards for that day */}
                    <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-3">
                      {byDay[day]
                        .sort((a, b) => a.start_time.localeCompare(b.start_time))
                        .map((session) => (
                          <SessionCard key={session.id} session={session} />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Fallback table view (always visible, below grid) ── */}
            <div>
              <h2 className="mb-sm text-headline-sm font-semibold text-on-surface-variant">
                Danh sách chi tiết
              </h2>
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-body-md">
                    <thead>
                      <tr className="border-b border-outline-variant">
                        {["Thứ", "Giờ bắt đầu", "Giờ kết thúc", "Lớp", "Giáo viên", "Phòng", "Trạng thái"].map(
                          (h) => (
                            <th
                              key={h}
                              className="pb-md pr-lg text-label-md font-semibold text-on-surface-variant last:pr-0"
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {[...filtered]
                        .sort((a, b) =>
                          a.day_of_week !== b.day_of_week
                            ? a.day_of_week - b.day_of_week
                            : a.start_time.localeCompare(b.start_time),
                        )
                        .map((s) => (
                          <tr
                            key={s.id}
                            className="transition-colors hover:bg-surface-container"
                          >
                            <td className="py-md pr-lg font-medium">{DAY_LABELS[s.day_of_week]}</td>
                            <td className="py-md pr-lg">
                              <span className="flex items-center gap-xs">
                                <Clock size={14} className="text-on-surface-variant" />
                                {s.start_time}
                              </span>
                            </td>
                            <td className="py-md pr-lg text-on-surface-variant">{s.end_time}</td>
                            <td className="py-md pr-lg font-semibold text-primary">{s.class_name}</td>
                            <td className="py-md pr-lg">{s.teacher_name}</td>
                            <td className="py-md pr-lg text-on-surface-variant">{s.room ?? "—"}</td>
                            <td className="py-md">
                              <StatusBadge isActive={s.is_active} />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function SessionCard({ session }: { session: SessionDisplay }) {
  return (
    <div
      className={cn(
        "rounded-xl border-l-4 p-md transition-shadow hover:shadow-md",
        session.is_active
          ? "border-primary bg-primary-fixed"
          : "border-outline-variant bg-surface-container opacity-60",
      )}
    >
      <p
        className={cn(
          "text-body-md font-bold leading-snug",
          session.is_active ? "text-on-primary-fixed" : "text-on-surface",
        )}
      >
        {session.class_name}
      </p>
      <p
        className={cn(
          "mt-xs text-label-sm",
          session.is_active ? "text-on-primary-fixed/80" : "text-on-surface-variant",
        )}
      >
        {session.teacher_name}
      </p>
      <div
        className={cn(
          "mt-sm flex items-center justify-between text-label-sm",
          session.is_active ? "text-on-primary-fixed/70" : "text-on-surface-variant",
        )}
      >
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {session.start_time} – {session.end_time}
        </span>
        {session.room && (
          <span className="rounded-md bg-black/10 px-2 py-0.5 text-label-sm">
            {session.room}
          </span>
        )}
      </div>
      {!session.is_active && (
        <span className="mt-sm inline-block rounded-full bg-outline-variant/40 px-2 py-0.5 text-label-sm text-on-surface-variant">
          Tạm dừng
        </span>
      )}
    </div>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-label-sm font-medium",
        isActive
          ? "bg-primary-fixed text-on-primary-fixed"
          : "bg-surface-container text-on-surface-variant",
      )}
    >
      {isActive ? "Đang hoạt động" : "Tạm dừng"}
    </span>
  );
}
