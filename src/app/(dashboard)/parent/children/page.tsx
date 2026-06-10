import { Plus, Baby, Wifi, WifiOff, GraduationCap, Trash2 } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isDemoId, DEMO_PARENT_CHILDREN } from "@/lib/demo-data";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";
import { LinkChildForm } from "@/components/parent/LinkChildForm";

export const dynamic = "force-dynamic";

interface ChildRow {
  student_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  last_seen: string | null;
  class_names: string[];
}

function isOnline(lastSeen: string | null) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
}

export default async function ChildrenPage() {
  const profile = await requireRole("parent");
  const demo = isDemoId(profile.id);

  let children: ChildRow[] = [];
  if (demo) {
    children = DEMO_PARENT_CHILDREN as unknown as ChildRow[];
  } else {
    try {
      const supabase = await createClient();
      const { data } = await supabase.rpc("get_my_children");
      children = (data as ChildRow[]) ?? [];
    } catch { /* chưa cấu hình Supabase */ }
  }

  return (
    <DashboardShell role="parent" userName={profile.full_name || "Phụ huynh"}>
      <div className="mx-auto flex max-w-3xl flex-col gap-lg">
        <div>
          <h1 className="text-display-lg">Con của tôi</h1>
          <p className="mt-xs text-body-lg text-on-surface-variant">
            Quản lý danh sách tài khoản học sinh đã liên kết.
          </p>
        </div>

        <LinkChildForm />

        {children.length === 0 ? (
          <EmptyState
            icon={Baby}
            title="Chưa liên kết với học sinh nào"
            description="Nhập email tài khoản của con ở trên để bắt đầu theo dõi."
          />
        ) : (
          <div className="flex flex-col gap-md">
            <h2 className="text-headline-sm">Đã liên kết ({children.length})</h2>
            {children.map((c) => {
              const online = isOnline(c.last_seen);
              const initials = (c.full_name ?? "?").charAt(0).toUpperCase();
              return (
                <Card key={c.student_id} className="flex items-center gap-md">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-display text-headline-sm font-bold text-on-primary-fixed">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-body-md font-semibold">{c.full_name ?? "(Chưa có tên)"}</p>
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-medium ${online ? "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-surface-container text-on-surface-variant"}`}>
                        {online ? <Wifi size={12} /> : <WifiOff size={12} />}
                        {online ? "Online" : "Offline"}
                      </span>
                    </div>
                    <p className="truncate text-label-md text-on-surface-variant">{c.email}</p>
                    {c.class_names?.length > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-label-sm text-on-surface-variant">
                        <GraduationCap size={12} /> {c.class_names.join(", ")}
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
