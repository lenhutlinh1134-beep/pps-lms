import { MessageSquarePlus } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";
import { FeedbackForm } from "@/components/parent/FeedbackForm";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedbackRow {
  id: string;
  content: string;
  reply: string | null;
  replied_at: string | null;
  status: "pending" | "replied";
  created_at: string;
  class_name: string;
  student_name: string;
}

interface ClassOption {
  id: string;
  name: string;
  student_id: string;
  student_name: string;
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_FEEDBACKS: FeedbackRow[] = [
  {
    id: "demo-fb1",
    content: "Con tôi có vẻ gặp khó khăn với bài tập nghe. Nhờ thầy/cô hỗ trợ thêm.",
    reply: "Chào phụ huynh! Tôi đã xem lại bài tập của em và sẽ dành thêm thời gian ôn tập nghe trong buổi tới.",
    replied_at: "2026-06-08T14:30:00Z",
    status: "replied",
    created_at: "2026-06-07T09:00:00Z",
    class_name: "Tiếng Anh Nâng Cao A",
    student_name: "Nguyễn An",
  },
  {
    id: "demo-fb2",
    content: "Xin hỏi lịch thi giữa kỳ của lớp là ngày mấy ạ?",
    reply: null,
    replied_at: null,
    status: "pending",
    created_at: "2026-06-09T10:00:00Z",
    class_name: "Tiếng Anh Cơ Bản B",
    student_name: "Nguyễn Bình",
  },
];

const DEMO_CLASSES: ClassOption[] = [
  { id: "demo-c1", name: "Tiếng Anh Nâng Cao A", student_id: "demo-s1", student_name: "Nguyễn An" },
  { id: "demo-c2", name: "Tiếng Anh Cơ Bản B", student_id: "demo-s2", student_name: "Nguyễn Bình" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ParentFeedbackPage() {
  const profile = await requireRole("parent");
  const isDemo = profile.id.startsWith("demo-");

  let feedbacks: FeedbackRow[] = [];
  let classes: ClassOption[] = [];

  if (isDemo) {
    feedbacks = DEMO_FEEDBACKS;
    classes = DEMO_CLASSES;
  } else {
    const supabase = await createClient();

    // 1. Lấy danh sách feedback đã gửi, join classes
    const { data: fbData } = await supabase
      .from("parent_feedback")
      .select(
        `id, content, reply, replied_at, status, created_at,
         classes(name),
         profiles!parent_feedback_student_id_fkey(full_name)`,
      )
      .eq("parent_id", profile.id)
      .order("created_at", { ascending: false });

    feedbacks = ((fbData ?? []) as unknown[]).map((row: unknown) => {
      const r = row as {
        id: string;
        content: string;
        reply: string | null;
        replied_at: string | null;
        status: "pending" | "replied";
        created_at: string;
        classes: { name: string } | null;
        profiles: { full_name: string | null } | null;
      };
      return {
        id: r.id,
        content: r.content,
        reply: r.reply,
        replied_at: r.replied_at,
        status: r.status,
        created_at: r.created_at,
        class_name: r.classes?.name ?? "Lớp không xác định",
        student_name: r.profiles?.full_name ?? "Học sinh",
      };
    });

    // 2. Lấy danh sách con của PH để query enrollments
    const { data: psData } = await supabase
      .from("parent_student")
      .select("student_id")
      .eq("parent_id", profile.id);
    const childIds = (psData ?? []).map((d: { student_id: string }) => d.student_id);

    // Lấy danh sách lớp của con (thông qua enrollments)
    const { data: classData } = childIds.length > 0
      ? await supabase
          .from("enrollments")
          .select(`class_id, student_id, profiles!enrollments_student_id_fkey(full_name), classes(id, name)`)
          .in("student_id", childIds)
      : { data: [] };

    classes = ((classData ?? []) as unknown[]).map((row: unknown) => {
      const r = row as {
        class_id: string;
        student_id: string;
        classes: { id: string; name: string } | null;
        profiles: { full_name: string | null } | null;
      };
      return {
        id: r.classes?.id ?? r.class_id,
        name: r.classes?.name ?? "Lớp không xác định",
        student_id: r.student_id,
        student_name: r.profiles?.full_name ?? "Học sinh",
      };
    });
  }

  const children = classes.reduce<{ student_id: string; full_name: string }[]>((acc, c) => {
    if (!acc.find((ch) => ch.student_id === c.student_id)) {
      acc.push({ student_id: c.student_id, full_name: c.student_name });
    }
    return acc;
  }, []);

  return (
    <DashboardShell role="parent" userName={profile.full_name || "Phụ huynh"}>
      <div className="mx-auto flex max-w-3xl flex-col gap-lg">
        {/* Header */}
        <div className="flex items-start gap-md">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed">
            <MessageSquarePlus size={24} />
          </span>
          <div>
            <h1 className="text-display-lg">Phản hồi giáo viên</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Gửi nhận xét hoặc câu hỏi đến giáo viên
            </p>
          </div>
        </div>

        {/* Feedback form */}
        <FeedbackForm students={children} classes={classes} />

        {/* Feedback history */}
        <div className="flex flex-col gap-md">
          <h2 className="text-headline-sm">Phản hồi đã gửi ({feedbacks.length})</h2>

          {feedbacks.length === 0 ? (
            <EmptyState
              icon={MessageSquarePlus}
              title="Chưa gửi phản hồi nào"
              description="Hãy dùng form bên trên để gửi nhận xét đến giáo viên của con."
            />
          ) : (
            feedbacks.map((fb) => (
              <Card key={fb.id}>
                <div className="flex flex-col gap-sm">
                  {/* Meta */}
                  <div className="flex items-center justify-between gap-sm flex-wrap">
                    <div>
                      <p className="text-body-md font-semibold">{fb.class_name}</p>
                      <p className="text-label-md text-on-surface-variant">{fb.student_name} · {formatDate(fb.created_at)}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-label-sm font-medium ${
                        fb.status === "replied"
                          ? "bg-tertiary-fixed text-on-tertiary-fixed"
                          : "bg-secondary-fixed text-on-secondary-fixed"
                      }`}
                    >
                      {fb.status === "replied" ? "✅ Đã trả lời" : "🟡 Chờ trả lời"}
                    </span>
                  </div>

                  {/* Content */}
                  <p className="text-body-md">{fb.content}</p>

                  {/* Reply */}
                  {fb.reply && (
                    <div className="rounded-lg bg-surface-container px-4 py-3">
                      <p className="mb-1 text-label-md font-medium text-on-surface-variant">
                        Trả lời từ giáo viên {fb.replied_at ? `· ${formatDate(fb.replied_at)}` : ""}
                      </p>
                      <p className="text-body-md">{fb.reply}</p>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
