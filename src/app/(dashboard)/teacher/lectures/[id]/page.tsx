import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DEMO_LECTURES, isDemoId } from "@/lib/demo-data";
import { DashboardShell } from "@/components/DashboardShell";
import { LectureView, type LectureDetail } from "@/components/lectures/LectureView";
import { LectureComments } from "@/components/lectures/LectureComments";
import { LectureActions } from "@/components/lectures/LectureActions";

export const dynamic = "force-dynamic";

export default async function TeacherLecturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole("teacher");

  let lecture: unknown = null;
  let viewCount = 0;

  // Chế độ demo: phục vụ dữ liệu mẫu, không cần Supabase
  if (isDemoId(id)) {
    const dl = DEMO_LECTURES.find((l) => l.id === id);
    if (!dl) notFound();
    lecture = { ...dl, description: null };
    viewCount = 7;
  } else {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("lectures")
        .select("title, description, type, content_url, teacher_name, created_at, class:classes(name)")
        .eq("id", id)
        .single();
      lecture = data;
      if (lecture) {
        const { count } = await supabase
          .from("lecture_views")
          .select("*", { count: "exact", head: true })
          .eq("lecture_id", id);
        viewCount = count ?? 0;
      }
    } catch {
      lecture = null;
    }
    if (!lecture) notFound();
  }

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-3xl flex-col gap-lg">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <Link
            href="/teacher/lectures"
            className="inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary"
          >
            <ArrowLeft size={16} /> Danh sách bài giảng
          </Link>
          <LectureActions lectureId={id} />
        </div>

        <LectureView lecture={lecture as unknown as LectureDetail} />

        <p className="flex items-center gap-2 text-label-md text-on-surface-variant">
          <Eye size={16} /> {viewCount} học sinh đã đánh dấu đã học
        </p>

        <LectureComments lectureId={id} />
      </div>
    </DashboardShell>
  );
}
