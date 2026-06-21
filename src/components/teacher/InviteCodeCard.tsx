"use client";

import { useState } from "react";
import { Copy, RefreshCw, Check, QrCode, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function InviteCodeCard({
  classId,
  initialCode,
}: {
  classId: string;
  initialCode: string | null;
}) {
  const [code, setCode] = useState(initialCode ?? "——");
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = `${baseUrl}/join/${code}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}&color=6b38d4&bgcolor=ffffff`;

  async function copyLink() {
    await navigator.clipboard.writeText(joinUrl);
    setCopied("link");
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied("code");
    setTimeout(() => setCopied(null), 2000);
  }

  async function regenerate() {
    setRegenerating(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("regenerate_invite_code", {
        p_class_id: classId,
      });
      if (!error && data) setCode(data as string);
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <Card className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <h3 className="text-headline-sm">Mời học sinh vào lớp</h3>
        <button
          onClick={() => setShowQR((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant hover:bg-primary-fixed hover:text-on-primary-fixed"
        >
          <QrCode size={16} />
          {showQR ? "Ẩn QR" : "Xem QR"}
        </button>
      </div>

      {/* Mã lớp lớn */}
      <div className="flex items-center gap-md">
        <div className="flex flex-1 items-center justify-center rounded-xl bg-primary-fixed py-4">
          <span className="font-display text-display-md font-bold tracking-widest text-on-primary-fixed">
            {code}
          </span>
        </div>
        <div className="flex flex-col gap-sm">
          <button
            onClick={copyCode}
            title="Copy mã"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-primary-fixed hover:text-on-primary-fixed"
          >
            {copied === "code" ? <Check size={18} className="text-tertiary" /> : <Copy size={18} />}
          </button>
          <button
            onClick={regenerate}
            disabled={regenerating}
            title="Đổi mã mới"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-error-container hover:text-on-error-container disabled:opacity-50"
          >
            <RefreshCw size={18} className={regenerating ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* QR Code */}
      {showQR && (
        <div className="flex flex-col items-center gap-sm rounded-xl bg-surface-container-lowest p-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt={`QR code lớp ${code}`} width={200} height={200} className="rounded-lg" />
          <p className="text-label-sm text-on-surface-variant">Học sinh quét QR để vào lớp</p>
        </div>
      )}

      {/* Link chia sẻ */}
      <div className="flex items-center gap-sm rounded-lg bg-surface-container-lowest px-md py-sm">
        <Link2 size={16} className="shrink-0 text-on-surface-variant" />
        <p className="min-w-0 flex-1 truncate text-label-md text-on-surface-variant">{joinUrl}</p>
        <button
          onClick={copyLink}
          className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-label-md font-semibold text-on-primary hover:opacity-90"
        >
          {copied === "link" ? <><Check size={14} className="inline" /> Đã copy</> : "Copy link"}
        </button>
      </div>

      <p className="text-label-sm text-on-surface-variant">
        Học sinh dùng mã <strong>{code}</strong> hoặc click link trên để vào lớp. Đổi mã nếu không muốn thêm người mới.
      </p>
    </Card>
  );
}
