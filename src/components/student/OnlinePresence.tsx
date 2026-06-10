"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** Gửi heartbeat cập nhật last_seen mỗi 3 phút để GV biết HS đang online. */
export function OnlinePresence() {
  useEffect(() => {
    const supabase = createClient();

    async function ping() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", user.id);
    }

    ping();
    const id = setInterval(ping, 3 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return null;
}
