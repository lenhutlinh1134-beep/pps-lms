"use client";

import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { DEMO_COOKIE, DEMO_ROLES, type DemoRole } from "@/lib/demo";

/**
 * CỬA SAU XEM THỬ (TẠM): vào thẳng dashboard theo vai trò, không cần đăng nhập.
 * Chỉ hiển thị ở dev (xem cờ demoEnabled nơi gọi).
 */
export function DemoEntry() {
  const router = useRouter();

  function enter(role: DemoRole) {
    document.cookie = `${DEMO_COOKIE}=${role}; path=/; max-age=86400; samesite=lax`;
    router.push(`/${role}`);
    router.refresh();
  }

  return (
    <div className="mt-md rounded-lg border border-dashed border-secondary/50 bg-secondary-fixed/40 p-md">
      <p className="mb-sm flex items-center gap-2 text-label-md font-semibold text-on-secondary-fixed">
        <FlaskConical size={16} /> Xem thử nhanh (chế độ dev — không cần đăng nhập)
      </p>
      <div className="grid grid-cols-2 gap-sm sm:grid-cols-4">
        {DEMO_ROLES.map((r) => (
          <button
            key={r.role}
            onClick={() => enter(r.role)}
            className="flex flex-col items-center gap-1 rounded-md bg-surface-container-lowest px-2 py-3 text-label-md font-semibold text-on-surface shadow-card transition-transform hover:-translate-y-0.5 hover:text-secondary"
          >
            <span className="text-xl">{r.emoji}</span>
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
