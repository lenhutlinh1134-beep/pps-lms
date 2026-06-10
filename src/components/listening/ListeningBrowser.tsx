"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Play, Headphones, X, SlidersHorizontal } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface TopicMeta {
  id: string;
  emoji: string;
  name: string;
  count: number;
}

const COVERS = [
  "bg-premium",
  "bg-gradient-to-br from-tertiary to-tertiary-container",
  "bg-gradient-to-br from-primary to-primary-container",
  "bg-gradient-to-br from-secondary to-secondary-container",
] as const;

type LengthFilter = "all" | "short" | "medium" | "long";

function getLengthLabel(count: number): LengthFilter {
  if (count <= 5) return "short";
  if (count <= 10) return "medium";
  return "long";
}

export function ListeningBrowser({ topics }: { topics: TopicMeta[] }) {
  const [q, setQ] = useState("");
  const [length, setLength] = useState<LengthFilter>("all");

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return topics.filter((t) => {
      if (length !== "all" && getLengthLabel(t.count) !== length) return false;
      if (kw && !t.name.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [topics, q, length]);

  const hasFilter = q || length !== "all";

  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center gap-md rounded-xl bg-surface-container-low px-4 py-xl text-center">
        <span className="text-5xl">🎧</span>
        <p className="text-headline-sm">Chưa có bài luyện nghe nào</p>
        <p className="text-body-md text-on-surface-variant">Giáo viên chưa thêm bài luyện nghe. Vui lòng quay lại sau.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-md">
      {/* Thanh search + filter */}
      <div className="flex flex-col gap-sm sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm chủ đề luyện nghe..."
            className="h-14 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-12 pr-10 text-body-md outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter chips: độ dài */}
        <div className="flex items-center gap-1 rounded-xl border border-outline-variant bg-surface-container p-1">
          <SlidersHorizontal size={16} className="ml-2 shrink-0 text-on-surface-variant" />
          {([
            ["all", "Tất cả"],
            ["short", "Ngắn ≤5"],
            ["medium", "Vừa 6-10"],
            ["long", "Dài >10"],
          ] as [LengthFilter, string][]).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setLength(v)}
              className={cn(
                "rounded-lg px-3 py-2 text-label-md font-semibold transition-colors",
                length === v
                  ? "bg-surface-container-lowest text-primary shadow-card"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Kết quả */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-sm rounded-xl bg-surface-container px-4 py-xl text-center">
          <Search size={28} className="text-on-surface-variant opacity-40" />
          <p className="text-body-md font-semibold text-on-surface">Không tìm thấy chủ đề nào</p>
          <p className="text-body-md text-on-surface-variant">
            Thử từ khoá khác hoặc{" "}
            <button
              onClick={() => { setQ(""); setLength("all"); }}
              className="font-semibold text-primary hover:underline"
            >
              xoá bộ lọc
            </button>
          </p>
        </div>
      ) : (
        <>
          <p className="text-label-md text-on-surface-variant">
            {hasFilter ? `${filtered.length} / ${topics.length} chủ đề` : `${topics.length} chủ đề · ${topics.reduce((a, t) => a + t.count, 0)} đoạn`}
          </p>

          <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t, i) => {
              const cover = COVERS[topics.indexOf(t) % COVERS.length];
              const lengthLabel =
                t.count <= 5 ? { text: "Ngắn", cls: "bg-tertiary-fixed text-on-tertiary-fixed" }
                : t.count <= 10 ? { text: "Vừa", cls: "bg-secondary-fixed text-on-secondary-fixed" }
                : { text: "Dài", cls: "bg-primary-fixed text-on-primary-fixed" };

              return (
                <Link key={t.id} href={`/student/listening/${t.id}`} className="group">
                  <Card interactive padding="none" className="flex h-full flex-col overflow-hidden">
                    {/* Bìa */}
                    <div className={`relative flex h-32 items-center justify-center ${cover}`}>
                      <span className="text-5xl drop-shadow-sm transition-transform duration-300 group-hover:scale-110">
                        {t.emoji || "🎧"}
                      </span>
                      {/* Badge số thứ tự */}
                      <span className="absolute left-3 top-3 rounded-full bg-black/30 px-2.5 py-1 text-label-sm font-semibold text-white backdrop-blur-sm">
                        Bài {topics.indexOf(t) + 1}
                      </span>
                      {/* Badge độ dài */}
                      <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-label-sm font-semibold ${lengthLabel.cls}`}>
                        {lengthLabel.text}
                      </span>
                      {/* Play overlay on hover */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                        <div className="flex h-12 w-12 scale-0 items-center justify-center rounded-full bg-white/90 text-primary shadow-card-hover transition-transform group-hover:scale-100">
                          <Play size={20} className="ml-1 fill-current" />
                        </div>
                      </div>
                    </div>

                    {/* Nội dung */}
                    <div className="flex flex-1 flex-col gap-sm p-md">
                      <h3 className="flex-1 text-headline-sm leading-snug">{t.name}</h3>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-label-md text-on-surface-variant">
                          <Headphones size={14} /> {t.count} đoạn
                        </span>
                        <span className="flex items-center gap-1 text-label-md font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                          <Play size={12} className="fill-current" /> Luyện nghe
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
