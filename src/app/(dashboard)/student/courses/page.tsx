import Link from "next/link";
import { GraduationCap, Users, BookOpen, ArrowRight, AlertCircle, Megaphone } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card, Chip } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

interface ClassRow {
  id: string;
  name: string;
  year: string | null;
  joined_at: string;
  totalLectures: number;
}

interface AnnouncementRow {
  id: string;
  content: string;
  created_at: string;
  class_name: string;
}

export default async function StudentCoursesPage() {
  const profile = await requireRole("student");

  let classes: ClassRow[] = [];
  let announcements: AnnouncementRow[] = [];
  let fetchError = false;

  if (profile.id.startsWith("demo-")) {
    classes = [
      { id: "demo-1", name: "Lớp Demo A1 — Cơ bản", year: "2025-2026", joined_at: new Date().toISOString(), totalLectures: 5 },
      { id: "demo-2", name: "Lớp Demo B2 — Nâng cao", year: "2025-2026", joined_at: new Date().toISOString(), totalLectures: 3 },
    ];
    announcements = [
      { id: "ann-1", content: "Nhớ ôn tập bài nghe Unit 5 trước buổi học thứ 3 tuần này nhé!", created_at: new Date(Date.now() - 3600_000).toISOString(), class_name: "Lớp Demo A1 — Cơ bản" },
      { id: "ann-2", content: "Lớp sẽ thi giữa kỳ vào ngày 20/07. Các em cần chuẩn bị kỹ từ Unit 1–6.", created_at: new Date(Date.now() - 86400_000).toISOString(), class_name: "Lớp Demo A1 — Cơ bản" },
    ];
  } else {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("class_students")
        .select(`joined_at, class:classes(id, name, year, lectures(id))`)
        .order("joined_at", { ascending: false });

      if (error) throw error;

      classes = (data ?? []).map((e) => {
        const cls = e.class as unknown as { id: string; name: string; year: string | null; lectures: { id: string }[] };
        return {
          id: cls.id,
          name: cls.name,
          year: cls.year,
          joined_at: e.joined_at,
          totalLectures: cls.lectures?.length ?? 0,
        };
      });

      // Lấy thông báo mới nhất từ tất cả lớp đang học (1 query)
      if (classes.length > 0) {
        const classIds = classes.map((c) => c.id);
        const { data: annData } = await supabase
          .from("class_announcements")
          .select("id, content, created_at, class:classes(name)")
          .in("class_id", classIds)
          .order("created_at", { ascending: false })
          .limit(10);

        announcements = ((annData ?? []) as unknown as {
          id: string; content: string; created_at: string;
          class: { name: string } | null;
        }[]).map((r) => ({
          id: r.id,
          content: r.content,
          created_at: r.created_at,
          class_name: r.class?.name ?? "Lớp học",
        }));
      }
    } catch {
      fetchError = true;
    }
  }

  return (
    <DashboardShell role="student" userName={profile.full_name || "Học sinh"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-xl">

        {/* Header */}
        <div>
          <h1 className="text-display-lg">Lớp học của tôi</h1>
          <p className="mt-xs text-body-lg text-on-surface-variant">
            {fetchError ? "Không thể tải dữ liệu" : `${classes.length} lớp đang tham gia`}
          </p>
        </div>

        {/* Error state */}
        {fetchError && (
          <Card className="border border-error-container bg-error-container/20">
            <div className="flex items-center gap-sm text-on-error-container">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-body-md">Không thể tải danh sách lớp. Vui lòng thử lại sau.</p>
            </div>
          </Card>
        )}

        {/* Empty state */}
        {!fetchError && classes.length === 0 && (
          <EmptyState
            icon={GraduationCap}
            title="Chưa có lớp học"
            description="Bạn chưa được thêm vào lớp nào. Liên hệ giáo viên để được thêm vào lớp học."
          />
        )}

        {/* Thông báo mới nhất từ giáo viên */}
        {announcements.length > 0 && (
          <section className="flex flex-col gap-md">
            <div className="flex items-center gap-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-fixed">
                <Megaphone size={18} className="text-secondary" />
              </span>
              <h2 className="text-headline-sm">Thông báo từ giáo viên</h2>
            </div>
            <div className="flex flex-col gap-sm">
              {announcements.map((ann) => (
                <Card key={ann.id} padding="md" className="border-l-4 border-secondary">
                  <p className="text-label-sm font-semibold text-secondary">{ann.class_name}</p>
                  <p className="mt-xs text-body-md whitespace-pre-wrap">{ann.content}</p>
                  <p className="mt-xs text-label-sm text-on-surface-variant">
                    {new Date(ann.created_at).toLocaleString("vi-VN", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Grid lớp học */}
        {classes.length > 0 && (
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <Link key={cls.id} href="/student/library">
                <Card interactive className="flex h-full flex-col gap-md">
                  {/* Icon + badge năm */}
                  <div className="flex items-start justify-between gap-sm">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                      <GraduationCap size={24} />
                    </span>
                    {cls.year && <Chip color="neutral">{cls.year}</Chip>}
                  </div>

                  {/* Tên lớp */}
                  <div className="flex-1">
                    <h3 className="text-headline-sm">{cls.name}</h3>
                    <p className="mt-xs flex items-center gap-1 text-body-md text-on-surface-variant">
                      <Users size={14} />
                      Tham gia {new Date(cls.joined_at).toLocaleDateString("vi-VN")}
                    </p>
                  </div>

                  {/* Footer: số bài giảng + CTA */}
                  <div className="flex items-center justify-between border-t border-outline-variant pt-md">
                    <div className="flex items-center gap-1 text-body-md text-on-surface-variant">
                      <BookOpen size={14} />
                      <span>{cls.totalLectures} bài giảng</span>
                    </div>
                    <span className="flex items-center gap-1 text-label-sm font-semibold text-primary">
                      Vào học <ArrowRight size={14} />
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
