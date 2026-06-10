import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-margin-mobile py-xl">
      {/* Khối nền trang trí dạng glassmorphism */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-lg flex items-center justify-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-premium text-white">
            <GraduationCap size={24} />
          </span>
          <span className="font-display text-headline-md text-on-surface">PPS LMS</span>
        </Link>
        {children}
      </div>
    </main>
  );
}
