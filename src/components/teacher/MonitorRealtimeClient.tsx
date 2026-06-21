"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Activity, Eye, Headphones, Clock, TrendingUp, Users, Wifi, WifiOff, RefreshCw, AlertTriangle, Flag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

export interface StudentFlag {
  type: "inactive" | "low_listening" | "low_study" | "low_score";
  label: string;
  color: "red" | "orange" | "yellow";
}

export interface StudentActivity {
  student_id: string;
  student_name: string | null;
  class_name: string;
  study_minutes_today: number;
  listens_today: number;
  last_active: string | null;
  is_online: boolean;
  flags?: StudentFlag[];
  study_minutes_week?: number;
  listens_week?: number;
}

export interface LectureStats {
  lecture_id: string;
  lecture_title: string;
  class_name: string;
  view_count: number;
  comment_count: number;
}

function minutesToHours(min: number) {
  if (min < 60) return `${min} phút`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}g ${m}p` : `${h} giờ`;
}

function timeAgo(iso: string | null) {
  if (!iso) return "Chưa hoạt động";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Vừa xong";
  if (min < 60) return `${min} phút trước`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

export function MonitorRealtimeClient({
  initialStudents,
  lectureStats,
  studentIds,
}: {
  initialStudents: StudentActivity[];
  lectureStats: LectureStats[];
  studentIds: string[];
}) {
  const [students, setStudents] = useState<StudentActivity[]>(initialStudents);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [pulse, setPulse] = useState(false);
  const studentIdsRef = useRef(studentIds);
  studentIdsRef.current = studentIds;

  useEffect(() => {
    if (studentIds.length === 0) return;
    const supabase = createClient();

    const channel = supabase
      .channel("monitor-student-logs")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "student_logs",
        },
        (payload) => {
          const log = payload.new as {
            student_id: string;
            study_minutes?: number;
            listen_count?: number;
            created_at: string;
          };

          if (!studentIdsRef.current.includes(log.student_id)) return;

          const fifteenMinAgo = Date.now() - 15 * 60 * 1000;
          const logTime = new Date(log.created_at).getTime();
          const isOnline = logTime >= fifteenMinAgo;

          setStudents((prev) =>
            prev
              .map((s) => {
                if (s.student_id !== log.student_id) return s;
                return {
                  ...s,
                  study_minutes_today: s.study_minutes_today + (log.study_minutes ?? 0),
                  listens_today: s.listens_today + (log.listen_count ?? 0),
                  last_active: log.created_at,
                  is_online: isOnline || s.is_online,
                };
              })
              .sort((a, b) => {
                if (a.is_online !== b.is_online) return b.is_online ? 1 : -1;
                if (!a.last_active) return 1;
                if (!b.last_active) return -1;
                return b.last_active.localeCompare(a.last_active);
              })
          );

          setLastUpdate(new Date());
          setPulse(true);
          setTimeout(() => setPulse(false), 800);
        }
      )
      .subscribe();

    // Cập nhật trạng thái online mỗi 60 giây (phát hiện người offline)
    const ticker = setInterval(() => {
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      setStudents((prev) =>
        prev.map((s) => ({
          ...s,
          is_online: !!s.last_active && s.last_active >= fifteenMinAgo,
        }))
      );
    }, 60_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(ticker);
    };
  }, [studentIds]);

  const flagColors: Record<string, string> = {
    red: "bg-error-container text-on-error-container",
    orange: "bg-secondary-fixed text-on-secondary-fixed",
    yellow: "bg-primary-fixed text-on-primary-fixed",
  };

  const studentsWithFlags = students.filter((s) => s.flags && s.flags.length > 0);
  const totalOnline = students.filter((s) => s.is_online).length;
  const activeToday = students.filter(
    (s) => s.study_minutes_today > 0 || s.listens_today > 0
  ).length;
  const totalStudyMinutesToday = students.reduce(
    (sum, s) => sum + s.study_minutes_today,
    0
  );
  const totalListensToday = students.reduce(
    (sum, s) => sum + s.listens_today,
    0
  );

  return (
    <div className="flex flex-col gap-lg">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-md lg:grid-cols-4">
        <Card padding="md" className="text-center">
          <div className="mx-auto mb-sm flex h-10 w-10 items-center justify-center rounded-full bg-tertiary-fixed text-tertiary">
            <Wifi size={20} />
          </div>
          <p className={cn("font-display text-display-sm text-tertiary transition-transform", pulse && "scale-110")}>
            {totalOnline}
          </p>
          <p className="text-label-md text-on-surface-variant">Đang online</p>
          <p className="mt-xs text-label-sm text-on-surface-variant">(15 phút gần nhất)</p>
        </Card>
        <Card padding="md" className="text-center">
          <div className="mx-auto mb-sm flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <Activity size={20} />
          </div>
          <p className="font-display text-display-sm text-primary">{activeToday}</p>
          <p className="text-label-md text-on-surface-variant">Học hôm nay</p>
          <p className="mt-xs text-label-sm text-on-surface-variant">/ {students.length} học sinh</p>
        </Card>
        <Card padding="md" className="text-center">
          <div className="mx-auto mb-sm flex h-10 w-10 items-center justify-center rounded-full bg-secondary-fixed text-secondary">
            <Clock size={20} />
          </div>
          <p className="font-display text-display-sm text-secondary">
            {minutesToHours(totalStudyMinutesToday)}
          </p>
          <p className="text-label-md text-on-surface-variant">Tổng giờ học</p>
          <p className="mt-xs text-label-sm text-on-surface-variant">hôm nay</p>
        </Card>
        <Card padding="md" className="text-center">
          <div className="mx-auto mb-sm flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <Headphones size={20} />
          </div>
          <p className="font-display text-display-sm text-primary">{totalListensToday}</p>
          <p className="text-label-md text-on-surface-variant">Lượt nghe</p>
          <p className="mt-xs text-label-sm text-on-surface-variant">hôm nay</p>
        </Card>
      </div>

      {/* Cảnh báo học sinh cần chú ý */}
      {studentsWithFlags.length > 0 && (
        <Card padding="md" className="border border-error-container bg-error-container/30">
          <h2 className="mb-md flex items-center gap-2 text-headline-sm text-error">
            <Flag size={18} /> {studentsWithFlags.length} học sinh cần chú ý
          </h2>
          <div className="flex flex-col gap-sm">
            {studentsWithFlags.map((s) => (
              <div key={s.student_id} className="flex flex-wrap items-center gap-sm rounded-lg bg-surface-container-lowest p-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-display text-label-md font-bold text-on-primary-fixed">
                  {(s.student_name ?? "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body-md font-semibold">{s.student_name}</p>
                  <p className="text-label-sm text-on-surface-variant">{s.class_name}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.flags?.map((f) => (
                    <span key={f.type} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-medium", flagColors[f.color])}>
                      <AlertTriangle size={10} /> {f.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-[1fr_340px]">
        {/* Bảng học sinh */}
        <section className="flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-headline-sm">
              <Users size={18} className="text-primary" /> Hoạt động học sinh
            </h2>
            <span className="flex items-center gap-1.5 text-label-sm text-on-surface-variant">
              <RefreshCw size={12} className={cn(pulse && "animate-spin")} />
              Cập nhật lúc {lastUpdate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>

          {students.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Chưa có dữ liệu học sinh"
              description="Dữ liệu xuất hiện khi học sinh bắt đầu học và hệ thống ghi nhận hoạt động."
            />
          ) : (
            <div className="flex flex-col gap-sm">
              {students.map((s) => (
                <Card key={s.student_id} padding="md">
                  <div className="flex items-center gap-md">
                    <div className="relative shrink-0">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed font-display text-body-md font-bold text-on-primary-fixed">
                        {(s.student_name ?? "?").charAt(0).toUpperCase()}
                      </span>
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface-container-lowest",
                        s.is_online ? "bg-tertiary" : "bg-surface-container-high",
                      )} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/teacher/students/${s.student_id}`} className="text-body-md font-semibold hover:text-primary hover:underline">
                          {s.student_name ?? "(Chưa có tên)"}
                        </Link>
                        {s.is_online ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-tertiary-fixed px-2 py-0.5 text-label-sm font-medium text-on-tertiary-fixed">
                            <Wifi size={10} /> Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
                            <WifiOff size={10} /> {timeAgo(s.last_active)}
                          </span>
                        )}
                        {s.flags?.map((f) => (
                          <span key={f.type} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-medium", flagColors[f.color])}>
                            <AlertTriangle size={10} /> {f.label}
                          </span>
                        ))}
                      </div>
                      <p className="text-label-sm text-on-surface-variant">{s.class_name}</p>
                    </div>

                    <div className="hidden shrink-0 items-center gap-lg sm:flex">
                      <div className="text-center">
                        <p className="text-body-md font-bold text-secondary">
                          {minutesToHours(s.study_minutes_today)}
                        </p>
                        <p className="text-label-sm text-on-surface-variant">Học hôm nay</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body-md font-bold text-primary">{s.listens_today}</p>
                        <p className="text-label-sm text-on-surface-variant">Lượt nghe</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-sm flex gap-md sm:hidden">
                    <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                      <Clock size={12} /> {minutesToHours(s.study_minutes_today)}
                    </span>
                    <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                      <Headphones size={12} /> {s.listens_today} lượt nghe
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Top bài giảng */}
        <section className="flex flex-col gap-sm">
          <h2 className="flex items-center gap-2 text-headline-sm">
            <TrendingUp size={18} className="text-primary" /> Bài giảng được xem nhiều
          </h2>
          {lectureStats.length === 0 ? (
            <Card padding="md">
              <p className="text-center text-body-md text-on-surface-variant">Chưa có dữ liệu bài giảng</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-sm">
              {lectureStats.map((l, i) => (
                <Card key={l.lecture_id} padding="md">
                  <div className="flex items-start gap-sm">
                    <span className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-label-sm font-bold",
                      i === 0 ? "bg-premium text-white" : "bg-surface-container text-on-surface-variant",
                    )}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-md font-semibold">{l.lecture_title}</p>
                      <p className="text-label-sm text-on-surface-variant">{l.class_name}</p>
                      <div className="mt-xs flex items-center gap-md">
                        <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                          <Eye size={12} /> {l.view_count} lượt xem
                        </span>
                        <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                          <Activity size={12} /> {l.comment_count} câu hỏi
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
