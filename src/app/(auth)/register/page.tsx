"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";

interface Option {
  id: string;
  name: string;
}

type Role = "student" | "parent";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("student");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.fullName, role } },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session && data.user) {
        router.replace(`/${role}`);
        router.refresh();
        return;
      }
      setDone(true);
    } catch {
      setError("Không kết nối được máy chủ.");
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
          Đã gửi link xác nhận tới <b>{form.email}</b>. Xác nhận xong thì đăng nhập.
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
        <h1 className="text-headline-md">Tạo tài khoản</h1>
        <p className="mt-xs text-body-md text-on-surface-variant">
          Bắt đầu hành trình học tiếng Anh cùng PPS
        </p>
      </div>

      {/* Chọn vai trò */}
      <div className="grid grid-cols-2 gap-sm">
        {(["student", "parent"] as Role[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`rounded-xl border-2 p-4 text-center transition-all ${
              role === r
                ? "border-primary bg-primary-container text-on-primary-container"
                : "border-outline-variant bg-surface text-on-surface-variant hover:border-primary/50"
            }`}
          >
            <div className="text-2xl mb-1">{r === "student" ? "🎓" : "👨‍👩‍👧"}</div>
            <div className="text-label-lg font-semibold">
              {r === "student" ? "Học sinh" : "Phụ huynh"}
            </div>
          </button>
        ))}
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-md">
        <Input
          label="Họ và tên"
          name="fullName"
          required
          placeholder={role === "student" ? "Nguyễn Minh Anh" : "Nguyễn Văn A"}
          leadingIcon={<User size={20} />}
          value={form.fullName}
          onChange={(e) => set("fullName", e.target.value)}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          required
          placeholder="ban@email.com"
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

        {role === "parent" && (
          <p className="rounded-xl bg-primary-container px-4 py-3 text-body-md text-on-primary-container">
            👋 Sau khi đăng ký, vào trang phụ huynh để liên kết với tài khoản con.
          </p>
        )}

        {error && (
          <p className="rounded-md bg-error-container px-4 py-3 text-body-md text-on-error-container">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth loading={loading}>
          Tạo tài khoản {role === "student" ? "học sinh" : "phụ huynh"}
        </Button>
      </form>

      <div className="flex flex-col gap-xs text-center text-body-md text-on-surface-variant">
        <p>
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
        <p>
          Là giáo viên?{" "}
          <Link href="/register-teacher" className="font-semibold text-secondary hover:underline">
            Đăng ký giáo viên
          </Link>
        </p>
      </div>
    </Card>
  );
}
