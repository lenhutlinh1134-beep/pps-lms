"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, ArrowLeft, GraduationCap, Briefcase } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { demoEnabled } from "@/lib/demo";
import { DemoEntry } from "@/components/DemoEntry";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type LoginType = "student" | "adult" | null;

export default function LoginPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<LoginType>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();
      const nextUrl = new URLSearchParams(window.location.search).get("next");
      const dest = nextUrl && nextUrl.startsWith("/") ? nextUrl : `/${profile?.role ?? "student"}`;
      router.replace(dest);
    });
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let finalEmail = identifier;
      if (loginType === "student" && !identifier.includes("@")) {
        finalEmail = `${identifier.trim()}@pps-lms.local`;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: finalEmail, password });
      
      if (signInError) {
        setError("Thông tin đăng nhập chưa đúng. Vui lòng thử lại.");
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user?.id)
        .single();
        
      const nextUrl = new URLSearchParams(window.location.search).get("next");
      const dest = nextUrl && nextUrl.startsWith("/") ? nextUrl : `/${profile?.role ?? "student"}`;
      router.replace(dest);
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ.");
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const nextParam = new URLSearchParams(window.location.search).get("next");
      const callbackUrl = nextParam
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextParam)}`
        : `${window.location.origin}/auth/callback`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl },
      });
      if (oauthError) {
        setError(`Lỗi Google: ${oauthError.message}`);
        setLoading(false);
      }
    } catch (err) {
      setError(`Không kết nối được: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  }

  return (
    <Card className="flex flex-col gap-md">
      <div className="text-center">
        <h1 className="text-headline-md">Chào mừng trở lại 👋</h1>
        <p className="mt-xs text-body-md text-on-surface-variant">Đăng nhập để tiếp tục học</p>
      </div>

      {loginType === null ? (
        <div className="flex flex-col gap-md py-4">
          <button
            onClick={() => { setLoginType("student"); setError(null); }}
            className="flex flex-col items-center gap-sm rounded-2xl border-2 border-primary/20 bg-primary-container/30 p-xl transition hover:border-primary hover:bg-primary-container"
          >
            <GraduationCap size={48} className="text-primary" />
            <span className="text-headline-sm text-primary">Dành cho Học sinh</span>
          </button>

          <button
            onClick={() => { setLoginType("adult"); setError(null); }}
            className="flex flex-col items-center gap-sm rounded-2xl border-2 border-secondary/20 bg-secondary-container/30 p-xl transition hover:border-secondary hover:bg-secondary-container"
          >
            <Briefcase size={48} className="text-secondary" />
            <span className="text-headline-sm text-secondary">Phụ huynh / Giáo viên / Quản lý</span>
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => setLoginType(null)}
            className="mb-2 flex w-fit items-center gap-2 text-label-md text-on-surface-variant hover:text-primary"
          >
            <ArrowLeft size={16} /> Quay lại
          </button>

          {loginType === "adult" && (
            <>
              <Button variant="ghost" fullWidth onClick={handleGoogle} type="button">
                <GoogleIcon /> Đăng nhập bằng Google
              </Button>

              <div className="flex items-center gap-sm text-label-md text-outline">
                <span className="h-px flex-1 bg-outline-variant" /> hoặc <span className="h-px flex-1 bg-outline-variant" />
              </div>
            </>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-md">
            {loginType === "student" ? (
              <Input
                label="Tên đăng nhập"
                name="username"
                type="text"
                required
                placeholder="VD: hocsinh01"
                leadingIcon={<User size={20} />}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            ) : (
              <Input
                label="Email"
                name="email"
                type="email"
                required
                placeholder="ban@email.com"
                leadingIcon={<Mail size={20} />}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            )}
            
            <Input
              label="Mật khẩu"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              leadingIcon={<Lock size={20} />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <p className="rounded-md bg-error-container px-4 py-3 text-body-md text-on-error-container">
                {error}
              </p>
            )}

            <Button type="submit" fullWidth loading={loading}>
              Đăng nhập
            </Button>
          </form>

          <div className="flex flex-col gap-xs text-center text-body-md text-on-surface-variant">
            {loginType === "student" ? (
              <p>
                Chưa có tài khoản?{" "}
                <Link href="/register" className="font-semibold text-primary hover:underline">
                  Đăng ký học sinh
                </Link>
              </p>
            ) : (
              <p>
                Là giáo viên?{" "}
                <Link href="/register-teacher" className="font-semibold text-secondary hover:underline">
                  Đăng ký giáo viên
                </Link>
              </p>
            )}
          </div>
        </>
      )}

      {demoEnabled && <DemoEntry />}
    </Card>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
