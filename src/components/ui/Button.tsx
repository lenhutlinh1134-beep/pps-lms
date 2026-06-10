import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "premium" | "secondary";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Hiển thị trạng thái đang xử lý (Loading State) */
  loading?: boolean;
  fullWidth?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

const variants: Record<Variant, string> = {
  // Nút chính: nền tím đặc, chữ trắng, bo pill (dign.md)
  primary:
    "bg-primary text-on-primary hover:bg-primary-container shadow-card-hover focus-visible:ring-primary",
  secondary:
    "bg-secondary text-on-secondary hover:bg-secondary-container focus-visible:ring-secondary",
  // Ghost: trong suốt, viền nhẹ — điều hướng phụ
  ghost:
    "bg-transparent text-on-surface border border-outline-variant hover:bg-surface-container focus-visible:ring-primary",
  // Premium: gradient Violet → Magenta
  premium:
    "bg-premium text-white hover:opacity-95 shadow-card-hover focus-visible:ring-secondary",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-label-md",
  md: "h-11 px-6 text-body-md",
  lg: "h-14 px-8 text-body-lg",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading,
  fullWidth,
  disabled,
  children,
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
