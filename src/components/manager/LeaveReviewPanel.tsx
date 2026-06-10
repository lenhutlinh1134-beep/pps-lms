"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export interface ManagerLeaveRow {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  manager_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  teacher_name: string;
}

const STATUS_STYLE: Record<ManagerLeaveRow["status"], string> = {
  pending: "bg-secondary-fixed text-on-secondary-fixed",
  approved: "bg-tertiary-fixed text-on-tertiary-fixed",
  rejected: "bg-error-container text-on-error-container",
};
const STATUS_LABEL: Record<ManagerLeaveRow["status"], string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function dayCount(s: string, e: string) {
  return Math.max(1, Math.round((new Date(e).getTime() - new Date(s).getTime()) / 86400_000) + 1);
}

function LeaveCard({
  leave,
  onReview,
  demo,
}: {
  leave: ManagerLeaveRow;
  onReview: (id: string, status: "approved" | "rejected", note: string) => Promise<void>;
  demo: boolean;
}) {
  const [expanded, setExpanded] = useState(leave.status === "pending");
  const [note, setNote] = useState(leave.manager_note ?? "");
  const [loading, setLoading] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(status: "approved" | "rejected") {
    setError(null);
    setLoading(status);
    try {
      await onReview(leave.id, status, note);
    } catch {
      setError("Cập nhật thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card padding="md">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start justify-between gap-sm text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-body-md font-semibold">{leave.teacher_name}</p>
          <p className="text-label-md text-on-surface-variant">
            {formatDate(leave.start_date)}
            {leave.start_date !== leave.end_date && ` – ${formatDate(leave.end_date)}`}
            {" · "}{dayCount(leave.start_date, leave.end_date)} ngày
          </p>
        </div>
        <div className="flex items-center gap-sm shrink-0">
          <span className={`rounded-full px-3 py-1 text-label-sm font-medium ${STATUS_STYLE[leave.status]}`}>
            {STATUS_LABEL[leave.status]}
          </span>
          {expanded ? <ChevronUp size={16} className="text-on-surface-variant" /> : <ChevronDown size={16} className="text-on-surface-variant" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-md flex flex-col gap-md border-t border-outline-variant pt-md">
          <p className="text-body-md">{leave.reason}</p>

          {leave.status === "pending" && (
            <div className="flex flex-col gap-sm">
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú cho giáo viên (không bắt buộc)..."
                className="resize-none rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-body-md placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {error && (
                <p className="rounded-lg bg-error-container px-3 py-2 text-label-md text-on-error-container">{error}</p>
              )}
              <div className="flex gap-sm">
                <Button
                  size="sm"
                  onClick={() => handle("approved")}
                  loading={loading === "approved"}
                  disabled={!!loading}
                  className="gap-1 bg-tertiary text-on-tertiary hover:opacity-90"
                >
                  <CheckCircle2 size={15} /> Duyệt
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handle("rejected")}
                  loading={loading === "rejected"}
                  disabled={!!loading}
                  className="gap-1 border-error text-error hover:bg-error-container"
                >
                  <XCircle size={15} /> Từ chối
                </Button>
              </div>
            </div>
          )}

          {leave.status !== "pending" && leave.manager_note && (
            <p className="rounded-lg bg-surface-container px-3 py-2 text-label-md italic text-on-surface-variant">
              Ghi chú: {leave.manager_note}
            </p>
          )}
          {leave.reviewed_at && (
            <p className="text-label-sm text-on-surface-variant">
              Xử lý lúc {formatDate(leave.reviewed_at)}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

export function LeaveReviewPanel({
  initialLeaves,
  demo = false,
}: {
  initialLeaves: ManagerLeaveRow[];
  demo?: boolean;
}) {
  const [leaves, setLeaves] = useState(initialLeaves);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  async function handleReview(id: string, status: "approved" | "rejected", note: string) {
    if (demo) {
      setLeaves(leaves.map((l) =>
        l.id === id ? { ...l, status, manager_note: note || null, reviewed_at: new Date().toISOString() } : l
      ));
      return;
    }
    const res = await fetch(`/api/manager/leaves/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, manager_note: note }),
    });
    if (!res.ok) throw new Error("failed");
    setLeaves(leaves.map((l) =>
      l.id === id ? { ...l, status, manager_note: note || null, reviewed_at: new Date().toISOString() } : l
    ));
  }

  const filtered = filter === "pending" ? leaves.filter((l) => l.status === "pending") : leaves;
  const pendingCount = leaves.filter((l) => l.status === "pending").length;

  return (
    <div className="flex flex-col gap-lg">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-md">
        {(["pending", "approved", "rejected"] as const).map((s) => {
          const count = leaves.filter((l) => l.status === s).length;
          const icons = { pending: Clock, approved: CheckCircle2, rejected: XCircle };
          const Icon = icons[s];
          const colors = { pending: "text-secondary", approved: "text-tertiary", rejected: "text-error" };
          return (
            <Card key={s} padding="md" className="text-center">
              <Icon size={20} className={`mx-auto mb-xs ${colors[s]}`} />
              <p className={`text-display-sm font-display ${colors[s]}`}>{count}</p>
              <p className="text-label-sm text-on-surface-variant">
                {s === "pending" ? "Chờ duyệt" : s === "approved" ? "Đã duyệt" : "Từ chối"}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-xs">
        {[
          { key: "pending" as const, label: `Chờ duyệt (${pendingCount})` },
          { key: "all" as const, label: `Tất cả (${leaves.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-full px-4 py-2 text-label-md font-medium transition-colors ${
              filter === tab.key
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-on-surface-variant hover:bg-primary-fixed hover:text-on-primary-fixed"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="py-xl text-center text-body-md text-on-surface-variant">
          {filter === "pending" ? "Không có đơn nào đang chờ duyệt." : "Chưa có đơn nghỉ nào."}
        </p>
      ) : (
        <div className="flex flex-col gap-sm">
          {filtered.map((leave) => (
            <LeaveCard key={leave.id} leave={leave} onReview={handleReview} demo={demo} />
          ))}
        </div>
      )}
    </div>
  );
}
