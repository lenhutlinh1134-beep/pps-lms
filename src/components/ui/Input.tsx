import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** icon đứng trước (vd icon tìm kiếm) */
  leadingIcon?: React.ReactNode;
  error?: string;
  ref?: React.Ref<HTMLInputElement>;
}

export function Input({ className, label, leadingIcon, error, id, ref, ...props }: InputProps) {
  const inputId = id || props.name;
  return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-2 block text-label-md text-on-surface-variant">
            {label}
          </label>
        )}
        <div className="relative">
          {leadingIcon && (
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-outline">
              {leadingIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              // Cao 56px, bo 16px, dễ chạm trên mobile (dign.md)
              "h-14 w-full rounded-lg bg-surface-container-lowest text-body-lg text-on-surface",
              "border border-outline-variant placeholder:text-outline",
              "transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30",
              leadingIcon ? "pl-12 pr-4" : "px-4",
              error && "border-error focus:border-error focus:ring-error/30",
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-2 text-label-md text-error">{error}</p>}
      </div>
    );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  ref?: React.Ref<HTMLSelectElement>;
}

export function Select({ className, label, error, id, children, ref, ...props }: SelectProps) {
  const selectId = id || props.name;
  return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="mb-2 block text-label-md text-on-surface-variant">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "h-14 w-full rounded-lg bg-surface-container-lowest px-4 text-body-lg text-on-surface",
            "border border-outline-variant",
            "transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30",
            error && "border-error",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-2 text-label-md text-error">{error}</p>}
      </div>
    );
}
