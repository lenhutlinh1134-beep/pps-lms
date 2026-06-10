"use client";

import { useState } from "react";
import { CalendarOff, Trash2, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export interface LeaveRow {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  manager_note: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<LeaveRow["status"], string> = {
  pending: "🟡 Chờ duyệt",
  approved: "✅ Đã duyệt",
  rejected: "❌ Từ chối",
};

const STATUS_STYLE: Record<LeaveRow["status"], string> = {
  pending: "bg-secondary-fixed text-on-secondary-fixed",
  approved: "bg-tertiary-fixed text-on-tertiary-fixed",
  rejected: "bg-error-container text-on-error-container",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export function LeaveRequestManager({
  initialLeaves,
  demo = false,
}: {
  initialLeaves: LeaveRow[];
  demo?: boolean;
}) {
  const [leaves, setLeaves] = useState(initialLeaves);
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tính số ngày nghỉ
  function dayCount(start: string, end: string) {
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(0, Math.round(diff / 86400_000) + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!startDate || !endDate || !reason.trim()) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
      return;
    }

    if (demo) {
      const fake: LeaveRow = {
        id: `demo-${Date.now()}`,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
        status: "pending",
        manager_note: null,
        created_at: new Date().toISOString(),
      };
      setLeaves([fake, ...leaves]);
      setShowForm(false);
      setStartDate(""); setEndDate(""); setReason("");
      setSuccess("Đã nộp đơn xin nghỉ!");
      setTimeout(() => setSuccess(null), 3000);
      return;
    }

    setPosting(true);
    try {
      const res = await fetch("/api/teacher/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_date: startDate, end_date: endDate, reason: reason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Không thể nộp đơn. Vui lòng thử lại.");
      } else {
        setLeaves([json.data, ...leaves]);
        setShowForm(false);
        setStartDate(""); setEndDate(""); setReason("");
        setSuccess("Đã nộp đơn xin nghỉ!");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(id: string) {
    if (demo) { setLeaves(leaves.filter((l) => l.id !== id)); return; }
    setDeletingId(id);
    try {
      await fetch(`/api/teacher/leaves?id=${id}`, { method: "DELETE" });
      setLeaves(leaves.filter((l) => l.id !== id));
    } catch { /* bỏ qua */ }
    finally { setDeletingId(null); }
  }

  const pendingCount = leaves.filter((l) => l.status === "pending").length;

  return (
    <div className="flex flex-col gap-lg">
      {/* Stat + nút mới */}
      <div className="flex items-center justify-between gap-md">
        <div className="flex gap-md">
          {(["pending", "approved", "rejected"] as const).map((s) => {
            const count = leaves.filter((l) => l.status === s).length;
            return (
              <div key={s} className="text-center">
                <p className="text-display-sm font-display text-primary">{count}</p>
                <p className="text-label-sm text-on-surface-variant">
                  {s === "pending" ? "Chờ duyệt" : s === "approved" ? "Đã duyệt" : "Từ chối"}
                </p>
              </div>
            );
          })}
        </div>
        <Button size="sm" onClick={() => { setShowForm(true); setError(null); }} className="gap-1">
          <Plus size={16} /> Nộp đơn mới
        </Button>
      </div>

      {/* Success */}
      {success && (
        <p className="rounded-xl bg-tertiary-fixed px-4 py-3 text-body-md font-medium text-on-tertiary-fixed">
          {success}
        </p>
      )}

      {/* Form nộp đơn */}
      {showForm && (
        <Card>
          <div className="mb-md flex items-center justify-between">
            <h3 className="text-headline-sm">Đơn xin nghỉ mới</h3>
            <button
              onClick={() => { setShowForm(false); setError(null); }}
              className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container"
            >
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-md">
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              <div className="flex flex-col gap-xs">
                <label className="text-label-md font-semibold">Ngày bắt đầu</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  required
                  className="h-14 rounded-xl border border-outline-variant bg-surface-container px-4 text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="text-label-md font-semibold">
                  Ngày kết thúc
                  {startDate && endDate && dayCount(startDate, endDate) > 0 && (
                    <span className="ml-2 font-normal text-on-surface-variant">
                      ({dayCount(startDate, endDate)} ngày)
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || new Date().toISOString().split("T")[0]}
                  required
                  className="h-14 rounded-xl border border-outline-variant bg-surface-container px-4 text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-xs">
              <label className="text-label-md font-semibold">Lý do nghỉ</label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ví dụ: Nghỉ ốm, việc gia đình, đi công tác..."
                maxLength={500}
                required
                className="resize-none rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-body-md placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="self-end text-label-sm text-on-surface-variant">{reason.length}/500</span>
            </div>

            {error && (
              <p className="rounded-xl bg-error-container px-4 py-3 text-body-md text-on-error-container">
                {error}
              </p>
            )}

            <div className="flex gap-sm">
              <Button type="submit" loading={posting}>Nộp đơn</Button>
              <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setError(null); }}>
                Huỷ
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Danh sách đơn */}
      {leaves.length === 0 ? (
        <div className="py-xl text-center">
          <CalendarOff size={40} className="mx-auto mb-md text-on-surface-variant opacity-40" />
          <p className="text-body-md text-on-surface-variant">Chưa có đơn xin nghỉ nào.</p>
          {pendingCount === 0 && (
            <p className="mt-xs text-label-md text-on-surface-variant">
              Nhấn &ldquo;Nộp đơn mới&rdquo; để tạo đơn đầu tiên.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-sm">
          {leaves.map((leave) => (
            <Card key={leave.id} padding="md">
              <div className="flex flex-wrap items-start justify-between gap-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-sm mb-xs">
                    <span className="text-body-md font-semibold">
                      {formatDate(leave.start_date)}
                      {leave.start_date !== leave.end_date && ` – ${formatDate(leave.end_date)}`}
                    </span>
                    <span className="text-label-sm text-on-surface-variant">
                      ({dayCount(leave.start_date, leave.end_date)} ngày)
                    </span>
                  </div>
                  <p className="text-body-md text-on-surface-variant">{leave.reason}</p>
                  {leave.manager_note && (
                    <p className="mt-sm rounded-lg bg-surface-container px-3 py-2 text-label-md italic text-on-surface-variant">
                      Ghi chú quản lý: {leave.manager_note}
                    </p>
                  )}
                  <p className="mt-xs text-label-sm text-on-surface-variant">
                    Nộp lúc {formatDate(leave.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-sm shrink-0">
                  <span className={`rounded-full px-3 py-1 text-label-sm font-medium ${STATUS_STYLE[leave.status]}`}>
                    {STATUS_LABEL[leave.status]}
                  </span>
                  {leave.status === "pending" && (
                    <button
                      onClick={() => handleDelete(leave.id)}
                      disabled={deletingId === leave.id}
                      aria-label="Xoá đơn"
                      className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container disabled:opacity-40"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
