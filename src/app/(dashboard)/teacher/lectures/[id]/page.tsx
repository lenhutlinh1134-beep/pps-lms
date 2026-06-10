import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  DEMO_LECTURES, DEMO_CLASSES, DEMO_MIN_WATCH_MINUTES,
  demoLectureViewers, isDemoId, CLASS_6A, CLASS_7B,
} from "@/lib/demo-data";
import { DashboardShell } from "@/components/DashboardShell";
import { LectureView, type LectureDetail } from "@/components/lectures/LectureView";
import { LectureComments } from "@/components/lectures/LectureComments";
import { LectureActions } from "@/components/lectures/LectureActions";
import {
  LectureAdminPanel, type LectureViewerRow, type ShareClassOption,
} from "@/components/lectures/LectureAdminPanel";

export const dynamic = "force-dynamic";

export default async function TeacherLecturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole("teacher");

  let lecture: unknown = null;
  let viewers: LectureViewerRow[] = [];
  let classes: ShareClassOption[] = [];
  let sharedIds: string[] = [];
  let homeClassId: string | null = null;
  let minWatch: number | null = null;
  const demo = isDemoId(id);

  // Chế độ demo: phục vụ dữ liệu mẫu, không cần Supabase
  if (demo) {
    const dl = DEMO_LECTURES.find((l) => l.id === id);
    if (!dl) notFound();
    lecture = { ...dl, description: null };
    viewers = demoLectureViewers(id);
    classes = DEMO_CLASSES.map((c) => ({ id: c.id, name: c.name }));
    homeClassId = ["demo-l4", "demo-l5", "demo-l6"].includes(id) ? CLASS_7B : CLASS_6A;
    sharedIds = [homeClassId];
    minWatch = DEMO_MIN_WATCH_MINUTES;
  } else {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("lectures")
        .select("title, description, type, content_url, teacher_name, created_at, class_id, min_watch_minutes, class:classes(name)")
        .eq("id", id)
        .single();
      lecture = data;
      if (data) {
        homeClassId = data.class_id ?? null;
        minWatch = data.min_watch_minutes ?? null;
        const [statsRes, classesRes, sharedRes] = await Promise.all([
          supabase.rpc("get_lecture_watch_stats", { p_lecture_id: id }),
          supabase
            .from("class_teachers")
            .select("class:classes(id, name)")
            .eq("teacher_id", profile.id),
          supabase.from("lecture_classes").select("class_id").eq("lecture_id", id),
        ]);
        viewers = (statsRes.data ?? []) as LectureViewerRow[];
        classes = ((classesRes.data ?? []) as unknown as Array<{ class: ShareClassOption | ShareClassOption[] | null }>)
          .flatMap((r) => (Array.isArray(r.class) ? r.class : r.class ? [r.class] : []));
        sharedIds = ((sharedRes.data ?? []) as Array<{ class_id: string }>).map((r) => r.class_id);
      }
    } catch {
      lecture = null;
    }
    if (!lecture) notFound();
  }

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-4xl flex-col gap-lg">
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

        {/* Bảng quản trị: người xem + thời gian + cảnh báo + chia sẻ lớp */}
        <LectureAdminPanel
          lectureId={id}
          demo={demo}
          initialMinWatch={minWatch}
          viewers={viewers}
          classes={classes}
          initialSharedIds={sharedIds}
          homeClassId={homeClassId}
        />

        <LectureComments lectureId={id} />
      </div>
    </DashboardShell>
  );
}
