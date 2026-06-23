"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type SyncState = "idle" | "loading" | "success" | "error";

interface SyncResult {
  synced?: number;
  skipped?: number;
  msg?: string;
  error?: string;
}

export function SyncQlhsButton() {
  const [state, setState] = useState<SyncState>("idle");
  const [result, setResult] = useState<SyncResult | null>(null);

  async function handleSync() {
    setState("loading");
    setResult(null);
    try {
      const res = await fetch("/api/sync-qlhs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysBack: 30 }),
      });
      const data: SyncResult = await res.json();
      if (!res.ok || data.error) {
        setResult(data);
        setState("error");
      } else {
        setResult(data);
        setState("success");
        setTimeout(() => setState("idle"), 5000);
      }
    } catch {
      setResult({ error: "Lỗi kết nối server" });
      setState("error");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSync}
        disabled={state === "loading"}
        className={cn(
          "flex items-center gap-2 rounded-xl px-4 py-2 text-label-md font-semibold transition-all",
          state === "loading" && "cursor-not-allowed opacity-60 bg-surface-container text-on-surface-variant",
          state === "success" && "bg-tertiary-fixed text-on-tertiary-fixed",
          state === "error"   && "bg-error-container text-on-error-container",
          state === "idle"    && "bg-primary text-on-primary hover:opacity-90 active:scale-95",
        )}
      >
        {state === "loading" && <RefreshCw size={15} className="animate-spin" />}
        {state === "success" && <CheckCircle size={15} />}
        {state === "error"   && <XCircle size={15} />}
        {state === "idle"    && <RefreshCw size={15} />}

        {state === "loading" ? "Đang đồng bộ..." :
         state === "success" ? "Đồng bộ thành công" :
         state === "error"   ? "Sync thất bại" :
         "Đồng bộ QLHS"}
      </button>

      {result && state !== "loading" && (
        <p className="text-label-sm text-on-surface-variant">
          {state === "success"
            ? `✅ Ghi mới: ${result.synced ?? 0} · Bỏ qua: ${result.skipped ?? 0}${result.msg ? ` · ${result.msg}` : ""}`
            : `❌ ${result.error ?? result.msg ?? "Lỗi không xác định"}`}
        </p>
      )}
    </div>
  );
}
