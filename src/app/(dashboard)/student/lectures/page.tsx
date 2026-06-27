import Link from "next/link";
import { BookOpen, ArrowLeft, GraduationCap } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState } from "@/components/EmptyState";
import { type LectureItem } from "@/components/lectures/LectureGrid";
import { LectureBrowser } from "@/components/lectures/LectureBrowser";

export const dynamic = "force-dynamic";

export default async function StudentLecturesPage({
  searchParams,
}: {
  searchParams: Promise<{ class_id?: string }>;
}) {
  const { class_id: classId } = await searchParams;
  const profile = await requireRole("student");

  let lectures: LectureItem[] = [];
  let watchedIds: string[] = [];
  let className: string | null = null;

  if (profile.id.startsWith("demo-")) {
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
    if (classId) className = "Lớp Demo A1";
  } else {
    try {
      const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      const db = hasServiceKey ? getAdminSupabase() : await createClient();

      // Lấy danh sách lớp học sinh đang học
      const { data: enrollments } = await db
        .from("class_students")
        .select("class_id")
        .eq("student_id", profile.id);
      const myClassIds = (enrollments ?? []).map((e: { class_id: string }) => e.class_id);

      if (myClassIds.length > 0) {
        // Lấy lecture_ids được chia sẻ thêm cho các lớp của học sinh
        const { data: shared } = await db
          .from("lecture_classes")
          .select("lecture_id")
          .in("class_id", myClassIds);
        const sharedLectureIds = (shared ?? []).map((s: { lecture_id: string }) => s.lecture_id);

        let query = db
          .from("lectures")
          .select("id, title, type, teacher_name, created_at, class:classes!lectures_class_id_fkey(name)")
          .order("created_at", { ascending: false });

        if (classId) {
          // Xem bài giảng của 1 lớp cụ thể
          const classSharedIds = (shared ?? [])
            .filter((_s: { lecture_id: string }) => true)
            .map((s: { lecture_id: string }) => s.lecture_id);
          if (classSharedIds.length > 0) {
            query = query.or(`class_id.eq.${classId},id.in.(${classSharedIds.join(",")})`);
          } else {
            query = query.eq("class_id", classId);
          }
        } else {
          // Xem tất cả bài giảng của các lớp học sinh đang học
          if (sharedLectureIds.length > 0) {
            query = query.or(`class_id.in.(${myClassIds.join(",")}),id.in.(${sharedLectureIds.join(",")})`);
          } else {
            query = query.in("class_id", myClassIds);
          }
        }

        const { data } = await query;
        lectures = (data as unknown as LectureItem[]) ?? [];
      }

      // Bài giảng đã xem (dùng regular client để lấy đúng student_id = auth.uid())
      const regularClient = await createClient();
      const { data: views } = await regularClient
        .from("lecture_views")
        .select("lecture_id")
        .eq("student_id", profile.id);
      watchedIds = (views ?? []).map((v: { lecture_id: string }) => v.lecture_id);

      if (classId) {
        const { data: cls } = await db.from("classes").select("name").eq("id", classId).single();
        className = (cls as { name: string } | null)?.name ?? null;
      }
    } catch {
      lectures = [];
    }
  }

  const backHref = classId ? "/student/courses" : "/student";
  const backLabel = classId ? "Lớp học của tôi" : "Về trang chủ";

  return (
    <DashboardShell role="student" userName={profile.full_name || "Học sinh"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-lg">
        <div>
          <Link
            href={backHref}
            className="mb-sm inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary"
          >
            <ArrowLeft size={16} /> {backLabel}
          </Link>
          <div className="flex items-center gap-md">
            <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-secondary-fixed text-secondary">
              {classId ? <GraduationCap size={28} /> : <BookOpen size={28} />}
            </span>
            <div>
              <h1 className="text-display-lg">
                {className ?? "Học lý thuyết"}
              </h1>
              <p className="mt-xs text-body-lg text-on-surface-variant">
                {className ? "Bài giảng & video của lớp này" : "Video & bài giảng từ giáo viên của bạn"}
              </p>
            </div>
          </div>
        </div>

        {lectures.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Chưa có bài giảng nào"
            description={
              className
                ? `Lớp ${className} chưa có bài giảng nào. Giáo viên sẽ sớm đăng tài liệu.`
                : "Khi giáo viên đăng video hoặc tài liệu cho lớp của bạn, chúng sẽ hiện ở đây."
            }
          />
        ) : (
          <>
            <div className="flex items-center gap-md rounded-lg bg-surface-container-low p-md">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className="h-full rounded-full bg-premium"
                  style={{ width: `${Math.round((watchedIds.length / lectures.length) * 100)}%` }}
                />
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
