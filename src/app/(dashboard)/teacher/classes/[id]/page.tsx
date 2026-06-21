import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, School } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { ClassManager, type ClassTab } from "@/components/teacher/ClassManager";
import { ClassAnnouncementPanel, type AnnouncementItem } from "@/components/teacher/ClassAnnouncementPanel";
import { InviteCodeCard } from "@/components/teacher/InviteCodeCard";
import { isDemoId, demoClass, demoStudents } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

interface Student { id: string; full_name: string | null; email: string | null }

const CLASS_TABS: ClassTab[] = ["students", "attendance", "history", "notes", "flags", "teachers"];

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const initialTab: ClassTab = CLASS_TABS.includes(tab as ClassTab) ? (tab as ClassTab) : "students";
  const profile = await requireRole("teacher");
  const demo = isDemoId(profile.id);

  let name = "";
  let year: string | null = null;
  let level: string | null = null;
  let schoolName: string | null | undefined = null;
  let students: Student[] = [];
  let announcements: AnnouncementItem[] = [];
  let inviteCode: string | null = null;
  let found = false;

  if (demo) {
    const dc = demoClass(id);
    if (dc) {
      name = dc.name; year = dc.year; level = dc.level; schoolName = dc.school.name;
      students = demoStudents(id);
      announcements = [
        { id: "demo-ann-1", content: "Nhớ ôn tập bài nghe Unit 5 trước buổi học thứ 3 tuần này nhé!", created_at: new Date(Date.now() - 3600_000).toISOString() },
        { id: "demo-ann-2", content: "Lớp sẽ thi giữa kỳ vào ngày 20/07. Các em cần chuẩn bị kỹ từ Unit 1–6.", created_at: new Date(Date.now() - 86400_000).toISOString() },
      ];
      found = true;
    }
  } else {
    try {
      const supabase = await createClient();
      const [classRes, studentsRes, announcementsRes] = await Promise.all([
        supabase.from("classes").select("name, year, level, invite_code, school:schools(name)").eq("id", id).single(),
        supabase.from("class_students").select("student:profiles(id, full_name, email)").eq("class_id", id),
        supabase.from("class_announcements").select("id, content, created_at").eq("class_id", id).order("created_at", { ascending: false }).limit(50),
      ]);
      if (classRes.data) {
        const c = classRes.data as unknown as { name: string; year: string | null; level: string | null; invite_code: string | null; school: { name: string } | { name: string }[] | null };
        name = c.name; year = c.year; level = c.level ?? null; inviteCode = c.invite_code;
        schoolName = Array.isArray(c.school) ? c.school[0]?.name : c.school?.name;
        const rows = (studentsRes.data ?? []) as unknown as Array<{ student: Student | Student[] | null }>;
        students = rows.flatMap((r) => (Array.isArray(r.student) ? r.student : r.student ? [r.student] : []));
        announcements = (announcementsRes.data ?? []) as AnnouncementItem[];
        found = true;
      }
    } catch {
      found = false;
    }
  }
  if (!found) notFound();

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-4xl flex-col gap-lg">
        <div>
          <Link href="/teacher/classes" className="mb-sm inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary">
            <ArrowLeft size={16} /> Danh sách lớp
          </Link>
          <div className="flex flex-wrap items-center gap-sm">
            <h1 className="text-display-lg">{name}</h1>
            {level && (
              <span className="rounded-full bg-primary-fixed px-3 py-1 text-label-md font-bold text-primary">
                Cấp {level}
              </span>
            )}
          </div>
          <div className="mt-xs flex flex-wrap items-center gap-md text-body-md text-on-surface-variant">
            {schoolName && <span className="flex items-center gap-1"><School size={16} /> {schoolName}</span>}
            {year && <span className="flex items-center gap-1"><Calendar size={16} /> {year}</span>}
          </div>
        </div>

        {!demo && <InviteCodeCard classId={id} initialCode={inviteCode} />}
        <ClassManager classId={id} initialStudents={students} demo={demo} initialTab={initialTab} />
        <ClassAnnouncementPanel classId={id} initialItems={announcements} demo={demo} />
      </div>
    </DashboardShell>
  );
}
