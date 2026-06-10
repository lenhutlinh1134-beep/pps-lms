import Link from "next/link";
import { FlaskConical } from "lucide-react";

export const metadata = { title: "Test Drive — PPS LMS" };

export default function TestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-wrap items-center justify-center gap-2 bg-premium px-4 py-2 text-center text-label-md text-white">
        <FlaskConical size={14} />
        Chế độ Test Drive — dữ liệu giả, không cần đăng nhập.
        <Link href="/login" className="underline underline-offset-2">Đăng nhập thật →</Link>
      </div>
      {children}
    </div>
  );
}
