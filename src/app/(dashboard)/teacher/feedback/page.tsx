import { MessageSquare } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState } from "@/components/EmptyState";
import { TeacherFeedbackList } from "@/components/teacher/TeacherFeedbackList";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeedbackItem {
  id: string;
  content: string;
  reply: string | null;
  replied_at: string | null;
  status: "pending" | "replied";
  created_at: string;
  class_name: string;
  parent_name: string;
  student_name: string;
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_FEEDBACKS: FeedbackItem[] = [
  {
    id: "demo-fb1",
    content: "Con tôi có vẻ gặp khó khăn với bài tập nghe. Nhờ thầy/cô hỗ trợ thêm.",
    reply: null,
    replied_at: null,
    status: "pending",
    created_at: "2026-06-09T09:00:00Z",
    class_name: "Tiếng Anh Nâng Cao A",
    parent_name: "Nguyễn Văn Bố",
    student_name: "Nguyễn An",
  },
  {
    id: "demo-fb2",
    content: "Xin hỏi lịch thi giữa kỳ của lớp là ngày mấy ạ?",
    reply: "Dạ, lịch thi giữa kỳ sẽ là ngày 15/07/2026 ạ. Phụ huynh lưu ý nhắc nhở con ôn tập nhé!",
    replied_at: "2026-06-08T14:30:00Z",
    status: "replied",
    created_at: "2026-06-07T10:00:00Z",
    class_name: "Tiếng Anh Cơ Bản B",
    parent_name: "Trần Thị Mẹ",
    student_name: "Trần Bình",
  },
  {
    id: "demo-fb3",
    content: "Em muốn hỏi giáo viên về việc bổ sung thêm tài liệu luyện nói cho con.",
    reply: null,
    replied_at: null,
    status: "pending",
    created_at: "2026-06-10T08:00:00Z",
    class_name: "Tiếng Anh Nâng Cao A",
    parent_name: "Lê Văn Bố",
    student_name: "Lê Cường",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TeacherFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const profile = await requireRole("teacher");
  const { filter = "all" } = await searchParams;
  const isDemo = profile.id.startsWith("demo-");

  let feedbacks: FeedbackItem[] = [];

  if (isDemo) {
    feedbacks = DEMO_FEEDBACKS;
  } else {
    const supabase = await createClient();

    // 1. Lấy danh sách lớp GV đang dạy
    const { data: ctData } = await supabase
      .from("class_teachers")
      .select("class_id")
      .eq("teacher_id", profile.id);
    const myClassIds = (ctData ?? []).map((r: { class_id: string }) => r.class_id);

    // 2. Lấy feedback của các lớp đó
    const { data } = myClassIds.length > 0
      ? await supabase
          .from("parent_feedback")
          .select(
            `id, content, reply, replied_at, status, created_at,
             classes(name),
             parent:profiles!parent_feedback_parent_id_fkey(full_name),
             student:profiles!parent_feedback_student_id_fkey(full_name)`,
          )
          .in("class_id", myClassIds)
          .order("created_at", { ascending: false })
      : { data: [] };

    feedbacks = ((data ?? []) as unknown[]).map((row: unknown) => {
      const r = row as {
        id: string;
        content: string;
        reply: string | null;
        replied_at: string | null;
        status: "pending" | "replied";
        created_at: string;
        classes: { name: string } | null;
        parent: { full_name: string | null } | null;
        student: { full_name: string | null } | null;
      };
      return {
        id: r.id,
        content: r.content,
        reply: r.reply,
        replied_at: r.replied_at,
        status: r.status,
        created_at: r.created_at,
        class_name: r.classes?.name ?? "Lớp không xác định",
        parent_name: r.parent?.full_name ?? "Phụ huynh",
        student_name: r.student?.full_name ?? "Học sinh",
      };
    });
  }

  // Filter theo searchParams
  const filtered =
    filter === "pending"
      ? feedbacks.filter((f) => f.status === "pending")
      : filter === "replied"
        ? feedbacks.filter((f) => f.status === "replied")
        : feedbacks;

  // Sort: pending trước, replied sau
  const sorted = [...filtered].sort((a, b) => {
    if (a.status === b.status) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return a.status === "pending" ? -1 : 1;
  });

  const pendingCount = feedbacks.filter((f) => f.status === "pending").length;

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-3xl flex-col gap-lg">
        {/* Header */}
        <div className="flex items-start gap-md">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed">
            <MessageSquare size={24} />
          </span>
          <div>
            <h1 className="text-display-lg">Phản hồi phụ huynh</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Xem và trả lời nhận xét từ phụ huynh học sinh
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-xs">
          {[
            { key: "all", label: `Tất cả (${feedbacks.length})` },
            { key: "pending", label: `Chờ trả lời${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
            { key: "replied", label: "Đã trả lời" },
          ].map((tab) => (
            <a
              key={tab.key}
              href={`?filter=${tab.key}`}
              className={`rounded-full px-4 py-2 text-label-md font-medium transition-colors ${
                filter === tab.key
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface-variant hover:bg-primary-fixed hover:text-on-primary-fixed"
              }`}
            >
              {tab.label}
            </a>
          ))}
        </div>

        {/* List */}
        {sorted.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Chưa có phản hồi nào"
            description={
              filter === "pending"
                ? "Không có phản hồi nào đang chờ trả lời."
                : filter === "replied"
                  ? "Chưa có phản hồi nào được trả lời."
                  : "Chưa có phản hồi nào từ phụ huynh."
            }
          />
        ) : (
          <TeacherFeedbackList feedbacks={sorted} />
        )}
      </div>
    </DashboardShell>
  );
}
