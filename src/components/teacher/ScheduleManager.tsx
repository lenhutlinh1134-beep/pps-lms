"use client";

import { useState, useMemo, useTransition } from "react";
import { Calendar, Trash2, Plus, X, Clock, MapPin, BookOpen, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/EmptyState";

// ─── Types ───────────────────────────────────────────────
export interface SessionRow {
  id: string;
  class_id: string;
  class_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
}

interface Props {
  classes: { id: string; name: string }[];
  initialSessions: SessionRow[];
}

// ─── Helpers ─────────────────────────────────────────────
export const DOW_LABEL: Record<number, string> = {
  2: "Thứ 2",
  3: "Thứ 3",
  4: "Thứ 4",
  5: "Thứ 5",
  6: "Thứ 6",
  7: "Thứ 7",
  8: "Chủ nhật",
};

const DOW_ORDER = [2, 3, 4, 5, 6, 7, 8];

function formatTime(t: string): string {
  // "HH:MM:SS" → "HH:MM"
  return t.slice(0, 5);
}

// ─── Component ───────────────────────────────────────────
export function ScheduleManager({ classes, initialSessions }: Props) {
  const [sessions, setSessions] = useState<SessionRow[]>(initialSessions);
  const [showForm, setShowForm] = useState(false);
  const [filterClass, setFilterClass] = useState<string>("all");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [formClassId, setFormClassId] = useState(classes[0]?.id ?? "");
  const [formDow, setFormDow] = useState<number>(2);
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formRoom, setFormRoom] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Toast helper ─────────────────────────────────────
  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  // ─── Filter sessions ──────────────────────────────────
  const filteredSessions = useMemo(
    () => filterClass === "all" ? sessions : sessions.filter((s) => s.class_id === filterClass),
    [sessions, filterClass]
  );

  // Group by class_name → day_of_week → sessions (sorted by start_time)
  const grouped = useMemo(() => {
    const map = new Map<string, Map<number, SessionRow[]>>();
    for (const s of filteredSessions) {
      if (!map.has(s.class_name)) map.set(s.class_name, new Map());
      const dayMap = map.get(s.class_name)!;
      if (!dayMap.has(s.day_of_week)) dayMap.set(s.day_of_week, []);
      dayMap.get(s.day_of_week)!.push(s);
    }
    // Sort sessions within each day by start_time
    map.forEach((dayMap) => {
      dayMap.forEach((arr) => arr.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    });
    return map;
  }, [filteredSessions]);

  // ─── Add session ──────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!formClassId) { setFormError("Vui lòng chọn lớp"); return; }
    if (!formStart || !formEnd) { setFormError("Vui lòng nhập giờ bắt đầu và kết thúc"); return; }
    if (formStart >= formEnd) { setFormError("Giờ bắt đầu phải trước giờ kết thúc"); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/teacher/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: formClassId,
          day_of_week: formDow,
          start_time: formStart,
          end_time: formEnd,
          room: formRoom.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error ?? "Không thể tạo buổi học");
        return;
      }

      // Thêm session mới vào state (optimistic)
      const className = classes.find((c) => c.id === formClassId)?.name ?? "";
      const newSession: SessionRow = {
        id: json.data.id,
        class_id: formClassId,
        class_name: className,
        day_of_week: formDow,
        start_time: formStart + ":00",
        end_time: formEnd + ":00",
        room: formRoom.trim() || null,
      };

      startTransition(() => {
        setSessions((prev) => [...prev, newSession]);
        setShowForm(false);
        setFormStart("");
        setFormEnd("");
        setFormRoom("");
        showToast("success", "Đã thêm buổi học thành công");
      });
    } catch {
      setFormError("Lỗi kết nối, vui lòng thử lại");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Delete session ───────────────────────────────────
  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/teacher/schedule?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        showToast("error", json.error ?? "Không thể xóa buổi học");
        return;
      }
      startTransition(() => {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        showToast("success", "Đã xóa buổi học");
      });
    } catch {
      showToast("error", "Lỗi kết nối, vui lòng thử lại");
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Loading skeleton ─────────────────────────────────
  if (isPending && sessions.length === 0) {
    return (
      <div className="flex flex-col gap-md">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-container" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      {/* ─── Toast ─── */}
      {toast && (
        <div
          className={`fixed right-4 top-20 z-50 flex items-center gap-sm rounded-lg px-4 py-3 text-body-md font-medium shadow-card-hover transition-all ${
            toast.type === "success"
              ? "bg-primary text-on-primary"
              : "bg-error-container text-on-error-container"
          }`}
        >
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ─── Toolbar: Filter + Add ─── */}
      <div className="flex flex-wrap items-center gap-md">
        {/* Filter theo lớp */}
        <div className="relative">
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="h-11 appearance-none rounded-full border border-outline-variant bg-surface-container px-4 pr-9 text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">Tất cả lớp</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        </div>

        <div className="ml-auto">
          <Button
            onClick={() => { setShowForm((v) => !v); setFormError(""); }}
            variant={showForm ? "ghost" : "primary"}
            size="md"
          >
            {showForm ? <><X size={18} /> Đóng</> : <><Plus size={18} /> Thêm buổi học</>}
          </Button>
        </div>
      </div>

      {/* ─── Form thêm buổi học ─── */}
      {showForm && (
        <Card className="border border-primary/20 bg-primary-fixed/30">
          <h3 className="mb-md text-headline-sm">Thêm buổi học mới</h3>
          <form onSubmit={handleAdd} className="flex flex-col gap-md">
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              {/* Chọn lớp */}
              <div className="flex flex-col gap-xs">
                <label className="text-label-md font-medium text-on-surface-variant">Lớp học *</label>
                <div className="relative">
                  <select
                    value={formClassId}
                    onChange={(e) => setFormClassId(e.target.value)}
                    required
                    className="h-14 w-full appearance-none rounded-lg border border-outline-variant bg-background px-4 pr-9 text-body-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {classes.length === 0 && (
                      <option value="" disabled>Chưa có lớp nào</option>
                    )}
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                </div>
              </div>

              {/* Chọn thứ */}
              <div className="flex flex-col gap-xs">
                <label className="text-label-md font-medium text-on-surface-variant">Thứ trong tuần *</label>
                <div className="relative">
                  <select
                    value={formDow}
                    onChange={(e) => setFormDow(Number(e.target.value))}
                    required
                    className="h-14 w-full appearance-none rounded-lg border border-outline-variant bg-background px-4 pr-9 text-body-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {DOW_ORDER.map((d) => (
                      <option key={d} value={d}>{DOW_LABEL[d]}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                </div>
              </div>

              {/* Giờ bắt đầu */}
              <div className="flex flex-col gap-xs">
                <label className="text-label-md font-medium text-on-surface-variant">Giờ bắt đầu *</label>
                <input
                  type="time"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  required
                  className="h-14 rounded-lg border border-outline-variant bg-background px-4 text-body-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Giờ kết thúc */}
              <div className="flex flex-col gap-xs">
                <label className="text-label-md font-medium text-on-surface-variant">Giờ kết thúc *</label>
                <input
                  type="time"
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                  required
                  className="h-14 rounded-lg border border-outline-variant bg-background px-4 text-body-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Phòng học */}
              <div className="flex flex-col gap-xs sm:col-span-2">
                <label className="text-label-md font-medium text-on-surface-variant">Phòng học (tuỳ chọn)</label>
                <input
                  type="text"
                  value={formRoom}
                  onChange={(e) => setFormRoom(e.target.value)}
                  placeholder="Ví dụ: Phòng 201, Online (Zoom)..."
                  maxLength={100}
                  className="h-14 rounded-lg border border-outline-variant bg-background px-4 text-body-md placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Error */}
            {formError && (
              <p className="rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">
                {formError}
              </p>
            )}

            <div className="flex gap-md">
              <Button type="submit" loading={isSubmitting} disabled={classes.length === 0}>
                <Plus size={18} /> Thêm buổi học
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setShowForm(false); setFormError(""); }}
              >
                Huỷ
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ─── Empty State ─── */}
      {filteredSessions.length === 0 && (
        <EmptyState
          icon={Calendar}
          title="Chưa có buổi học nào"
          description={
            filterClass !== "all"
              ? "Lớp này chưa có lịch dạy. Nhấn \"Thêm buổi học\" để thiết lập."
              : "Bạn chưa thiết lập lịch dạy nào. Nhấn \"Thêm buổi học\" để bắt đầu."
          }
          action={
            !showForm ? (
              <Button onClick={() => setShowForm(true)}>
                <Plus size={18} /> Thêm buổi học đầu tiên
              </Button>
            ) : undefined
          }
        />
      )}

      {/* ─── Bảng lịch dạy — Group by class → day ─── */}
      {filteredSessions.length > 0 && (
        <div className="flex flex-col gap-lg">
          {Array.from(grouped.entries()).map(([className, dayMap]) => (
            <div key={className}>
              {/* Tiêu đề lớp */}
              <div className="mb-md flex items-center gap-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-fixed text-primary">
                  <BookOpen size={16} />
                </span>
                <h3 className="text-headline-sm">{className}</h3>
                <span className="text-label-md text-on-surface-variant">
                  ({Array.from(dayMap.values()).flat().length} buổi/tuần)
                </span>
              </div>

              {/* Table */}
              <Card padding="none" className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container">
                        <th className="px-lg py-md text-left text-label-md font-semibold text-on-surface-variant">Thứ</th>
                        <th className="px-lg py-md text-left text-label-md font-semibold text-on-surface-variant">Giờ học</th>
                        <th className="px-lg py-md text-left text-label-md font-semibold text-on-surface-variant">Phòng</th>
                        <th className="px-lg py-md text-right text-label-md font-semibold text-on-surface-variant">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DOW_ORDER.flatMap((dow) => {
                        const rows = dayMap.get(dow);
                        if (!rows) return [];
                        return rows.map((s, i) => (
                          <tr
                            key={s.id}
                            className="border-b border-outline-variant/50 transition-colors last:border-0 hover:bg-surface-container/50"
                          >
                            {/* Thứ — chỉ hiển thị dòng đầu của nhóm */}
                            <td className="px-lg py-md">
                              {i === 0 ? (
                                <span className="inline-flex items-center rounded-full bg-primary-fixed px-3 py-1 text-label-md font-semibold text-on-primary-fixed">
                                  {DOW_LABEL[dow]}
                                </span>
                              ) : null}
                            </td>

                            <td className="px-lg py-md">
                              <span className="flex items-center gap-xs text-body-md">
                                <Clock size={14} className="text-on-surface-variant" />
                                {formatTime(s.start_time)} – {formatTime(s.end_time)}
                              </span>
                            </td>

                            <td className="px-lg py-md">
                              {s.room ? (
                                <span className="flex items-center gap-xs text-body-md text-on-surface-variant">
                                  <MapPin size={14} />
                                  {s.room}
                                </span>
                              ) : (
                                <span className="text-label-md text-on-surface-variant/50">—</span>
                              )}
                            </td>

                            <td className="px-lg py-md text-right">
                              <button
                                onClick={() => handleDelete(s.id)}
                                disabled={deletingId === s.id}
                                aria-label="Xóa buổi học"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {deletingId === s.id ? (
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </button>
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
