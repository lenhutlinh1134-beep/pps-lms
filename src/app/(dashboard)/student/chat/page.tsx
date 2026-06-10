import { MessageCircle } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState } from "@/components/EmptyState";
import { StudentChatClient } from "@/components/chat/StudentChatClient";

export const dynamic = "force-dynamic";

export default async function StudentChatPage() {
  const profile = await requireRole("student");
  const supabase = await createClient();

  // Lấy lớp học + giáo viên của học sinh
  const { data: enrollments } = await supabase
    .from("class_students")
    .select("class_id, class:classes(id, name)")
    .eq("student_id", profile.id);

  const classIds = (enrollments ?? []).map((e) => e.class_id);

  let teachers: Array<{ id: string; name: string; class_id: string; class_name: string }> = [];
  if (classIds.length > 0) {
    const { data: classTeachers } = await supabase
      .from("class_teachers")
      .select("teacher_id, class_id, class:classes(name)")
      .in("class_id", classIds);

    const teacherIds = [...new Set((classTeachers ?? []).map((r) => r.teacher_id))];
    if (teacherIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", teacherIds);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Giáo viên"]));

      teachers = (classTeachers ?? []).map((r) => {
        const cls = r.class as unknown as { name: string } | null;
        return {
          id: r.teacher_id,
          name: profileMap.get(r.teacher_id) ?? "Giáo viên",
          class_id: r.class_id,
          class_name: cls?.name ?? "—",
        };
      });
    }
  }

  // Lấy conversations hiện có
  const { data: convRows } = await supabase
    .from("conversations")
    .select("id, teacher_id, class_id, last_message_at, class:classes(name)")
    .eq("student_id", profile.id)
    .order("last_message_at", { ascending: false });

  const convIds = (convRows ?? []).map((c) => c.id as string);
  const unreadMap = new Map<string, number>();
  if (convIds.length > 0) {
    const { data: unreadRows } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", convIds)
      .neq("sender_id", profile.id)
      .eq("is_read", false);
    (unreadRows ?? []).forEach((r) => {
      const cid = r.conversation_id as string;
      unreadMap.set(cid, (unreadMap.get(cid) ?? 0) + 1);
    });
  }

  const teacherNameMap = new Map(teachers.map((t) => [t.id, t.name]));
  const existingConvTeacherIds = new Set((convRows ?? []).map((c) => c.teacher_id as string));

  return (
    <DashboardShell role="student" userName={profile.full_name || "Học sinh"}>
      {teachers.length === 0 ? (
        <div className="mx-auto max-w-xl">
          <EmptyState
            icon={MessageCircle}
            title="Chưa có giáo viên"
            description="Bạn cần được ghi danh vào lớp có giáo viên trước khi nhắn tin."
          />
        </div>
      ) : (
        <StudentChatClient
          myId={profile.id}
          teachers={teachers}
          existingConversations={(convRows ?? []).map((c) => {
            const cls = c.class as unknown as { name: string } | null;
            return {
              id: c.id as string,
              teacher_id: c.teacher_id as string,
              class_id: c.class_id as string,
              class_name: cls?.name ?? "—",
              teacher_name: teacherNameMap.get(c.teacher_id as string) ?? "Giáo viên",
              last_message_at: c.last_message_at as string,
              unread_count: unreadMap.get(c.id as string) ?? 0,
            };
          })}
          newTeachers={teachers.filter((t) => !existingConvTeacherIds.has(t.id))}
        />
      )}
    </DashboardShell>
  );
}
