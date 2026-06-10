import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { LectureForm, type EditLecture } from "@/components/lectures/LectureForm";

export const dynamic = "force-dynamic";

export default async function EditLecturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole("teacher");

  let lecture: EditLecture | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("lectures")
      .select("id, class_id, type, title, description, content_url")
      .eq("id", id)
      .single();
    lecture = (data as EditLecture) ?? null;
  } catch {
    lecture = null;
  }
  if (!lecture) notFound();

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-2xl flex-col gap-lg">
        <div>
          <Link href={`/teacher/lectures/${id}`} className="mb-sm inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary">
            <ArrowLeft size={16} /> Về bài giảng
          </Link>
          <h1 className="text-display-lg">Sửa bài giảng</h1>
        </div>
        <LectureForm lecture={lecture} />
      </div>
    </DashboardShell>
  );
}
