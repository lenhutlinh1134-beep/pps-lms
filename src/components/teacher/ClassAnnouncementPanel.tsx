"use client";

import { useState } from "react";
import { Megaphone, Trash2, Send } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export interface AnnouncementItem {
  id: string;
  content: string;
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ClassAnnouncementPanel({
  classId,
  initialItems,
  demo = false,
}: {
  classId: string;
  initialItems: AnnouncementItem[];
  demo?: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!content.trim()) return;

    if (demo) {
      const fake: AnnouncementItem = {
        id: `demo-${Date.now()}`,
        content: content.trim(),
        created_at: new Date().toISOString(),
      };
      setItems([fake, ...items]);
      setContent("");
      setSuccess("Đã đăng thông báo!");
      setTimeout(() => setSuccess(null), 3000);
      return;
    }

    setPosting(true);
    try {
      const res = await fetch("/api/teacher/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: classId, content: content.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Đăng thất bại. Vui lòng thử lại.");
      } else {
        setItems([json.data, ...items]);
        setContent("");
        setSuccess("Đã đăng thông báo!");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(id: string) {
    if (demo) {
      setItems(items.filter((i) => i.id !== id));
      return;
    }
    setDeletingId(id);
    try {
      await fetch(`/api/teacher/announcements/${id}`, { method: "DELETE" });
      setItems(items.filter((i) => i.id !== id));
    } catch {
      // bỏ qua
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="flex flex-col gap-md">
      {/* Header */}
      <div className="flex items-center gap-sm">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-fixed">
          <Megaphone size={18} className="text-secondary" />
        </span>
        <h2 className="text-headline-sm">Thông báo lớp</h2>
      </div>

      {/* Form đăng */}
      <Card>
        <form onSubmit={handlePost} className="flex flex-col gap-sm">
          <textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nhập thông báo cho học sinh trong lớp..."
            disabled={posting}
            maxLength={1000}
            className="w-full resize-none rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-body-md placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          <div className="flex items-center justify-between gap-sm">
            <span className="text-label-sm text-on-surface-variant">
              {content.length}/1000
            </span>
            <Button
              type="submit"
              size="sm"
              loading={posting}
              disabled={!content.trim()}
              className="gap-1"
            >
              <Send size={14} />
              Đăng thông báo
            </Button>
          </div>
          {error && (
            <p className="rounded-lg bg-error-container px-3 py-2 text-label-md text-on-error-container">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg bg-tertiary-fixed px-3 py-2 text-label-md text-on-tertiary-fixed">
              {success}
            </p>
          )}
        </form>
      </Card>

      {/* Danh sách thông báo */}
      {items.length === 0 ? (
        <p className="py-md text-center text-body-md text-on-surface-variant">
          Chưa có thông báo nào. Đăng thông báo đầu tiên cho lớp!
        </p>
      ) : (
        <div className="flex flex-col gap-sm">
          {items.map((item) => (
            <Card key={item.id} padding="md">
              <div className="flex items-start gap-sm">
                <p className="flex-1 text-body-md whitespace-pre-wrap">{item.content}</p>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  aria-label="Xoá thông báo"
                  className="shrink-0 rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container disabled:opacity-40"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="mt-xs text-label-sm text-on-surface-variant">
                {formatDate(item.created_at)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
