import { MessageSquarePlus, Clock, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";

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
  parent_name: string;
  student_name: string;
  teacher_name: string | null;
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_FEEDBACKS: FeedbackRow[] = [
  {
    id: "demo-fb1",
    content: "Con tôi có vẻ gặp khó khăn với bài tập nghe. Nhờ thầy/cô hỗ trợ thêm.",
    reply: null,
    replied_at: null,
    status: "pending",
    created_at: "2026-06-10T09:00:00Z",
    class_name: "Tiếng Anh Nâng Cao A",
    parent_name: "Nguyễn Văn Bố",
    student_name: "Nguyễn An",
    teacher_name: "Nguyễn Thị Lan",
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
    teacher_name: "Trần Văn Minh",
  },
  {
    id: "demo-fb3",
    content: "Em muốn hỏi về việc bổ sung thêm tài liệu luyện nói cho con.",
    reply: null,
    replied_at: null,
    status: "pending",
    created_at: "2026-06-10T08:00:00Z",
    class_name: "Tiếng Anh Nâng Cao A",
    parent_name: "Lê Văn Bố",
    student_name: "Lê Cường",
    teacher_name: "Nguyễn Thị Lan",
  },
  {
    id: "demo-fb4",
    content: "Con học tốt lắm, cảm ơn thầy cô rất nhiều!",
    reply: "Cảm ơn phụ huynh đã tin tưởng! Em học rất chăm chỉ ạ.",
    replied_at: "2026-06-05T09:00:00Z",
    status: "replied",
    created_at: "2026-06-04T08:00:00Z",
    class_name: "Luyện Thi IELTS",
    parent_name: "Phạm Thị Mẹ",
    student_name: "Phạm Dũng",
    teacher_name: "Lê Thị Hoa",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ManagerFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const profile = await requireRole("manager");
  const { filter = "pending" } = await searchParams;
  const isDemo = profile.id.startsWith("demo-");

  let feedbacks: FeedbackRow[] = [];

  if (isDemo) {
    feedbacks = DEMO_FEEDBACKS;
  } else {
    const supabase = await createClient();
    try {
      const { data } = await supabase
        .from("parent_feedback")
        .select(
          `id, content, reply, replied_at, status, created_at,
           classes(name, class_teachers(profiles(full_name))),
           parent:profiles!parent_feedback_parent_id_fkey(full_name),
           student:profiles!parent_feedback_student_id_fkey(full_name)`,
        )
        .order("created_at", { ascending: false });

      feedbacks = ((data ?? []) as unknown[]).map((row: unknown) => {
        const r = row as {
          id: string;
          content: string;
          reply: string | null;
          replied_at: string | null;
          status: "pending" | "replied";
          created_at: string;
          classes: {
            name: string;
            class_teachers: { profiles: { full_name: string | null } | null }[] | null;
          } | null;
          parent: { full_name: string | null } | null;
          student: { full_name: string | null } | null;
        };
        const teachers = r.classes?.class_teachers ?? [];
        const teacherName = teachers[0]?.profiles?.full_name ?? null;
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
          teacher_name: teacherName,
        };
      });
    } catch {
      // fallback: mảng rỗng
    }
  }

  const filtered =
    filter === "pending"
      ? feedbacks.filter((f) => f.status === "pending")
      : filter === "replied"
        ? feedbacks.filter((f) => f.status === "replied")
        : feedbacks;

  const pendingCount = feedbacks.filter((f) => f.status === "pending").length;
  const repliedCount = feedbacks.filter((f) => f.status === "replied").length;

  return (
    <DashboardShell role="manager" userName={profile.full_name || "Quản lý"}>
      <div className="mx-auto flex max-w-4xl flex-col gap-lg">

        {/* Back + Header */}
        <div>
          <Link
            href="/manager"
            className="mb-sm inline-flex items-center gap-xs text-label-md text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft size={16} />
            Quay lại Tổng quan
          </Link>
          <div className="flex items-start gap-md">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed">
              <MessageSquarePlus size={24} />
            </span>
            <div>
              <h1 className="text-display-lg">Phản hồi phụ huynh</h1>
              <p className="mt-xs text-body-lg text-on-surface-variant">
                Theo dõi tất cả phản hồi từ phụ huynh toàn trung tâm
              </p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
          <Card padding="md" className="text-center">
            <p className="text-display-sm font-display text-primary">{feedbacks.length}</p>
            <p className="text-label-md text-on-surface-variant">Tổng phản hồi</p>
          </Card>
          <Card padding="md" className="text-center">
            <p className="text-display-sm font-display text-secondary">{pendingCount}</p>
            <p className="text-label-md text-on-surface-variant">Chờ trả lời</p>
          </Card>
          <Card padding="md" className="text-center hidden sm:block">
            <p className="text-display-sm font-display text-tertiary">{repliedCount}</p>
            <p className="text-label-md text-on-surface-variant">Đã trả lời</p>
          </Card>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-xs flex-wrap">
          {[
            { key: "pending", label: `Chờ trả lời (${pendingCount})`, icon: Clock },
            { key: "all", label: `Tất cả (${feedbacks.length})`, icon: null },
            { key: "replied", label: `Đã trả lời (${repliedCount})`, icon: CheckCircle2 },
          ].map((tab) => (
            <Link
              key={tab.key}
              href={`?filter=${tab.key}`}
              className={`inline-flex items-center gap-xs rounded-full px-4 py-2 text-label-md font-medium transition-colors ${
                filter === tab.key
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface-variant hover:bg-primary-fixed hover:text-on-primary-fixed"
              }`}
            >
              {tab.icon && <tab.icon size={14} />}
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Notice: manager view-only */}
        <div className="rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-body-md text-on-surface-variant">
          Giáo viên phụ trách là người trực tiếp trả lời. Trang này cho phép quản lý theo dõi tiến độ phản hồi toàn trung tâm.
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={MessageSquarePlus}
            title={
              filter === "pending"
                ? "Không có phản hồi nào đang chờ"
                : filter === "replied"
                  ? "Chưa có phản hồi nào được trả lời"
                  : "Chưa có phản hồi nào"
            }
            description={
              filter === "pending"
                ? "Tất cả phản hồi đã được giáo viên trả lời."
                : "Phản hồi từ phụ huynh sẽ xuất hiện ở đây."
            }
          />
        ) : (
          <div className="flex flex-col gap-md">
            {filtered.map((fb) => (
              <Card key={fb.id}>
                <div className="flex flex-col gap-sm">
                  {/* Header row */}
                  <div className="flex flex-wrap items-start justify-between gap-sm">
                    <div>
                      <p className="text-body-md font-semibold">{fb.parent_name}</p>
                      <p className="text-label-md text-on-surface-variant">
                        {fb.student_name} · {fb.class_name}
                        {fb.teacher_name ? ` · GV: ${fb.teacher_name}` : ""}
                      </p>
                      <p className="text-label-sm text-on-surface-variant">
                        {formatDate(fb.created_at)}
                      </p>
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
                        Trả lời từ giáo viên
                        {fb.replied_at ? ` · ${formatDate(fb.replied_at)}` : ""}
                      </p>
                      <p className="text-body-md">{fb.reply}</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
