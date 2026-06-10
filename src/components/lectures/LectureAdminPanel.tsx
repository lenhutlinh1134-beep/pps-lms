"use client";

import { useMemo, useState } from "react";
import {
  Users, Share2, AlertTriangle, CheckCircle2, EyeOff, Search as SearchIcon,
  Save, Clock, BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

export interface LectureViewerRow {
  student_id: string;
  full_name: string | null;
  email: string | null;
  class_name: string | null;
  watch_seconds: number;
  completed: boolean;
  last_seen_at: string | null;
}

export interface ShareClassOption { id: string; name: string }

type StatusKey = "done" | "enough" | "warning" | "watching" | "none";
type FilterKey = "all" | "warning" | "none";

const STATUS_META: Record<StatusKey, { label: string; cls: string }> = {
  done:     { label: "Học xong",   cls: "bg-tertiary-fixed text-tertiary" },
  enough:   { label: "Đã xem đủ",  cls: "bg-tertiary-fixed text-tertiary" },
  warning:  { label: "Chưa đủ",    cls: "bg-error-container text-error" },
  watching: { label: "Đang xem",   cls: "bg-primary-fixed text-primary" },
  none:     { label: "Chưa xem",   cls: "bg-surface-container text-on-surface-variant" },
};

function statusOf(v: LectureViewerRow, minMinutes: number | null): StatusKey {
  if (v.completed) return "done";
  if (minMinutes && v.watch_seconds >= minMinutes * 60) return "enough";
  if (v.watch_seconds > 0) return minMinutes ? "warning" : "watching";
  return "none";
}

function fmtMinutes(secs: number) {
  if (secs <= 0) return "0 phút";
  if (secs < 60) return "< 1 phút";
  const m = Math.round(secs / 60);
  return m >= 60 ? `${Math.floor(m / 60)}g ${m % 60}p` : `${m} phút`;
}

function fmtLastSeen(iso: string | null) {
  if (!iso) return "—";
  const diffH = (Date.now() - new Date(iso).getTime()) / 3600_000;
  if (diffH < 1) return "Vừa xong";
  if (diffH < 24) return `${Math.floor(diffH)} giờ trước`;
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

/**
 * Bảng quản trị video cho giáo viên: ai đang xem, xem bao lâu, cảnh báo
 * xem chưa đủ + chia sẻ bài giảng cho nhiều lớp + đặt phút xem tối thiểu.
 */
export function LectureAdminPanel({
  lectureId,
  demo = false,
  initialMinWatch,
  viewers,
  classes,
  initialSharedIds,
  homeClassId,
}: {
  lectureId: string;
  demo?: boolean;
  initialMinWatch: number | null;
  viewers: LectureViewerRow[];
  /** Các lớp GV đang dạy — để chọn chia sẻ. */
  classes: ShareClassOption[];
  initialSharedIds: string[];
  /** Lớp gốc của bài giảng — luôn được chia sẻ, không bỏ được. */
  homeClassId: string | null;
}) {
  const [minWatch, setMinWatch] = useState<string>(initialMinWatch ? String(initialMinWatch) : "");
  const [savedMin, setSavedMin] = useState<number | null>(initialMinWatch);
  const [shared, setShared] = useState<Set<string>>(new Set(initialSharedIds));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return viewers
      .map((v) => ({ ...v, status: statusOf(v, savedMin) }))
      .filter((v) => {
        if (filter === "warning" && v.status !== "warning") return false;
        if (filter === "none" && v.status !== "none") return false;
        if (q && !(v.full_name ?? "").toLowerCase().includes(q) && !(v.email ?? "").toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.watch_seconds - a.watch_seconds);
  }, [viewers, savedMin, query, filter]);

  const counts = useMemo(() => {
    const all = viewers.map((v) => statusOf(v, savedMin));
    return {
      total: viewers.length,
      ok: all.filter((s) => s === "done" || s === "enough").length,
      warning: all.filter((s) => s === "warning").length,
      none: all.filter((s) => s === "none").length,
    };
  }, [viewers, savedMin]);

  async function saveMinWatch() {
    const parsed = minWatch.trim() === "" ? null : Math.max(0, parseInt(minWatch, 10) || 0) || null;
    setBusy(true);
    try {
      if (!demo) {
        const supabase = createClient();
        const { error } = await supabase.from("lectures")
          .update({ min_watch_minutes: parsed }).eq("id", lectureId);
        if (error) throw error;
      }
      setSavedMin(parsed);
      flash("ok", parsed
        ? `Đã đặt yêu cầu xem tối thiểu ${parsed} phút${demo ? " (xem thử)" : ""}.`
        : "Đã tắt cảnh báo xem không đủ.");
    } catch {
      flash("err", "Không lưu được. Thử lại nhé.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleShare(classId: string) {
    if (classId === homeClassId) return; // lớp gốc luôn được chia sẻ
    const isOn = shared.has(classId);
    setBusy(true);
    try {
      if (!demo) {
        const supabase = createClient();
        if (isOn) {
          const { error } = await supabase.from("lecture_classes")
            .delete().eq("lecture_id", lectureId).eq("class_id", classId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("lecture_classes")
            .insert({ lecture_id: lectureId, class_id: classId });
          if (error) throw error;
        }
      }
      setShared((prev) => {
        const next = new Set(prev);
        if (isOn) next.delete(classId); else next.add(classId);
        return next;
      });
      flash("ok", isOn ? "Đã ngừng chia sẻ cho lớp." : `Đã chia sẻ cho lớp${demo ? " (xem thử)" : ""}.`);
    } catch {
      flash("err", "Không cập nhật được chia sẻ. Thử lại nhé.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-md">
      <h2 className="text-headline-sm">Quản trị video</h2>

      {msg && (
        <p className={cn(
          "rounded-md px-4 py-3 text-body-md",
          msg.type === "ok" ? "bg-tertiary-fixed text-tertiary" : "bg-error-container text-error",
        )}>
          {msg.text}
        </p>
      )}

      {/* ── Tổng quan người xem ── */}
      <div className="grid grid-cols-2 gap-md sm:grid-cols-4">
        {[
          { icon: Users, label: "Học sinh", value: counts.total, cls: "bg-primary-fixed text-primary" },
          { icon: CheckCircle2, label: "Đã xem đủ", value: counts.ok, cls: "bg-tertiary-fixed text-tertiary" },
          { icon: AlertTriangle, label: "Chưa đủ — cảnh báo", value: counts.warning, cls: "bg-error-container text-error" },
          { icon: EyeOff, label: "Chưa xem", value: counts.none, cls: "bg-surface-container text-on-surface-variant" },
        ].map((s) => (
          <Card key={s.label} padding="md" className="flex items-center gap-md">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${s.cls}`}>
              <s.icon size={20} />
            </span>
            <div>
              <p className="text-headline-sm leading-none">{s.value}</p>
              <p className="mt-xs text-label-sm text-on-surface-variant">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Cài đặt phút tối thiểu + chia sẻ lớp ── */}
      <div className="grid grid-cols-1 gap-md lg:grid-cols-2">
        <Card padding="md" className="flex flex-col gap-sm">
          <p className="flex items-center gap-2 text-body-md font-semibold">
            <Clock size={18} className="text-primary" /> Yêu cầu xem tối thiểu
          </p>
          <p className="text-label-sm text-on-surface-variant">
            Học sinh xem ít hơn số phút này sẽ bị gắn cảnh báo &quot;Chưa đủ&quot;. Để trống = không cảnh báo.
          </p>
          <div className="flex items-center gap-sm">
            <Input
              type="number" min={0} placeholder="VD: 10"
              value={minWatch} onChange={(e) => setMinWatch(e.target.value)}
              className="h-11"
            />
            <Button size="md" onClick={saveMinWatch} loading={busy}>
              <Save size={16} /> Lưu
            </Button>
          </div>
        </Card>

        <Card padding="md" className="flex flex-col gap-sm">
          <p className="flex items-center gap-2 text-body-md font-semibold">
            <Share2 size={18} className="text-primary" /> Chia sẻ cho lớp
          </p>
          {classes.length === 0 ? (
            <p className="text-label-sm text-on-surface-variant">Bạn chưa có lớp nào khác để chia sẻ.</p>
          ) : (
            <div className="flex flex-col gap-xs">
              {classes.map((c) => {
                const isHome = c.id === homeClassId;
                const on = isHome || shared.has(c.id);
                return (
                  <label
                    key={c.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-sm rounded-md px-3 py-2 transition-colors",
                      on ? "bg-primary-fixed" : "hover:bg-surface-container",
                      isHome && "cursor-default opacity-80",
                    )}
                  >
                    <input
                      type="checkbox" checked={on} disabled={isHome || busy}
                      onChange={() => toggleShare(c.id)}
                      className="h-4 w-4 accent-[--color-primary]"
                    />
                    <BookOpen size={15} className={on ? "text-primary" : "text-on-surface-variant"} />
                    <span className="flex-1 text-body-md">{c.name}</span>
                    {isHome && <span className="text-label-sm text-on-surface-variant">Lớp gốc</span>}
                  </label>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── Bảng người xem ── */}
      <Card padding="md" className="flex flex-col gap-md">
        <div className="flex flex-wrap items-center gap-sm">
          <div className="min-w-[200px] flex-1">
            <Input
              leadingIcon={<SearchIcon size={16} />} placeholder="Tìm học sinh…"
              value={query} onChange={(e) => setQuery(e.target.value)}
              className="h-11"
            />
          </div>
          {([["all", `Tất cả (${counts.total})`], ["warning", `Chưa đủ (${counts.warning})`], ["none", `Chưa xem (${counts.none})`]] as [FilterKey, string][]).map(([k, label]) => (
            <button
              key={k} onClick={() => setFilter(k)}
              className={cn(
                "rounded-full px-4 py-2 text-label-md font-semibold transition-colors",
                filter === k ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-primary-fixed",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={viewers.length === 0 ? "Chưa có học sinh nào trong các lớp được chia sẻ" : "Không tìm thấy học sinh phù hợp"}
            description={viewers.length === 0
              ? "Chia sẻ bài giảng cho lớp có học sinh để bắt đầu theo dõi."
              : "Thử đổi từ khoá hoặc bộ lọc."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-outline-variant text-label-md text-on-surface-variant">
                  <th className="pb-sm pr-md font-semibold">Học sinh</th>
                  <th className="pb-sm pr-md font-semibold">Lớp</th>
                  <th className="pb-sm pr-md font-semibold">Đã xem</th>
                  <th className="pb-sm pr-md font-semibold">Lần cuối</th>
                  <th className="pb-sm font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => {
                  const meta = STATUS_META[v.status];
                  return (
                    <tr key={v.student_id} className="border-b border-outline-variant/50 last:border-0">
                      <td className="py-sm pr-md">
                        <p className="text-body-md font-semibold">{v.full_name ?? "Học sinh"}</p>
                        <p className="text-label-sm text-on-surface-variant">{v.email ?? ""}</p>
                      </td>
                      <td className="py-sm pr-md text-label-md text-on-surface-variant">{v.class_name ?? "—"}</td>
                      <td className="py-sm pr-md text-body-md font-semibold">{fmtMinutes(v.watch_seconds)}</td>
                      <td className="py-sm pr-md text-label-md text-on-surface-variant">{fmtLastSeen(v.last_seen_at)}</td>
                      <td className="py-sm">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-label-sm font-semibold", meta.cls)}>
                          {v.status === "warning" && <AlertTriangle size={12} />}
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-label-sm text-on-surface-variant">
          Thời gian được tính khi học sinh mở bài giảng và tab đang hiển thị, cập nhật mỗi 30 giây.
        </p>
      </Card>
    </section>
  );
}
