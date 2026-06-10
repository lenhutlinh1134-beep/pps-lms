"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const TICK_SECONDS = 30;

/**
 * Đếm thời gian học sinh mở bài giảng: mỗi 30 giây gửi 1 nhịp lên server
 * (RPC track_lecture_watch). Chỉ đếm khi tab đang hiển thị — chuyển tab
 * hoặc thu nhỏ trình duyệt thì không tính. Không render gì.
 */
export function WatchTracker({ lectureId }: { lectureId: string }) {
  useEffect(() => {
    if (lectureId.startsWith("demo-")) return; // chế độ xem thử: không ghi
    const supabase = createClient();
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      supabase
        .rpc("track_lecture_watch", { p_lecture_id: lectureId, p_seconds: TICK_SECONDS })
        .then(undefined, () => { /* noop — mất mạng thì bỏ nhịp này */ });
    }, TICK_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [lectureId]);

  return null;
}
