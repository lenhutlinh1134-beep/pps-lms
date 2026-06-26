"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function StudentOnboarding({ userName }: { userName: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("join_class_by_invite_code", {
        p_code: code.trim().toUpperCase(),
      });

      if (rpcError) {
        setError(rpcError.message);
        setLoading(false);
        return;
      }

      // Success, reload the layout to show the dashboard
      router.refresh();
    } catch {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
      setLoading(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-base md:flex-row">
      {/* Cột trái: Form nhập mã */}
      <div className="flex w-full flex-col justify-center px-lg py-2xl md:w-[45%] md:px-3xl">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-display-sm">Chào mừng, {userName}! 🎉</h1>
          <p className="mt-sm text-body-lg text-on-surface-variant">
            Bạn cần tham gia ít nhất một lớp học để vào được bảng điều khiển.
          </p>

          <form onSubmit={handleJoin} className="mt-xl space-y-md">
            {error && (
              <div className="rounded-xl border border-error-container bg-error-container/20 p-md text-body-md text-error">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-body-sm font-semibold text-on-surface">Mã lớp học (Invite Code)</label>
              <Input
                placeholder="VD: ABCD12"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
              />
              <p className="text-body-xs text-on-surface-variant">
                Hãy hỏi giáo viên để nhận mã gồm 6 ký tự này.
              </p>
            </div>

            <Button type="submit" disabled={loading || !code.trim()} className="w-full">
              {loading ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" /> Đang tham gia...
                </>
              ) : (
                <>Tham gia lớp học <ArrowRight size={18} className="ml-2" /></>
              )}
            </Button>
          </form>

          <button
            onClick={handleLogout}
            className="mt-xl flex w-full items-center justify-center gap-xs rounded-xl py-3 text-body-md font-semibold text-on-surface-variant transition hover:bg-surface-container-high"
          >
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </div>

      {/* Cột phải: Hình ảnh minh họa */}
      <div className="hidden w-full items-center justify-center bg-primary-fixed p-3xl md:flex md:w-[55%]">
        <Card padding="2xl" className="w-full max-w-lg bg-surface text-center shadow-xl">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-primary-container text-primary">
            <span className="text-[48px]">🚀</span>
          </div>
          <h2 className="mt-xl text-headline-lg text-on-surface">Bắt đầu hành trình</h2>
          <p className="mt-sm text-body-lg text-on-surface-variant">
            Nền tảng PPS LMS giúp bạn học tiếng Anh hiệu quả hơn thông qua việc luyện nghe, làm bài tập và xem video bài giảng.
          </p>
        </Card>
      </div>
    </div>
  );
}
