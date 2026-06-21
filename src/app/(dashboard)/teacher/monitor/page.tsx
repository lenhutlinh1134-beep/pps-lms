import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import {
  MonitorRealtimeClient,
  type StudentActivity,
  type LectureStats,
  type StudentFlag,
} from "@/components/teacher/MonitorRealtimeClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MonitorPage() {
  const profile = await requireRole("teacher");
  const supabase = await createClient();

  const { data: classTeachers } = await supabase
    .from("class_teachers")
    .select("class_id")
    .eq("teacher_id", profile.id);

  const classIds = (classTeachers ?? []).map((r) => r.class_id);

  let students: StudentActivity[] = [];
  let lectureStats: LectureStats[] = [];
  let studentIds: string[] = [];

  if (classIds.length > 0) {
    const { data: enrollments } = await supabase
      .from("class_students")
      .select("student_id, class:classes(id, name)")
      .in("class_id", classIds);

    studentIds = [...new Set((enrollments ?? []).map((e) => e.student_id))];

    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

      const [{ data: todayLogs }, { data: recentLogs }, { data: allLastLogs }] =
        await Promise.all([
          supabase
            .from("student_logs")
            .select("student_id, study_minutes, listen_count")
            .in("student_id", studentIds)
            .gte("created_at", todayStart.toISOString()),
          supabase
            .from("student_logs")
            .select("student_id, created_at")
            .in("student_id", studentIds)
            .gte("created_at", fifteenMinAgo),
          supabase
            .from("student_logs")
            .select("student_id, created_at")
            .in("student_id", studentIds)
            .order("created_at", { ascending: false })
            .limit(studentIds.length),
        ]);

      const onlineSet = new Set((recentLogs ?? []).map((r) => r.student_id));
      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, p.full_name])
      );
      const enrollmentMap = new Map<string, string>();
      (enrollments ?? []).forEach((e) => {
        const cls = e.class as unknown as { name: string } | null;
        if (cls && !enrollmentMap.has(e.student_id)) {
          enrollmentMap.set(e.student_id, cls.name);
        }
      });

      const lastActiveMap = new Map<string, string>();
      (recentLogs ?? []).forEach((log) => {
        const ex = lastActiveMap.get(log.student_id);
        if (!ex || log.created_at > ex) lastActiveMap.set(log.student_id, log.created_at);
      });
      (allLastLogs ?? []).forEach((log) => {
        if (!lastActiveMap.has(log.student_id))
          lastActiveMap.set(log.student_id, log.created_at);
      });

      const todayMinutesMap = new Map<string, number>();
      const todayListensMap = new Map<string, number>();
      (todayLogs ?? []).forEach((log) => {
        todayMinutesMap.set(log.student_id, (todayMinutesMap.get(log.student_id) ?? 0) + (log.study_minutes ?? 0));
        todayListensMap.set(log.student_id, (todayListensMap.get(log.student_id) ?? 0) + (log.listen_count ?? 0));
      });

      students = studentIds
        .map((sid) => ({
          student_id: sid,
          student_name: profileMap.get(sid) ?? null,
          class_name: enrollmentMap.get(sid) ?? "—",
          study_minutes_today: todayMinutesMap.get(sid) ?? 0,
          listens_today: todayListensMap.get(sid) ?? 0,
          last_active: lastActiveMap.get(sid) ?? null,
          is_online: onlineSet.has(sid),
        }))
        .sort((a, b) => {
          if (a.is_online !== b.is_online) return b.is_online ? 1 : -1;
          if (!a.last_active) return 1;
          if (!b.last_active) return -1;
          return b.last_active.localeCompare(a.last_active);
        });
    }

    // Weekly metrics cho Flag Engine
    const { data: weeklyMetrics } = await supabase.rpc("get_all_my_students_metrics");
    type WeeklyMetric = { student_id: string; study_minutes_week: number; listens_week: number; days_since_active: number; avg_score: number | null };
    const metricsMap = new Map<string, WeeklyMetric>(
      ((weeklyMetrics ?? []) as WeeklyMetric[]).map((m) => [m.student_id, m])
    );

    students = students.map((s) => {
      const m = metricsMap.get(s.student_id);
      if (!m) return s;
      const flags: StudentFlag[] = [];
      if (m.days_since_active > 7) flags.push({ type: "inactive", label: "Không học 7+ ngày", color: "red" });
      if (m.listens_week < 3) flags.push({ type: "low_listening", label: "Ít luyện nghe", color: "orange" });
      if (m.study_minutes_week < 30) flags.push({ type: "low_study", label: "Học < 30 phút/tuần", color: "orange" });
      if (m.avg_score !== null && m.avg_score < 5) flags.push({ type: "low_score", label: "Điểm TB thấp", color: "yellow" });
      return { ...s, flags, study_minutes_week: m.study_minutes_week, listens_week: m.listens_week };
    });

    const { data: lectures } = await supabase
      .from("lectures")
      .select("id, title, class:classes(name), lecture_views(count), lecture_comments(count)")
      .in("class_id", classIds)
      .order("created_at", { ascending: false })
      .limit(10);

    lectureStats = ((lectures ?? []) as unknown[])
      .map((row: unknown) => {
        const r = row as Record<string, unknown>;
        const cls = r.class as { name: string } | null;
        return {
          lecture_id: r.id as string,
          lecture_title: r.title as string,
          class_name: cls?.name ?? "—",
          view_count: (r.lecture_views as Array<{ count: number }>)?.[0]?.count ?? 0,
          comment_count: (r.lecture_comments as Array<{ count: number }>)?.[0]?.count ?? 0,
        };
      })
      .sort((a, b) => b.view_count - a.view_count);
  }

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-6xl flex-col gap-lg">
        <div className="flex flex-wrap items-start justify-between gap-sm">
          <div>
            <h1 className="text-display-lg">Giám sát học tập</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Theo dõi hoạt động học sinh theo thời gian thực
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-tertiary-fixed px-4 py-2 text-label-md text-on-tertiary-fixed">
            <span className="h-2 w-2 animate-pulse rounded-full bg-tertiary" />
            Realtime — tự cập nhật
          </div>
        </div>

        <MonitorRealtimeClient
          initialStudents={students}
          lectureStats={lectureStats}
          studentIds={studentIds}
        />
      </div>
    </DashboardShell>
  );
}
