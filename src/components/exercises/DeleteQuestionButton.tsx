"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function DeleteQuestionButton({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.from("question_bank").delete().eq("id", questionId);
      router.refresh();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => setConfirming(false)}
          className="rounded px-2 py-1 text-label-sm text-on-surface-variant hover:underline"
        >
          Huỷ
        </button>
        <button
          onClick={handleDelete}
          disabled={busy}
          className="rounded bg-error px-2 py-1 text-label-sm font-semibold text-on-error disabled:opacity-60"
        >
          {busy ? "..." : "Xoá"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="shrink-0 rounded p-1 text-outline transition-colors hover:text-error"
      title="Xoá câu hỏi"
    >
      <Trash2 size={16} />
    </button>
  );
}
