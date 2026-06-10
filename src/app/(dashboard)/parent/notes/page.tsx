import { MessageSquare, Baby } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isDemoId, DEMO_PARENT_NOTES } from "@/lib/demo-data";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

interface NoteRow {
  id: string;
  note: string;
  created_at: string;
  student: { full_name: string | null } | null;
  class: { name: string } | null;
}

export default async function ParentNotesPage() {
  const profile = await requireRole("parent");
  const demo = isDemoId(profile.id);

  let childIds: string[] = [];
  let notes: NoteRow[] = [];

  if (demo) {
    childIds = ["demo-s1"];
    notes = DEMO_PARENT_NOTES.map((n) => ({
      id: n.id,
      note: n.note,
      created_at: n.created_at,
      student: { full_name: n.student_name },
      class: { name: n.class_name },
    }));
  } else {
    try {
      const supabase = await createClient();
      const { data: links } = await supabase.from("parent_student").select("student_id").eq("parent_id", profile.id);
      childIds = (links ?? []).map((l) => l.student_id);
      if (childIds.length > 0) {
        const { data } = await supabase
          .from("teacher_notes")
          .select("id, note, created_at, student:profiles!student_id(full_name), class:classes(name)")
          .in("student_id", childIds)
          .order("created_at", { ascending: false })
          .limit(50);
        notes = (data as unknown as NoteRow[]) ?? [];
      }
    } catch { /* bỏ qua lỗi */ }
  }

  return (
    <DashboardShell role="parent" userName={profile.full_name || "Phụ huynh"}>
      <div className="mx-auto flex max-w-3xl flex-col gap-lg">
        <div>
          <h1 className="text-display-lg">Nhận xét từ giáo viên</h1>
          <p className="mt-xs text-body-lg text-on-surface-variant">
            Tất cả nhận xét & lưu ý của giáo viên dành cho con bạn.
          </p>
        </div>

        {childIds.length === 0 ? (
          <EmptyState
            icon={Baby}
            title="Chưa liên kết với học sinh nào"
            description="Vào mục Con của tôi để liên kết tài khoản con trước."
          />
        ) : notes.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Chưa có nhận xét nào"
            description="Các nhận xét từ giáo viên sẽ hiện ở đây."
          />
        ) : (
          <div className="flex flex-col gap-sm">
            {notes.map((n) => {
              const sName = (n.student as unknown as { full_name: string | null } | null)?.full_name;
              const cName = (n.class as unknown as { name: string } | null)?.name;
              return (
                <Card key={n.id} padding="md" className="flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {sName && <span className="text-body-md font-semibold text-primary">{sName}</span>}
                      {cName && <span className="ml-2 text-label-sm text-on-surface-variant">• {cName}</span>}
                    </div>
                    <span className="shrink-0 text-label-sm text-on-surface-variant">
                      {new Date(n.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-body-md text-on-surface">{n.note}</p>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
