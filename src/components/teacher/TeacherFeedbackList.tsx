"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { FeedbackItem } from "@/app/(dashboard)/teacher/feedback/page";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function FeedbackCard({ item }: { item: FeedbackItem }) {
  const [reply, setReply] = useState(item.reply ?? "");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(item.status);
  const [savedReply, setSavedReply] = useState(item.reply);
  const [savedRepliedAt, setSavedRepliedAt] = useState(item.replied_at);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (reply.trim().length < 5) {
      setErrorMsg("Câu trả lời phải có ít nhất 5 ký tự.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/teacher/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, reply: reply.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error ?? "Trả lời thất bại. Vui lòng thử lại.");
      } else {
        setSuccessMsg("Đã gửi câu trả lời!");
        setCurrentStatus("replied");
        setSavedReply(reply.trim());
        setSavedRepliedAt(new Date().toISOString());
        setShowForm(false);
      }
    } catch {
      setErrorMsg("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-sm">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-sm">
          <div>
            <p className="text-body-md font-semibold">{item.parent_name}</p>
            <p className="text-label-md text-on-surface-variant">
              {item.class_name} · {item.student_name} · {formatDate(item.created_at)}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-label-sm font-medium ${
              currentStatus === "replied"
                ? "bg-tertiary-fixed text-on-tertiary-fixed"
                : "bg-secondary-fixed text-on-secondary-fixed"
            }`}
          >
            {currentStatus === "replied" ? "✅ Đã trả lời" : "🟡 Chờ trả lời"}
          </span>
        </div>

        {/* Content */}
        <p className="text-body-md">{item.content}</p>

        {/* Existing reply */}
        {savedReply && (
          <div className="rounded-lg bg-surface-container px-4 py-3">
            <p className="mb-1 text-label-md font-medium text-on-surface-variant">
              Câu trả lời của bạn
              {savedRepliedAt ? ` · ${formatDate(savedRepliedAt)}` : ""}
            </p>
            <p className="text-body-md">{savedReply}</p>
          </div>
        )}

        {/* Success message */}
        {successMsg && (
          <div className="rounded-lg bg-tertiary-fixed px-4 py-3 text-body-md font-medium text-on-tertiary-fixed">
            {successMsg}
          </div>
        )}

        {/* Reply form toggle */}
        {currentStatus === "pending" && !showForm && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => setShowForm(true)}
          >
            Trả lời
          </Button>
        )}

        {/* Reply form */}
        {showForm && (
          <form onSubmit={handleReply} className="flex flex-col gap-sm">
            {errorMsg && (
              <div className="rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">
                {errorMsg}
              </div>
            )}
            <textarea
              rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Nhập câu trả lời cho phụ huynh..."
              disabled={loading}
              className="w-full rounded-lg border border-outline-variant bg-surface-container px-4 py-3 text-body-md placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <div className="flex gap-sm">
              <Button type="submit" size="sm" loading={loading}>
                Gửi trả lời
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setErrorMsg(null);
                }}
                disabled={loading}
              >
                Huỷ
              </Button>
            </div>
          </form>
        )}

        {/* Edit reply (if already replied) */}
        {currentStatus === "replied" && !showForm && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => setShowForm(true)}
          >
            Sửa câu trả lời
          </Button>
        )}
      </div>
    </Card>
  );
}

export function TeacherFeedbackList({ feedbacks }: { feedbacks: FeedbackItem[] }) {
  return (
    <div className="flex flex-col gap-md">
      {feedbacks.map((fb) => (
        <FeedbackCard key={fb.id} item={fb} />
      ))}
    </div>
  );
}
