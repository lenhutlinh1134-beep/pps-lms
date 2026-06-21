"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, ClipboardCheck, BookOpen, Headphones, Clock, Activity, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";

interface ClassStats {
  total_students: number;
  attendance_rate: number | null;
  avg_score: number | null;
  study_minutes_7d: number;
  listens_7d: number;
  active_students_7d: number;
  absent_count_7d: number;
}

const DEMO_STATS: ClassStats = {
  total_students: 8,
  attendance_rate: 87,
  avg_score: 73,
  study_minutes_7d: 240,
  listens_7d: 34,
  active_students_7d: 6,
  absent_count_7d: 2,
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  pulse,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub?: string;
  color: string;
  pulse?: boolean;
}) {
  return (
    <Card padding="md" className="relative flex flex-col gap-xs">
      {pulse && (
        <span className="absolute right-3 top-3 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tertiary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-tertiary" />
        </span>
      )}
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${color}`}>
        <Icon size={20} />
      </span>
      <p className={`font-display text-display-sm font-bold ${color.replace("bg-", "text-").replace("-fixed", "").replace("text-on-", "text-")}`}>
        {value}
      </p>
      <p className="text-label-md text-on-surface-variant">{label}</p>
      {sub && <p className="text-label-sm text-on-surface-variant">{sub}</p>}
    </Card>
  );
}

export function ClassStatsTab({
  classId,
  demo = false,
  totalStudents,
}: {
  classId: string;
  demo?: boolean;
  totalStudents: number;
}) {
  const [stats, setStats] = useState<ClassStats | null>(demo ? DEMO_STATS : null);
  const [loading, setLoading] = useState(!demo);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [pulse, setPulse] = useState(false);
  const [error, setError] = useState(false);

  const fetchStats = useCallback(async () => {
    if (demo) return;
    try {
      setError(false);
      const supabase = createClient();
      const { data, error: rpcErr } = await supabase.rpc("get_class_stats", { p_class_id: classId });
      if (rpcErr) throw rpcErr;
      if (data) {
        setStats(data as ClassStats);
        setLastUpdated(new Date());
        setPulse(true);
        setTimeout(() => setPulse(false), 1500);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [classId, demo]);

  useEffect(() => {
    fetchStats();
    if (demo) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`class-stats-${classId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "student_logs" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions" }, fetchStats)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance" }, fetchStats)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [classId, demo, fetchStats]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} padding="md" className="animate-pulse">
            <div className="h-10 w-10 rounded-full bg-surface-container-high" />
            <div className="mt-2 h-8 w-16 rounded bg-surface-container-high" />
            <div className="mt-1 h-4 w-24 rounded bg-surface-container-high" />
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card padding="md" className="flex flex-col items-center gap-md text-center">
        <p className="text-body-md text-on-surface-variant">Không thể tải số liệu. Thử lại sau.</p>
        <button
          onClick={fetchStats}
          className="inline-flex items-center gap-2 rounded-full bg-primary-fixed px-4 py-2 text-label-md font-semibold text-on-primary-fixed hover:opacity-90"
        >
          <RefreshCw size={14} /> Tải lại
        </button>
      </Card>
    );
  }

  const activeRate = totalStudents > 0
    ? Math.round((stats.active_students_7d / totalStudents) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-lg">
      {/* Live indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-tertiary" />
          </span>
          <span className="text-label-md text-on-surface-variant">
            Cập nhật tự động khi có dữ liệu mới
          </span>
        </div>
        <span className="text-label-sm text-on-surface-variant">
          Cập nhật lúc {lastUpdated.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
        <StatCard
          icon={Users}
          label="Học sinh"
          value={`${stats.total_students}`}
          sub="Đang học trong lớp"
          color="bg-primary-fixed text-on-primary-fixed"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Tỉ lệ đi học"
          value={stats.attendance_rate != null ? `${stats.attendance_rate}%` : "—"}
          sub="30 ngày gần nhất"
          color="bg-tertiary-fixed text-on-tertiary-fixed"
          pulse={pulse}
        />
        <StatCard
          icon={BookOpen}
          label="Điểm trung bình"
          value={stats.avg_score != null ? `${stats.avg_score}%` : "—"}
          sub="Tất cả bài tập"
          color="bg-secondary-fixed text-on-secondary-fixed"
          pulse={pulse}
        />
        <StatCard
          icon={Activity}
          label="Học sinh hoạt động"
          value={`${stats.active_students_7d}/${stats.total_students}`}
          sub={`${activeRate}% — 7 ngày qua`}
          color="bg-primary-fixed text-on-primary-fixed"
          pulse={pulse}
        />
        <StatCard
          icon={Headphones}
          label="Lượt luyện nghe"
          value={`${stats.listens_7d}`}
          sub="7 ngày qua"
          color="bg-secondary-fixed text-on-secondary-fixed"
          pulse={pulse}
        />
        <StatCard
          icon={Clock}
          label="Phút học"
          value={`${stats.study_minutes_7d}'`}
          sub="7 ngày qua"
          color="bg-tertiary-fixed text-on-tertiary-fixed"
          pulse={pulse}
        />
      </div>

      {/* Cảnh báo nhanh */}
      {stats.absent_count_7d > 0 && (
        <Card padding="md" className="border-l-4 border-error bg-error-container/30">
          <p className="text-body-md font-semibold text-on-error-container">
            ⚠️ {stats.absent_count_7d} lần vắng trong 7 ngày qua
          </p>
          <p className="text-label-sm text-on-error-container">
            Xem tab Lịch sử điểm danh để biết thêm chi tiết.
          </p>
        </Card>
      )}

      {stats.active_students_7d < stats.total_students / 2 && stats.total_students > 0 && (
        <Card padding="md" className="border-l-4 border-secondary bg-secondary-fixed/30">
          <p className="text-body-md font-semibold text-secondary">
            📊 Chỉ {activeRate}% học sinh hoạt động trong tuần này
          </p>
          <p className="text-label-sm text-on-surface-variant">
            Xem tab Cảnh báo để biết học sinh nào cần chú ý.
          </p>
        </Card>
      )}
    </div>
  );
}
