"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { LectureGrid, type LectureItem } from "@/components/lectures/LectureGrid";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 9;

export function LectureBrowser({
  lectures,
  basePath,
  watchedIds,
}: {
  lectures: LectureItem[];
  basePath: string;
  watchedIds?: string[];
}) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "video" | "theory">("all");
  const [cls, setCls] = useState("all");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const watchedSet = useMemo(() => new Set(watchedIds ?? []), [watchedIds]);
  const classNames = useMemo(
    () => Array.from(new Set(lectures.map((l) => l.class?.name).filter(Boolean))) as string[],
    [lectures],
  );

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return lectures.filter((l) => {
      if (type !== "all" && l.type !== type) return false;
      if (cls !== "all" && l.class?.name !== cls) return false;
      if (kw && !l.title.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [lectures, q, type, cls]);

  const shown = filtered.slice(0, visible);

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setVisible(PAGE_SIZE); };
  }

  return (
    <div className="flex flex-col gap-md">
      {/* Thanh tìm kiếm + lọc */}
      <div className="flex flex-col gap-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
          <input
            value={q}
            onChange={(e) => resetPage(setQ)(e.target.value)}
            placeholder="Tìm bài giảng theo tiêu đề..."
            className="h-14 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-12 pr-4 text-body-md outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        {classNames.length > 0 && (
          <select value={cls} onChange={(e) => resetPage(setCls)(e.target.value)}
            className="h-14 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-md outline-none focus:border-primary">
            <option value="all">Tất cả lớp</option>
            {classNames.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <div className="inline-flex rounded-lg border border-outline-variant bg-surface-container p-1">
          {([["all", "Tất cả"], ["video", "Video"], ["theory", "Lý thuyết"]] as const).map(([v, label]) => (
            <button key={v} onClick={() => resetPage(setType)(v)}
              className={cn("rounded-md px-3 py-1.5 text-label-md font-semibold transition-colors",
                type === v ? "bg-surface-container-lowest text-primary shadow-card" : "text-on-surface-variant")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Kết quả */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-sm rounded-lg bg-surface-container px-4 py-xl text-center">
          <SlidersHorizontal size={28} className="text-on-surface-variant" />
          <p className="text-body-md text-on-surface-variant">Không tìm thấy bài giảng nào khớp bộ lọc.</p>
        </div>
      ) : (
        <>
          <p className="text-label-md text-on-surface-variant">{filtered.length} bài giảng</p>
          <LectureGrid lectures={shown} basePath={basePath} watchedIds={watchedSet} />
          {visible < filtered.length && (
            <div className="flex justify-center">
              <button onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="rounded-full border border-outline-variant bg-surface-container-lowest px-6 py-3 text-body-md font-semibold text-primary shadow-card transition-shadow hover:shadow-card-hover">
                Xem thêm ({filtered.length - visible})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
