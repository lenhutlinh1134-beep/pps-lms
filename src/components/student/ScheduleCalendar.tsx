"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, BookOpen, Video } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface ScheduleLecture {
  id: string;
  title: string;
  type: "video" | "theory";
  dateKey: string; // "YYYY-MM-DD"
  className: string;
}

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ScheduleCalendar({ lectures }: { lectures: ScheduleLecture[] }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const todayKey = toDateKey(today);

  // Group lectures by date
  const byDate: Record<string, ScheduleLecture[]> = {};
  for (const l of lectures) {
    if (!byDate[l.dateKey]) byDate[l.dateKey] = [];
    byDate[l.dateKey].push(l);
  }

  // Calendar math
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const offsetMonday = firstWeekday === 0 ? 6 : firstWeekday - 1; // Mon=0 … Sun=6
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  }

  function dayKey(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const selectedLectures = selectedDay ? (byDate[selectedDay] ?? []) : [];

  return (
    <div className="flex flex-col gap-lg lg:flex-row lg:items-start">
      {/* ===== Lịch ===== */}
      <Card className="flex-1">
        {/* Header tháng */}
        <div className="mb-lg flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-container"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-headline-sm capitalize">{monthLabel}</h2>
          <button
            onClick={nextMonth}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-container"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Tiêu đề ngày trong tuần */}
        <div className="mb-sm grid grid-cols-7">
          {DAY_LABELS.map((d) => (
            <div key={d} className="py-1 text-center text-label-sm font-semibold uppercase text-on-surface-variant">
              {d}
            </div>
          ))}
        </div>

        {/* Ô ngày */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: offsetMonday }).map((_, i) => <div key={`e${i}`} />)}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const key = dayKey(day);
            const hasContent = key in byDate;
            const isToday = key === todayKey;
            const isSelected = key === selectedDay;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : key)}
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-md text-body-md transition-colors",
                  isSelected && "bg-primary font-semibold text-on-primary",
                  isToday && !isSelected && "bg-primary-fixed font-semibold text-primary",
                  !isToday && !isSelected && "hover:bg-surface-container",
                  !isToday && !isSelected && hasContent && "text-primary",
                )}
              >
                {day}
                {hasContent && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Chú thích */}
        <div className="mt-lg flex flex-wrap gap-md border-t border-outline-variant pt-md">
          <div className="flex items-center gap-xs text-label-sm text-on-surface-variant">
            <span className="h-2 w-2 rounded-full bg-primary" /> Có bài giảng mới
          </div>
          <div className="flex items-center gap-xs text-label-sm text-on-surface-variant">
            <span className="h-4 w-4 rounded-md bg-primary-fixed" /> Hôm nay
          </div>
        </div>
      </Card>

      {/* ===== Danh sách bài giảng ngày được chọn ===== */}
      <div className="flex flex-col gap-md lg:w-80">
        {selectedDay ? (
          <>
            <h3 className="text-headline-sm">
              {new Date(selectedDay + "T00:00:00").toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h3>

            {selectedLectures.length === 0 ? (
              <Card className="py-lg text-center">
                <p className="text-body-md text-on-surface-variant">Không có bài giảng ngày này.</p>
              </Card>
            ) : (
              selectedLectures.map((l) => (
                <Link key={l.id} href={`/student/lectures/${l.id}`}>
                  <Card interactive className="flex items-start gap-sm">
                    <span className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
                      l.type === "video"
                        ? "bg-secondary-fixed text-secondary"
                        : "bg-primary-fixed text-primary",
                    )}>
                      {l.type === "video" ? <Video size={18} /> : <BookOpen size={18} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-body-md font-medium">{l.title}</p>
                      <p className="mt-xs text-label-sm text-on-surface-variant">{l.className}</p>
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </>
        ) : (
          <Card className="py-xl text-center">
            <p className="text-body-lg font-medium">Chọn một ngày</p>
            <p className="mt-xs text-body-md text-on-surface-variant">
              để xem bài giảng được đăng hôm đó.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
