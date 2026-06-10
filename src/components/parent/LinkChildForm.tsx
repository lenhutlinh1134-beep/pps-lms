"use client";

import { useState } from "react";
import { Mail, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export function LinkChildForm({ onLinked }: { onLinked?: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!email.trim()) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("link_child_by_email", { p_email: email.trim() });
      if (error) { setMsg({ type: "err", text: error.message }); return; }
      const name = (data as { full_name: string }[] | null)?.[0]?.full_name ?? "Học sinh";
      setMsg({ type: "ok", text: `Đã liên kết với ${name} thành công!` });
      setEmail("");
      onLinked?.();
    } catch {
      setMsg({ type: "err", text: "Không kết nối được máy chủ." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex flex-col gap-sm">
      <h3 className="text-headline-sm">Liên kết với con</h3>
      <p className="text-body-md text-on-surface-variant">
        Nhập email tài khoản học sinh của con để bắt đầu theo dõi tiến trình học tập.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-sm sm:flex-row">
        <Input
          name="email" type="email" placeholder="email-hoc-sinh@email.com"
          leadingIcon={<Mail size={20} />}
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" loading={loading} className="sm:w-auto">
          <UserPlus size={18} /> Liên kết
        </Button>
      </form>
      {msg && (
        <p className={cn("rounded-md px-4 py-2 text-body-md",
          msg.type === "ok"
            ? "bg-tertiary-fixed text-on-tertiary-fixed"
            : "bg-error-container text-on-error-container")}>
          {msg.text}
        </p>
      )}
    </Card>
  );
}
