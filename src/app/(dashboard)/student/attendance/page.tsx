import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState, StatTile } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

type AttendanceStatus = "present" | "absent" | "late";

interface AttendanceRow {
  id: string;
  date: string;
  status: AttendanceStatus;
  class: { name: string } | null;
}

// Demo data — 12 bản ghi trải 3 tháng
const DEMO_RECORDS: AttendanceRow[] = [
  { id: "1",  date: "2026-06-09", status: "present", class: { name: "IELTS Intermediate A" } },
  { id: "2",  date: "2026-06-07", status: "present", class: { name: "IELTS Intermediate A" } },
  { id: "3",  date: "2026-06-05", status: "late",    class: { name: "Speaking Club B" } },
  { id: "4",  date: "2026-06-02", status: "present", class: { name: "IELTS Intermediate A" } },
  { id: "5",  date: "2026-05-30", status: "absent",  class: { name: "Speaking Club B" } },
  { id: "6",  date: "2026-05-26", status: "present", class: { name: "IELTS Intermediate A" } },
  { id: "7",  date: "2026-05-22", status: "present", class: { name: "Speaking Club B" } },
  { id: "8",  date: "2026-05-19", status: "late",    class: { name: "IELTS Intermediate A" } },
  { id: "9",  date: "2026-05-15", status: "present", class: { name: "Speaking Club B" } },
  { id: "10", date: "2026-04-28", status: "absent",  class: { name: "IELTS Intermediate A" } },
  { id: "11", date: "2026-04-21", status: "present", class: { name: "Speaking Club B" } },
  { id: "12", date: "2026-04-14", status: "present", class: { name: "IELTS Intermediate A" } },
];

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; badge: string; symbol: string }> = {
  present: {
    label: "Có mặt",
    symbol: "✓",
    badge: "bg-tertiary-fixed text-on-tertiary-fixed",
  },
  absent: {
    label: "Vắng",
    symbol: "✗",
    badge: "bg-error-container text-on-error-container",
  },
  late: {
    label: "Trễ",
    symbol: "⏰",
    badge: "bg-secondary-fixed text-on-secondary-fixed",
  },
};

const WEEKDAY = ["CN", "Th.2", "Th.3", "Th.4", "Th.5", "Th.6", "Th.7"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return { display: `${dd}/${mm}`, weekday: WEEKDAY[d.getDay()] };
}

function groupByMonth(records: AttendanceRow[]) {
  const groups: Map<string, AttendanceRow[]> = new Map();
  for (const r of records) {
    const d = new Date(r.date + "T00:00:00");
    const key = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return groups;
}

const VALID_STATUS = ["present", "absent", "late"] as const;
type FilterStatus = (typeof VALID_STATUS)[number] | undefined;

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const profile = await requireRole("student");
  const supabase = await createClient();
  const params = await searchParams;

  const filterStatus: FilterStatus = VALID_STATUS.includes(params.status as AttendanceStatus)
    ? (params.status as AttendanceStatus)
    : undefined;

  let records: AttendanceRow[] = [];
  let isDemo = false;

  // Thử query thật — nếu không có dữ liệu thì dùng demo
  const query = supabase
    .from("attendance")
    .select("id, date, status, class:classes(name)")
    .eq("student_id", profile.id)
    .order("date", { ascending: false })
    .limit(90);

  if (filterStatus) {
    query.eq("status", filterStatus);
  }

  const { data, error } = await query;

  if (!error && data && data.length > 0) {
    records = data as unknown as AttendanceRow[];
  } else {
    // Demo mode
    isDemo = true;
    records = filterStatus
      ? DEMO_RECORDS.filter((r) => r.status === filterStatus)
      : DEMO_RECORDS;
  }

  // Tính thống kê — luôn dựa trên toàn bộ (không filter) để stat tiles chuẩn
  const allRecords: AttendanceRow[] = isDemo ? DEMO_RECORDS : (data as unknown as AttendanceRow[] ?? []);
  const totalCount   = allRecords.length;
  const presentCount = allRecords.filter((r) => r.status === "present").length;
  const absentCount  = allRecords.filter((r) => r.status === "absent").length;
  const lateCount    = allRecords.filter((r) => r.status === "late").length;
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const grouped = groupByMonth(records);

  const TABS = [
    { label: "Tất cả",  value: "" },
    { label: "Có mặt",  value: "present" },
    { label: "Vắng",    value: "absent" },
    { label: "Đi trễ",  value: "late" },
  ];

  return (
    <DashboardShell role="student" userName={profile.full_name || "Học sinh"}>
      <div className="mx-auto flex max-w-3xl flex-col gap-lg">

        {/* ── Header ── */}
        <div className="flex items-start gap-md">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary">
            <ClipboardCheck size={26} />
          </span>
          <div>
            <h1 className="text-display-lg">Lịch sử điểm danh</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Theo dõi tình trạng có mặt trong 3 tháng gần nhất
            </p>
          </div>
        </div>

        {/* ── Demo banner ── */}
        {isDemo && (
          <div className="rounded-lg bg-surface-container px-md py-sm text-label-md text-on-surface-variant">
            Đang hiển thị dữ liệu mẫu — dữ liệu thực sẽ xuất hiện sau khi giáo viên điểm danh.
          </div>
        )}

        {/* ── Tỉ lệ có mặt to ── */}
        <Card className="flex flex-col items-center gap-md py-xl sm:flex-row sm:items-center sm:gap-xl">
          {/* Số % */}
          <div className="flex flex-col items-center">
            <span className="font-display text-[3.5rem] font-bold leading-none text-primary">
              {attendanceRate}%
            </span>
            <span className="mt-1 text-label-md text-on-surface-variant">Tỉ lệ có mặt</span>
          </div>

          {/* Progress bar */}
          <div className="w-full flex-1">
            <div className="flex justify-between text-label-sm text-on-surface-variant">
              <span>0%</span>
              <span>100%</span>
            </div>
            <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-surface-container">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
            <p className="mt-2 text-label-md text-on-surface-variant text-center">
              {presentCount} buổi có mặt / {totalCount} tổng buổi
              {lateCount > 0 && ` · ${lateCount} buổi trễ`}
            </p>
          </div>
        </Card>

        {/* ── Stat tiles ── */}
        <div className="grid grid-cols-3 gap-md">
          <StatTile label="Tổng buổi"   value={String(totalCount)}   hint="3 tháng gần nhất" />
          <StatTile label="Có mặt"      value={String(presentCount)} hint={`${attendanceRate}%`} />
          <StatTile label="Vắng"        value={String(absentCount)}  hint={lateCount > 0 ? `${lateCount} buổi trễ` : undefined} />
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex flex-wrap gap-sm">
          {TABS.map((tab) => {
            const isActive = (filterStatus ?? "") === tab.value;
            return (
              <Link
                key={tab.value}
                href={tab.value ? `?status=${tab.value}` : "?"}
                className={`rounded-full px-md py-sm text-label-md font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface-variant hover:bg-primary-fixed hover:text-on-primary-fixed"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* ── Danh sách điểm danh ── */}
        {records.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Chưa có dữ liệu điểm danh nào."
            description="Không tìm thấy buổi học nào với bộ lọc đang chọn."
          />
        ) : (
          <div className="flex flex-col gap-lg">
            {Array.from(grouped.entries()).map(([month, items]) => (
              <div key={month}>
                <h2 className="mb-sm text-headline-sm text-on-surface-variant">{month}</h2>
                <Card padding="none" className="overflow-hidden">
                  {items.map((row, idx) => {
                    const { display, weekday } = formatDate(row.date);
                    const cfg = STATUS_CONFIG[row.status];
                    const className = (row.class as { name: string } | null)?.name ?? "—";
                    return (
                      <div
                        key={row.id}
                        className={`flex items-center gap-md px-lg py-md ${
                          idx < items.length - 1 ? "border-b border-outline-variant" : ""
                        }`}
                      >
                        {/* Ngày + thứ */}
                        <div className="flex w-16 shrink-0 flex-col items-center text-center">
                          <span className="font-display text-headline-sm text-on-surface">
                            {display}
                          </span>
                          <span className="text-label-sm text-on-surface-variant">{weekday}</span>
                        </div>

                        {/* Tên lớp */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body-md font-medium text-on-surface">
                            {className}
                          </p>
                        </div>

                        {/* Status badge */}
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-md py-xs text-label-md font-medium ${cfg.badge}`}
                        >
                          <span>{cfg.symbol}</span>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
