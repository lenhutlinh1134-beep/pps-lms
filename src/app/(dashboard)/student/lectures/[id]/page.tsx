import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { LectureView, type LectureDetail } from "@/components/lectures/LectureView";
import { LectureComments } from "@/components/lectures/LectureComments";
import { MarkWatched } from "@/components/lectures/MarkWatched";
import { WatchTracker } from "@/components/lectures/WatchTracker";

export const dynamic = "force-dynamic";

export default async function StudentLecturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole("student");

  const DEMO_LECTURES: Record<string, unknown> = {
    "demo-lecture-001": {
      title: "[DEMO] Phát âm chuẩn tiếng Anh — Bảng chữ cái IPA",
      description: "Hướng dẫn phát âm các âm chuẩn trong tiếng Anh theo bảng IPA (International Phonetic Alphabet). Bài học phù hợp cho học sinh mới bắt đầu.",
      type: "theory",
      content_url: "https://www.youtube.com/watch?v=n4NVPg2kHv4",
      teacher_name: "PPS Demo Teacher",
      created_at: new Date().toISOString(),
      class: { name: "Lớp Demo A1" },
    },
    "demo-lecture-002": {
      title: "[DEMO] Grammar: Thì hiện tại đơn (Present Simple)",
      description: "Bài giảng về cách dùng thì hiện tại đơn trong tiếng Anh: công thức, cách chia động từ, và các ví dụ thực tế.",
      type: "video",
      content_url: "https://www.youtube.com/watch?v=muOFBbyNJAU",
      teacher_name: "PPS Demo Teacher",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      class: { name: "Lớp Demo A1" },
    },
  };

  let lecture: unknown = null;
  if (id.startsWith("demo-")) {
    lecture = DEMO_LECTURES[id] ?? null;
  } else {
    try {
      const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      const db = hasServiceKey ? getAdminSupabase() : await createClient();
      const { data } = await db
        .from("lectures")
        .select("title, description, type, content_url, teacher_name, created_at, class_id, class:classes!lectures_class_id_fkey(name)")
        .eq("id", id)
        .single();

      // Kiểm tra học sinh có trong lớp của bài giảng này không
      if (data) {
        const { data: enrolled } = await db
          .from("class_students")
          .select("class_id")
          .eq("student_id", profile.id)
          .eq("class_id", (data as { class_id: string }).class_id)
          .maybeSingle();
        // Cũng kiểm tra lecture_classes (bài giảng được chia sẻ thêm)
        const { data: shared } = await db
          .from("lecture_classes")
          .select("class_id")
          .eq("lecture_id", id)
          .in("class_id",
            ((await db.from("class_students").select("class_id").eq("student_id", profile.id)).data ?? [])
              .map((e: { class_id: string }) => e.class_id)
          )
          .maybeSingle();
        if (enrolled || shared) {
          lecture = data;
        }
      }
    } catch {
      lecture = null;
    }
  }
  if (!lecture) notFound();

  return (
    <DashboardShell role="student" userName={profile.full_name || "Học sinh"}>
      <div className="mx-auto max-w-7xl">
        {/* Back link */}
        <Link
          href="/student/lectures"
          className="mb-md inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary"
        >
          <ArrowLeft size={16} /> Tất cả bài giảng
        </Link>

        {/* 2-column layout: video+info bên trái, comments cố định bên phải */}
        <div className="grid grid-cols-1 items-start gap-lg lg:grid-cols-[1fr_400px]">
          {/* Cột trái: video + mark watched */}
          <div className="flex min-w-0 flex-col gap-md">
            <LectureView lecture={lecture as unknown as LectureDetail} />
            <MarkWatched lectureId={id} />
            <WatchTracker lectureId={id} />
          </div>

          {/* Cột phải: comments (sticky khi desktop) */}
          <div className="lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto">
            <LectureComments lectureId={id} />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
