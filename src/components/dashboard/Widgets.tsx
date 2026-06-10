import Link from "next/link";
import { Check, Circle, Play, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/**
 * Bộ widget dùng chung cho các Dashboard (học sinh / giáo viên / phụ huynh).
 * Bám thiết kế Stitch "LMS Design System": thẻ số liệu có icon + biến động,
 * nhiệm vụ ngày (gamification), thẻ "tiếp tục học".
 * Toàn bộ là server component (không hook) để tải nhanh.
 */

const TONES = {
  primary: { bg: "bg-primary-fixed", fg: "text-primary" },
  secondary: { bg: "bg-secondary-fixed", fg: "text-secondary" },
  tertiary: { bg: "bg-tertiary-fixed", fg: "text-tertiary" },
} as const;

type Tone = keyof typeof TONES;

/** Thẻ số liệu lớn: icon + giá trị + nhãn + biến động (vd "+2 tháng này"). */
export function StatCard({
  icon: Icon,
  value,
  label,
  delta,
  tone = "primary",
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  delta?: string;
  tone?: Tone;
}) {
  const t = TONES[tone];
  return (
    <Card className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-md", t.bg, t.fg)}>
          <Icon size={22} />
        </span>
        {delta && (
          <span className="rounded-full bg-surface-container px-2.5 py-1 text-label-sm font-semibold text-on-surface-variant">
            {delta}
          </span>
        )}
      </div>
      <div>
        <p className="font-display text-display-lg leading-none text-on-surface">{value}</p>
        <p className="mt-xs text-body-md text-on-surface-variant">{label}</p>
      </div>
    </Card>
  );
}

/** Một dòng nhiệm vụ ngày: tiêu đề + điểm thưởng + trạng thái xong/chưa. */
export function QuestItem({
  title,
  points,
  done = false,
}: {
  title: string;
  points: number;
  done?: boolean;
}) {
  return (
    <div className="flex items-center gap-md py-sm">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          done ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant",
        )}
      >
        {done ? <Check size={18} /> : <Circle size={16} />}
      </span>
      <p
        className={cn(
          "flex-1 text-body-md font-medium",
          done ? "text-on-surface-variant line-through" : "text-on-surface",
        )}
      >
        {title}
      </p>
      <span className="rounded-full bg-secondary-fixed px-2.5 py-1 text-label-md text-on-secondary-fixed">
        +{points}
      </span>
    </div>
  );
}

/** Thẻ "tiếp tục học": ảnh/icon + tiêu đề + tiến độ + nút play. */
export function ContinueCard({
  href,
  title,
  meta,
  progress,
  tone = "primary",
}: {
  href: string;
  title: string;
  meta: string;
  /** % hoàn thành 0–100 */
  progress: number;
  tone?: Tone;
}) {
  const t = TONES[tone];
  const pct = Math.max(0, Math.min(100, progress));
  return (
    <Link href={href}>
      <Card interactive padding="md" className="flex items-center gap-md">
        <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-md", t.bg, t.fg)}>
          <Play size={24} className="fill-current" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-lg font-semibold text-on-surface">{title}</p>
          <p className="text-body-md text-on-surface-variant">{meta}</p>
          <div className="mt-sm h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
            <div
              className={cn("h-full rounded-full", tone === "secondary" ? "bg-secondary" : "bg-primary")}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </Card>
    </Link>
  );
}
