import { Card } from "@/components/ui/Card";
import type { LucideIcon } from "lucide-react";

/** Trạng thái rỗng (Empty State) — dùng khi chưa có dữ liệu. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-md py-xl text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <Icon size={28} />
      </span>
      <div>
        <h3 className="text-headline-sm">{title}</h3>
        <p className="mx-auto mt-xs max-w-sm text-body-md text-on-surface-variant">{description}</p>
      </div>
      {action}
    </Card>
  );
}

/** Ô số liệu thống kê nhỏ cho dashboard. */
export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card padding="md" className="flex flex-col gap-1">
      <span className="text-label-md uppercase text-on-surface-variant">{label}</span>
      <span className="font-display text-headline-md text-on-surface">{value}</span>
      {hint && <span className="text-label-sm text-on-surface-variant">{hint}</span>}
    </Card>
  );
}
