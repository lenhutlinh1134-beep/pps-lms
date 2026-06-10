"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Học sinh đánh dấu đã học xong bài giảng (ghi lecture_views + student_logs). */
export function MarkWatched({ lectureId }: { lectureId: string }) {
  const [watched, setWatched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setReady(true); return; }
        const { data } = await supabase
          .from("lecture_views").select("completed")
          .eq("lecture_id", lectureId).eq("student_id", user.id).maybeSingle();
        setWatched(!!data?.completed);
      } catch { /* noop */ } finally { setReady(true); }
    })();
  }, [lectureId]);

  async function toggle() {
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (watched) {
        // Bỏ đánh dấu nhưng GIỮ thời gian xem đã tích luỹ (không delete)
        await supabase.from("lecture_views")
          .update({ completed: false })
          .eq("lecture_id", lectureId).eq("student_id", user.id);
        setWatched(false);
      } else {
        await supabase.from("lecture_views").upsert(
          { lecture_id: lectureId, student_id: user.id, completed: true },
          { onConflict: "lecture_id,student_id" },
        );
        await supabase.from("student_logs").insert({ student_id: user.id, type: "lecture" });
        setWatched(true);
      }
    } catch { /* noop */ } finally { setBusy(false); }
  }

  if (!ready) return null;

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-5 py-3 text-body-md font-bold transition-colors disabled:opacity-60",
        watched
          ? "bg-tertiary text-on-tertiary"
          : "border border-primary bg-primary-fixed text-primary hover:bg-primary hover:text-on-primary",
      )}
    >
      {watched ? <CheckCircle2 size={20} /> : <Circle size={20} />}
      {watched ? "Đã học xong" : "Đánh dấu đã học"}
    </button>
  );
}
