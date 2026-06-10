import Link from "next/link";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-wrap items-center justify-center gap-2 bg-premium px-4 py-2 text-center text-label-md text-white">
        🔎 Bản xem thử (demo) — không cần đăng nhập.
        <Link href="/" className="underline underline-offset-2">Về trang chủ</Link>
      </div>
      {children}
    </div>
  );
}
