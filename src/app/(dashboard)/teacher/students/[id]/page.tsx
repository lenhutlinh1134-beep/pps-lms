import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, BookOpen, Headphones, TrendingUp, Calendar } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function TeacherStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: studentId } = await params;
  const profile = await requireRole("teacher");
  const supabase = await createClient();

  // Xác nhận GV có quyền xem học sinh này (cùng lớp)
  const { data: access } = await supabase
    .from("class_students")
    .select("class_id, classes!class_students_class_id_fkey(id, name)")
    .eq("student_id", studentId)
    .in(
      "class_id",
      (
        await supabase
          .from("class_teachers")
          .select("class_id")
          .eq("teacher_id", profile.id)
      ).data?.map((r) => r.class_id) ?? []
    );

  if (!access || access.length === 0) notFound();

  // Thông tin học sinh
  const { data: student } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, created_at")
    .eq("id", studentId)
    .single();

  if (!student) notFound();

  const classRows = access as unknown as Array<{
    class_id: string;
    classes: { id: string; name: string } | null;
  }>;
  const classes = classRows.map((r) => r.classes).filter(Boolean) as { id: string; name: string }[];

  // Điểm danh 30 ngày gần nhất
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: attRows } = await supabase
    .from("attendance")
    .select("date, status, classes!attendance_class_id_fkey(name)")
    .eq("student_id", studentId)
    .gte("date", since30)
    .order("date", { ascending: false })
    .limit(50);

  type AttRow = { date: string; status: string; classes: { name: string } | { name: string }[] | null };
  const attendance = (attRows ?? []) as unknown as AttRow[];
  const presentCount = attendance.filter((r) => r.status === "present").length;
  const absentCount = attendance.filter((r) => r.status === "absent").length;
  const lateCount = attendance.filter((r) => r.status === "late").length;
  const attRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : null;

  // Bài tập + kết quả
  const classIds = classes.map((c) => c.id);
  const { data: submissionRows } = await supabase
    .from("submissions")
    .select("score, feedback, created_at, assignments!submissions_assignment_id_fkey(title, due_date, classes!assignments_class_id_fkey(name))")
    .eq("student_id", studentId)
    .in(
      "assignment_id",
      (
        await supabase
          .from("assignments")
          .select("id")
          .in("class_id", classIds)
      ).data?.map((r) => r.id) ?? []
    )
    .order("created_at", { ascending: false })
    .limit(20);

  type SubRow = {
    score: number | null;
    feedback: string | null;
    created_at: string;
    assignments: { title: string; due_date: string | null; classes: { name: string } | null } | null;
  };
  const submissions = (submissionRows ?? []) as unknown as SubRow[];
  const scoredSubs = submissions.filter((s) => s.score !== null);
  const avgScore = scoredSubs.length > 0
    ? Math.round(scoredSubs.reduce((sum, s) => sum + (s.score ?? 0), 0) / scoredSubs.length)
    : null;

  // Hoạt động luyện nghe 7 ngày
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: logs } = await supabase
    .from("student_logs")
    .select("study_minutes, listen_count, created_at")
    .eq("student_id", studentId)
    .gte("created_at", since7)
    .order("created_at", { ascending: false });

  const totalMinutes = (logs ?? []).reduce((s, r) => s + (r.study_minutes ?? 0), 0);
  const totalListens = (logs ?? []).reduce((s, r) => s + (r.listen_count ?? 0), 0);

  const ATT_COLOR: Record<string, string> = {
    present: "bg-tertiary-fixed text-on-tertiary-fixed",
    absent: "bg-error-container text-on-error-container",
    late: "bg-secondary-fixed text-on-secondary-fixed",
  };
  const ATT_LABEL: Record<string, string> = { present: "Có mặt", absent: "Vắng", late: "Muộn" };

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-4xl flex-col gap-lg">
        {/* Header */}
        <div className="flex items-start gap-md">
          <Link
            href="/teacher/monitor"
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-primary-fixed"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-md">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-display text-display-sm font-bold text-on-primary-fixed">
              {(student.full_name ?? "?").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-display-md">{student.full_name ?? "(Chưa có tên)"}</h1>
              <p className="text-body-md text-on-surface-variant">{student.email}</p>
              <div className="mt-xs flex flex-wrap gap-1">
                {classes.map((c) => (
                  <span key={c.id} className="rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-on-primary-fixed">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tổng quan */}
        <div className="grid grid-cols-2 gap-md sm:grid-cols-4">
          <Card padding="md" className="text-center">
            <div className="mx-auto mb-xs flex h-10 w-10 items-center justify-center rounded-full bg-tertiary-fixed text-tertiary">
              <ClipboardCheck size={20} />
            </div>
            <p className="font-display text-display-sm text-tertiary">{attRate !== null ? `${attRate}%` : "—"}</p>
            <p className="text-label-md text-on-surface-variant">Tỉ lệ đi học</p>
            <p className="text-label-sm text-on-surface-variant">30 ngày</p>
          </Card>
          <Card padding="md" className="text-center">
            <div className="mx-auto mb-xs flex h-10 w-10 items-center justify-center rounded-full bg-secondary-fixed text-secondary">
              <BookOpen size={20} />
            </div>
            <p className="font-display text-display-sm text-secondary">{avgScore !== null ? `${avgScore}/10` : "—"}</p>
            <p className="text-label-md text-on-surface-variant">Điểm TB</p>
            <p className="text-label-sm text-on-surface-variant">{scoredSubs.length} bài</p>
          </Card>
          <Card padding="md" className="text-center">
            <div className="mx-auto mb-xs flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed text-primary">
              <Headphones size={20} />
            </div>
            <p className="font-display text-display-sm text-primary">{totalListens}</p>
            <p className="text-label-md text-on-surface-variant">Lượt nghe</p>
            <p className="text-label-sm text-on-surface-variant">7 ngày</p>
          </Card>
          <Card padding="md" className="text-center">
            <div className="mx-auto mb-xs flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed text-primary">
              <TrendingUp size={20} />
            </div>
            <p className="font-display text-display-sm text-primary">{totalMinutes}&apos;</p>
            <p className="text-label-md text-on-surface-variant">Phút học</p>
            <p className="text-label-sm text-on-surface-variant">7 ngày</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
          {/* Điểm danh gần nhất */}
          <section className="flex flex-col gap-sm">
            <h2 className="flex items-center gap-2 text-headline-sm">
              <Calendar size={18} className="text-primary" /> Điểm danh 30 ngày
              <span className="ml-auto flex gap-3 text-label-sm font-normal text-on-surface-variant">
                <span className="text-tertiary">{presentCount} có mặt</span>
                <span className="text-error">{absentCount} vắng</span>
                <span className="text-secondary">{lateCount} muộn</span>
              </span>
            </h2>
            {attendance.length === 0 ? (
              <Card padding="md">
                <p className="text-center text-body-md text-on-surface-variant">Chưa có dữ liệu điểm danh.</p>
              </Card>
            ) : (
              <Card padding="none">
                <ul className="divide-y divide-outline-variant">
                  {attendance.slice(0, 15).map((row, i) => (
                    <li key={i} className="flex items-center gap-md px-lg py-2.5">
                      <span className="w-24 shrink-0 text-label-md text-on-surface-variant">
                        {new Date(row.date + "T00:00:00").toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-label-md text-on-surface-variant">
                        {(row.classes as { name: string } | null)?.name ?? "—"}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-label-sm font-medium ${ATT_COLOR[row.status] ?? "bg-surface-container"}`}>
                        {ATT_LABEL[row.status] ?? row.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>

          {/* Kết quả bài tập */}
          <section className="flex flex-col gap-sm">
            <h2 className="flex items-center gap-2 text-headline-sm">
              <BookOpen size={18} className="text-primary" /> Kết quả bài tập
            </h2>
            {submissions.length === 0 ? (
              <Card padding="md">
                <p className="text-center text-body-md text-on-surface-variant">Chưa nộp bài tập nào.</p>
              </Card>
            ) : (
              <div className="flex flex-col gap-sm">
                {submissions.map((sub, i) => {
                  const asgn = sub.assignments;
                  const scoreColor =
                    sub.score === null ? "text-on-surface-variant"
                    : sub.score >= 8 ? "text-tertiary"
                    : sub.score >= 5 ? "text-primary"
                    : "text-error";
                  return (
                    <Card key={i} padding="md" className="flex items-start gap-md">
                      <div className="min-w-0 flex-1">
                        <p className="text-body-md font-semibold">{asgn?.title ?? "Bài tập"}</p>
                        <p className="text-label-sm text-on-surface-variant">
                          {(asgn?.classes as { name: string } | null)?.name ?? "—"} •{" "}
                          {new Date(sub.created_at).toLocaleDateString("vi-VN")}
                        </p>
                        {sub.feedback && (
                          <p className="mt-xs text-label-sm italic text-on-surface-variant">
                            💬 {sub.feedback}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 font-display text-headline-sm font-bold ${scoreColor}`}>
                        {sub.score !== null ? `${sub.score}/10` : "—"}
                      </span>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
