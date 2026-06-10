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

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    schoolId: "",
    classId: "",
  });
  const [schools, setSchools] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Tải danh sách trường khi mở trang
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.from("schools").select("id, name").order("name");
        setSchools(data ?? []);
      } catch {
        /* chưa cấu hình Supabase — để trống (empty state) */
      }
    })();
  }, []);

  // Tải lớp theo trường đã chọn
  useEffect(() => {
    if (!form.schoolId) {
      setClasses([]);
      return;
    }
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("classes")
          .select("id, name")
          .eq("school_id", form.schoolId)
          .order("name");
        setClasses(data ?? []);
      } catch {
        setClasses([]);
      }
    })();
  }, [form.schoolId]);

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
        options: { data: { full_name: form.fullName, role: "student" } },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Nếu có session ngay (không bật xác nhận email) -> tự ghi danh vào lớp
      if (data.session && form.classId && data.user) {
        await supabase.from("class_students").insert({
          class_id: form.classId,
          student_id: data.user.id,
        });
        router.replace("/student");
        router.refresh();
        return;
      }
      setDone(true);
    } catch {
      setError("Không kết nối được máy chủ. Kiểm tra cấu hình Supabase (xem SETUP.md).");
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
          Chúng tôi đã gửi link xác nhận tới <b>{form.email}</b>. Xác nhận xong, hãy đăng nhập để vào lớp.
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
        <h1 className="text-headline-md">Đăng ký học sinh</h1>
        <p className="mt-xs text-body-md text-on-surface-variant">
          Điền thông tin để bắt đầu hành trình học tiếng Anh
        </p>
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-md">
        <Input
          label="Họ và tên"
          name="fullName"
          required
          placeholder="Nguyễn Minh Anh"
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

        <Select
          label="Chọn trường"
          name="schoolId"
          value={form.schoolId}
          onChange={(e) => set("schoolId", e.target.value)}
        >
          <option value="">— Chọn trường —</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>

        <Select
          label="Chọn lớp"
          name="classId"
          value={form.classId}
          onChange={(e) => set("classId", e.target.value)}
          disabled={!form.schoolId}
        >
          <option value="">{form.schoolId ? "— Chọn lớp —" : "Hãy chọn trường trước"}</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        {schools.length === 0 && (
          <p className="rounded-md bg-surface-container px-4 py-3 text-label-md text-on-surface-variant">
            Chưa có trường/lớp nào — danh sách do giáo viên tạo trước. (Hoặc bạn chưa cấu hình Supabase, xem SETUP.md.)
          </p>
        )}

        {error && (
          <p className="rounded-md bg-error-container px-4 py-3 text-body-md text-on-error-container">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth loading={loading}>
          Tạo tài khoản
        </Button>
      </form>

      <p className="text-center text-body-md text-on-surface-variant">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Đăng nhập
        </Link>
      </p>
    </Card>
  );
}
