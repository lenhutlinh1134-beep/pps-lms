import Link from "next/link";
import { Baby, Plus, MessageSquare, Wifi, WifiOff, GraduationCap, ArrowRight, ClipboardCheck } from "lucide-react";
import { NewsWidget } from "@/components/news/NewsWidget";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatTile, EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

interface ChildRow {
  student_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  last_seen: string | null;
  class_names: string[];
}

interface NoteRow {
  id: string;
  note: string;
  created_at: string;
  student_id: string;
}

interface AttRow {
  student_id: string;
  date: string;
  status: "present" | "absent" | "late";
}

function isOnline(lastSeen: string | null) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
}

export default async function ParentDashboard() {
  const profile = await requireRole("parent");

  let children: ChildRow[] = [];
  let recentNotes: NoteRow[] = [];
  let weekAttendance: AttRow[] = [];

  try {
    const supabase = await createClient();
    const { data: childrenRaw } = await supabase.rpc("get_my_children");
    children = (childrenRaw as ChildRow[]) ?? [];
    const childIds = children.map((c) => c.student_id);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    if (childIds.length > 0) {
      const [notesRes, attRes] = await Promise.all([
        supabase
          .from("teacher_notes")
          .select("id, note, created_at, student_id")
          .in("student_id", childIds)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("attendance")
          .select("student_id, date, status")
          .in("student_id", childIds)
          .gte("date", weekAgo),
      ]);
      recentNotes = (notesRes.data as NoteRow[]) ?? [];
      weekAttendance = (attRes.data as AttRow[]) ?? [];
    }
  } catch { /* bỏ qua lỗi khi chưa cấu hình Supabase */ }

  const newNotesCount = recentNotes.filter(
    (n) => Date.now() - new Date(n.created_at).getTime() < 2 * 24 * 60 * 60 * 1000,
  ).length;

  const presentCount = weekAttendance.filter((a) => a.status === "present").length;
  const absentCount = weekAttendance.filter((a) => a.status === "absent").length;

  return (
    <DashboardShell role="parent" userName={profile.full_name || "Phụ huynh"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-lg">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div>
            <h1 className="text-display-lg">Theo dõi con</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Nắm bắt tiến trình học, điểm danh và nhận xét của giáo viên.
            </p>
          </div>
          <Link href="/parent/children">
            <Button><Plus size={20} /> Liên kết con</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-md lg:grid-cols-3">
          <StatTile label="Con đang theo dõi" value={`${children.length}`} hint={children.length === 0 ? "Chưa liên kết" : undefined} />
          <StatTile label="Buổi có mặt / tuần" value={children.length ? `${presentCount}` : "—"} />
          <StatTile label="Nhận xét mới (2 ngày)" value={`${newNotesCount}`} />
        </div>

        {children.length === 0 ? (
          <EmptyState
            icon={Baby}
            title="Chưa liên kết với học sinh nào"
            description="Liên kết tài khoản con để bắt đầu theo dõi tiến trình học tập và nhận thông báo từ giáo viên."
            action={
              <Link href="/parent/children">
                <Button><Plus size={20} /> Liên kết với con</Button>
              </Link>
            }
          />
        ) : (
          <>
            {/* Danh sách con */}
            <section>
              <div className="mb-md flex items-center justify-between">
                <h2 className="text-headline-sm">Con của tôi ({children.length})</h2>
                <Link href="/parent/children" className="text-label-md font-semibold text-primary">
                  Quản lý
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
                {children.map((c) => {
                  const online = isOnline(c.last_seen);
                  return (
                    <Card key={c.student_id} className="flex flex-col gap-md">
                      <div className="flex items-center gap-md">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-display text-headline-sm font-bold text-on-primary-fixed">
                          {(c.full_name ?? "?").charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body-md font-semibold">{c.full_name ?? "(Chưa có tên)"}</p>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-medium ${online ? "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-surface-container text-on-surface-variant"}`}>
                            {online ? <Wifi size={12} /> : <WifiOff size={12} />}
                            {online ? "Online" : "Offline"}
                          </span>
                        </div>
                      </div>
                      {c.class_names?.length > 0 && (
                        <p className="flex items-center gap-1 text-label-md text-on-surface-variant">
                          <GraduationCap size={14} /> {c.class_names.slice(0, 2).join(", ")}
                        </p>
                      )}
                      {/* Điểm danh tuần */}
                      {(() => {
                        const att = weekAttendance.filter((a) => a.student_id === c.student_id);
                        const p = att.filter((a) => a.status === "present").length;
                        const ab = att.filter((a) => a.status === "absent").length;
                        return att.length > 0 ? (
                          <div className="flex gap-sm text-label-sm">
                            <span className="flex items-center gap-1 text-tertiary"><ClipboardCheck size={12} /> {p} có mặt</span>
                            {ab > 0 && <span className="text-error">{ab} vắng</span>}
                          </div>
                        ) : null;
                      })()}
                    </Card>
                  );
                })}
              </div>
            </section>

            {/* Tin tức & Thông báo */}
            <NewsWidget role="parent" />

            {/* Nhận xét gần đây */}
            <section>
              <div className="mb-md flex items-center justify-between">
                <h2 className="text-headline-sm">Nhận xét gần đây</h2>
                <Link href="/parent/notes" className="flex items-center gap-1 text-label-md font-semibold text-primary">
                  Xem tất cả <ArrowRight size={14} />
                </Link>
              </div>
              {recentNotes.length === 0 ? (
                <Card className="flex items-center gap-md">
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary-fixed text-secondary">
                    <MessageSquare size={22} />
                  </span>
                  <p className="text-body-md text-on-surface-variant">Chưa có nhận xét nào từ giáo viên.</p>
                </Card>
              ) : (
                <div className="flex flex-col gap-sm">
                  {recentNotes.slice(0, 3).map((n) => {
                    const child = children.find((c) => c.student_id === n.student_id);
                    return (
                      <Card key={n.id} padding="md" className="flex flex-col gap-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-body-md font-semibold text-primary">
                            {child?.full_name ?? "Con"}
                          </span>
                          <span className="shrink-0 text-label-sm text-on-surface-variant">
                            {new Date(n.created_at).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-body-md text-on-surface">{n.note}</p>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
