"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function RegisterTeacherPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", inviteCode: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Kiểm tra invite code phía client (bảo vệ sơ bộ — server sẽ kiểm tra lại khi ghi DB)
    const res = await fetch("/api/verify-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: form.inviteCode }),
    });
    if (!res.ok) {
      setError("Mã mời không đúng. Liên hệ quản trị viên PPS để được cấp mã.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.fullName, role: "teacher" } },
      });
      if (signUpError) { setError(signUpError.message); return; }
      if (data.session) {
        router.replace("/teacher");
        router.refresh();
        return;
      }
      setDone(true);
    } catch {
      setError("Không kết nối được máy chủ. Thử lại.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Card className="text-center">
        <div className="mx-auto mb-md flex h-14 w-14 items-center justify-center rounded-full bg-tertiary-fixed text-2xl">
          ✉️
        </div>
        <h1 className="text-headline-md">Kiểm tra email của bạn</h1>
        <p className="mt-sm text-body-md text-on-surface-variant">
          Chúng tôi đã gửi link xác nhận tới <b>{form.email}</b>.
          Xác nhận xong, đăng nhập để vào trang giáo viên.
        </p>
        <Link href="/login" className="mt-lg inline-block">
          <Button variant="primary">Tới trang đăng nhập</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-md">
      <div className="text-center">
        <h1 className="text-headline-md">Đăng ký giáo viên</h1>
        <p className="mt-xs text-body-md text-on-surface-variant">
          Dành riêng cho giáo viên PPS Vietnam
        </p>
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-md">
        <Input
          label="Họ và tên"
          name="fullName"
          required
          placeholder="Nguyễn Thị Lan"
          leadingIcon={<User size={20} />}
          value={form.fullName}
          onChange={(e) => set("fullName", e.target.value)}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          required
          placeholder="giaovien@pps.edu.vn"
          leadingIcon={<Mail size={20} />}
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
        />
        <Input
          label="Mật khẩu"
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="Tối thiểu 6 ký tự"
          leadingIcon={<Lock size={20} />}
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
        />
        <Input
          label="Mã mời giáo viên"
          name="inviteCode"
          required
          placeholder="Liên hệ quản trị để lấy mã"
          leadingIcon={<KeyRound size={20} />}
          value={form.inviteCode}
          onChange={(e) => set("inviteCode", e.target.value)}
        />

        {error && (
          <p className="rounded-md bg-error-container px-4 py-3 text-body-md text-on-error-container">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth loading={loading}>
          Tạo tài khoản giáo viên
        </Button>
      </form>

      <p className="text-center text-body-md text-on-surface-variant">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Đăng nhập
        </Link>
      </p>
      <p className="text-center text-body-md text-on-surface-variant">
        Là học sinh?{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Đăng ký học sinh
        </Link>
      </p>
    </Card>
  );
}
