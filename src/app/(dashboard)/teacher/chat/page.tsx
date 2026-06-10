import { MessageCircle, Users } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState } from "@/components/EmptyState";
import { TeacherChatClient } from "@/components/chat/TeacherChatClient";

export const dynamic = "force-dynamic";

export default async function TeacherChatPage() {
  const profile = await requireRole("teacher");
  const supabase = await createClient();

  // Lấy danh sách lớp giáo viên dạy
  const { data: classTeachers } = await supabase
    .from("class_teachers")
    .select("class_id, class:classes(id, name)")
    .eq("teacher_id", profile.id);

  const classes = (classTeachers ?? []).flatMap((r) => {
    const cls = r.class as unknown as { id: string; name: string } | null;
    return cls ? [cls] : [];
  });

  const classIds = classes.map((c) => c.id);

  // Lấy danh sách học sinh trong các lớp đó
  let students: Array<{ id: string; name: string; class_id: string; class_name: string }> = [];
  if (classIds.length > 0) {
    const { data: enrollments } = await supabase
      .from("class_students")
      .select("student_id, class:classes(id, name)")
      .in("class_id", classIds);

    const studentIds = [...new Set((enrollments ?? []).map((e) => e.student_id))];
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Học sinh"]));
      students = (enrollments ?? []).map((e) => {
        const cls = e.class as unknown as { id: string; name: string } | null;
        return {
          id: e.student_id,
          name: profileMap.get(e.student_id) ?? "Học sinh",
          class_id: cls?.id ?? "",
          class_name: cls?.name ?? "—",
        };
      });
    }
  }

  // Lấy conversations hiện có + unread count
  const { data: convRows } = await supabase
    .from("conversations")
    .select(`
      id, student_id, class_id, last_message_at,
      class:classes(name),
      messages(count)
    `)
    .eq("teacher_id", profile.id)
    .order("last_message_at", { ascending: false });

  // Đếm unread per conversation
  const convIds = (convRows ?? []).map((c) => c.id as string);
  let unreadMap = new Map<string, number>();
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

  const studentNameMap = new Map(students.map((s) => [s.id, s.name]));
  const existingConvStudentIds = new Set((convRows ?? []).map((c) => c.student_id as string));

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      {students.length === 0 ? (
        <div className="mx-auto max-w-xl">
          <EmptyState
            icon={Users}
            title="Chưa có học sinh"
            description="Bạn cần có lớp học và học sinh ghi danh trước khi bắt đầu nhắn tin."
          />
        </div>
      ) : (
        <TeacherChatClient
          myId={profile.id}
          myName={profile.full_name ?? "Giáo viên"}
          students={students}
          existingConversations={(convRows ?? []).map((c) => {
            const cls = c.class as unknown as { name: string } | null;
            return {
              id: c.id as string,
              student_id: c.student_id as string,
              class_id: c.class_id as string,
              class_name: cls?.name ?? "—",
              student_name: studentNameMap.get(c.student_id as string) ?? "Học sinh",
              last_message_at: c.last_message_at as string,
              unread_count: unreadMap.get(c.id as string) ?? 0,
            };
          })}
          newStudents={students.filter((s) => !existingConvStudentIds.has(s.id))}
        />
      )}
    </DashboardShell>
  );
}
