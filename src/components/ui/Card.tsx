import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** padding nội dung — mặc định lg (24px) theo dign.md */
  padding?: "none" | "md" | "lg";
  /** nổi bật khi hover (dùng cho card có thể bấm) */
  interactive?: boolean;
}

const paddings = {
  none: "",
  md: "p-md",
  lg: "p-lg",
};

export function Card({ className, padding = "lg", interactive, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface-container-lowest rounded-lg shadow-card",
        interactive && "cursor-pointer transition-shadow hover:shadow-card-hover",
        paddings[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-headline-sm", className)} {...props}>
      {children}
    </h3>
  );
}

/** Chip trạng thái nhỏ (vd: "Hoàn thành", "Điểm: 90") */
export function Chip({
  color = "primary",
  className,
  children,
}: {
  color?: "primary" | "secondary" | "tertiary" | "error" | "neutral";
  className?: string;
  children: React.ReactNode;
}) {
  const colors = {
    primary: "bg-primary-fixed text-on-primary-fixed",
    secondary: "bg-secondary-fixed text-on-secondary-fixed",
    tertiary: "bg-tertiary-fixed text-on-tertiary-fixed",
    error: "bg-error-container text-on-error-container",
    neutral: "bg-surface-container-high text-on-surface-variant",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-label-md",
        colors[color],
        className,
      )}
    >
      {children}
    </span>
  );
}
