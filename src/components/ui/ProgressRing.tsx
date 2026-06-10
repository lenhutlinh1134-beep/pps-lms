import { cn } from "@/lib/utils";

/**
 * Vòng tiến độ (Progress Ring) — theo dign.md: nét dày, đầu bo tròn,
 * track màu phụ + tiến độ màu chính, nhãn % ở giữa.
 * Component thuần SVG (server-safe), tái dùng cho dashboard / báo cáo / mục tiêu tuần.
 */
export function ProgressRing({
  value,
  size = 120,
  stroke = 12,
  label,
  sublabel,
  color = "stroke-primary",
  track = "stroke-primary-fixed",
  className,
}: {
  /** phần trăm 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  /** nội dung lớn ở giữa (mặc định: "{value}%") */
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
  /** class màu nét tiến độ (vd: stroke-secondary) */
  color?: string;
  track?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className={track}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={cn(color, "transition-[stroke-dashoffset] duration-700 ease-out")}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-headline-md leading-none text-on-surface">
          {label ?? `${Math.round(pct)}%`}
        </span>
        {sublabel && (
          <span className="mt-1 text-label-sm text-on-surface-variant">{sublabel}</span>
        )}
      </div>
    </div>
  );
}
