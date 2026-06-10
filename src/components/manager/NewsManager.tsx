"use client";

import { useState, useMemo } from "react";
import { Newspaper, Pin, PinOff, Trash2, Plus, ChevronDown, ChevronUp, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/EmptyState";

// ─────────────────── Types ───────────────────

export interface NewsRow {
  id: string;
  title: string;
  content: string;
  publisher_name: string | null;
  is_pinned: boolean;
  target_roles: string[];
  created_at: string;
}

interface Props {
  initialNews: NewsRow[];
  managerName: string;
}

// ─────────────────── Constants ───────────────────

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  student: { label: "Học sinh", color: "bg-primary-fixed text-on-primary-fixed" },
  teacher: { label: "Giáo viên", color: "bg-tertiary-fixed text-on-tertiary-fixed" },
  parent: { label: "Phụ huynh", color: "bg-secondary-fixed text-on-secondary-fixed" },
};

const ALL_ROLES = ["student", "teacher", "parent"] as const;

// ─────────────────── Toast ───────────────────

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-sm rounded-xl px-lg py-md shadow-card-hover transition-all
        ${type === "success" ? "bg-primary text-on-primary" : "bg-error-container text-on-error-container"}`}
    >
      <span className="text-body-md font-medium">{message}</span>
      <button onClick={onClose} className="ml-xs opacity-70 hover:opacity-100 transition-opacity">
        <X size={16} />
      </button>
    </div>
  );
}

// ─────────────────── Skeleton ───────────────────

function NewsCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-5 w-2/3 rounded-md bg-surface-container mb-sm" />
      <div className="h-4 w-full rounded-md bg-surface-container mb-xs" />
      <div className="h-4 w-4/5 rounded-md bg-surface-container mb-md" />
      <div className="flex gap-xs">
        <div className="h-6 w-16 rounded-full bg-surface-container" />
        <div className="h-6 w-16 rounded-full bg-surface-container" />
      </div>
    </Card>
  );
}

// ─────────────────── News Card ───────────────────

function NewsCard({
  news,
  onDelete,
  deleting,
}: {
  news: NewsRow;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const date = new Date(news.created_at).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <Card className="relative flex flex-col gap-sm">
      {/* Pin badge */}
      {news.is_pinned && (
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-secondary-fixed px-2 py-0.5">
          <Pin size={12} className="text-on-secondary-fixed" />
          <span className="text-label-sm text-on-secondary-fixed font-medium">Ghim</span>
        </div>
      )}

      {/* Title */}
      <h3 className="text-headline-sm pr-16 leading-snug">{news.title}</h3>

      {/* Content preview */}
      <p className="text-body-md text-on-surface-variant line-clamp-3">{news.content}</p>

      {/* Target roles badges */}
      <div className="flex flex-wrap gap-xs">
        {news.target_roles.map((role) => {
          const info = ROLE_LABELS[role];
          if (!info) return null;
          return (
            <span
              key={role}
              className={`inline-flex items-center rounded-full px-3 py-0.5 text-label-sm font-medium ${info.color}`}
            >
              {info.label}
            </span>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-xs border-t border-outline-variant">
        <div className="flex items-center gap-xs text-label-sm text-on-surface-variant">
          <span>{news.publisher_name ?? "Quản lý"}</span>
          <span>·</span>
          <span>{date}</span>
        </div>
        <button
          onClick={() => onDelete(news.id)}
          disabled={deleting}
          className="flex items-center gap-1 rounded-lg px-sm py-1 text-label-sm text-error hover:bg-error-container transition-colors disabled:opacity-50"
          title="Xóa tin này"
        >
          <Trash2 size={14} />
          <span>Xóa</span>
        </button>
      </div>
    </Card>
  );
}

// ─────────────────── Main Component ───────────────────

export default function NewsManager({ initialNews, managerName }: Props) {
  // ── State ──
  const [newsList, setNewsList] = useState<NewsRow[]>(initialNews);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [targetRoles, setTargetRoles] = useState<string[]>(["student", "teacher", "parent"]);

  // ── Helpers ──
  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  function resetForm() {
    setTitle("");
    setContent("");
    setIsPinned(false);
    setTargetRoles(["student", "teacher", "parent"]);
  }

  function toggleRole(role: string) {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  // ── Filtered list ──
  const filteredNews = useMemo(() => {
    let list = [...newsList].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    if (filterRole !== "all") {
      list = list.filter((n) => n.target_roles.includes(filterRole));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
      );
    }

    return list;
  }, [newsList, filterRole, searchQuery]);

  // ── Submit (tạo tin mới) ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    if (targetRoles.length === 0) {
      showToast("Vui lòng chọn ít nhất một đối tượng nhận tin", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/manager/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), is_pinned: isPinned, target_roles: targetRoles }),
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "Không thể đăng tin", "error");
        return;
      }

      setNewsList((prev) => [json.data, ...prev]);
      showToast("Đã đăng tin thành công!", "success");
      resetForm();
      setShowForm(false);
    } catch {
      showToast("Lỗi kết nối. Vui lòng thử lại.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ──
  async function handleDelete(id: string) {
    if (!window.confirm("Bạn chắc chắn muốn xóa tin này?")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/manager/news?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "Không thể xóa tin", "error");
        return;
      }

      setNewsList((prev) => prev.filter((n) => n.id !== id));
      showToast("Đã xóa tin", "success");
    } catch {
      showToast("Lỗi kết nối. Vui lòng thử lại.", "error");
    } finally {
      setDeletingId(null);
    }
  }

  // ─────────────────── Render ───────────────────

  return (
    <div className="flex flex-col gap-lg">
      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Nút mở form */}
      <div className="flex justify-end">
        <Button
          variant={showForm ? "ghost" : "primary"}
          onClick={() => setShowForm((v) => !v)}
          className="gap-sm"
        >
          {showForm ? (
            <>
              <ChevronUp size={16} />
              Thu gọn
            </>
          ) : (
            <>
              <Plus size={16} />
              Đăng tin mới
            </>
          )}
        </Button>
      </div>

      {/* Form tạo tin mới (collapsible) */}
      {showForm && (
        <Card className="border-2 border-primary/20">
          <h2 className="text-headline-sm mb-md">Tin tức mới</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-md">
            {/* Title */}
            <div className="flex flex-col gap-xs">
              <label className="text-label-md font-semibold text-on-surface-variant">
                Tiêu đề <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề thông báo..."
                required
                maxLength={200}
                className="h-14 rounded-xl border border-outline-variant bg-surface-container px-lg text-body-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </div>

            {/* Content */}
            <div className="flex flex-col gap-xs">
              <label className="text-label-md font-semibold text-on-surface-variant">
                Nội dung <span className="text-error">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập nội dung thông báo..."
                required
                rows={5}
                className="min-h-[120px] rounded-xl border border-outline-variant bg-surface-container px-lg py-md text-body-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors resize-y"
              />
            </div>

            {/* Target roles */}
            <div className="flex flex-col gap-xs">
              <label className="text-label-md font-semibold text-on-surface-variant">
                Gửi đến <span className="text-error">*</span>
              </label>
              <div className="flex flex-wrap gap-sm">
                {ALL_ROLES.map((role) => {
                  const info = ROLE_LABELS[role];
                  const checked = targetRoles.includes(role);
                  return (
                    <label
                      key={role}
                      className={`flex cursor-pointer items-center gap-xs rounded-full border-2 px-md py-xs text-label-md font-medium transition-all
                        ${checked
                          ? "border-primary bg-primary-fixed text-on-primary-fixed"
                          : "border-outline-variant bg-transparent text-on-surface-variant hover:border-primary/50"
                        }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={checked}
                        onChange={() => toggleRole(role)}
                      />
                      {info.label}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Is pinned */}
            <label className="flex cursor-pointer items-center gap-sm">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
              />
              <span className="flex items-center gap-xs text-body-md">
                <Pin size={15} className="text-secondary" />
                Ghim tin lên đầu
              </span>
            </label>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-sm pt-xs">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={submitting}
                disabled={!title.trim() || !content.trim() || targetRoles.length === 0}
              >
                {submitting ? "Đang đăng..." : "Đăng tin"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter + Search */}
      <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-xs">
          {[
            { value: "all", label: "Tất cả" },
            { value: "student", label: "Học sinh" },
            { value: "teacher", label: "Giáo viên" },
            { value: "parent", label: "Phụ huynh" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterRole(f.value)}
              className={`rounded-full px-md py-xs text-label-md font-medium transition-colors
                ${filterRole === f.value
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface-variant hover:bg-primary/10"
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm tin tức..."
          className="h-10 rounded-xl border border-outline-variant bg-surface-container px-md text-body-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors sm:w-56"
        />
      </div>

      {/* Danh sách tin */}
      {filteredNews.length === 0 ? (
        newsList.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="Chưa có tin tức nào"
            description="Đăng tin đầu tiên để thông báo cho học sinh, phụ huynh và giáo viên!"
            action={
              <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
                <Plus size={15} />
                Đăng tin ngay
              </Button>
            }
          />
        ) : (
          <Card className="flex flex-col items-center gap-md py-xl text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
              <Newspaper size={24} />
            </span>
            <p className="text-body-md text-on-surface-variant">
              Không tìm thấy tin tức phù hợp với bộ lọc.
            </p>
            <Button variant="ghost" size="sm" onClick={() => { setFilterRole("all"); setSearchQuery(""); }}>
              Xóa bộ lọc
            </Button>
          </Card>
        )
      ) : (
        <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
          {filteredNews.map((news) => (
            <NewsCard
              key={news.id}
              news={news}
              onDelete={handleDelete}
              deleting={deletingId === news.id}
            />
          ))}
        </div>
      )}

      {/* Count */}
      {newsList.length > 0 && (
        <p className="text-label-sm text-on-surface-variant text-right">
          Hiển thị {filteredNews.length}/{newsList.length} tin
        </p>
      )}
    </div>
  );
}
