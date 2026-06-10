"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

/** Nút Sửa / Xoá bài giảng cho giáo viên (có xác nhận trước khi xoá). */
export function LectureActions({ lectureId }: { lectureId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (lectureId.startsWith("demo-")) return null; // demo: không cho sửa/xoá

  async function remove() {
    setDeleting(true);
    try {
      const supabase = createClient();
      await supabase.from("lectures").delete().eq("id", lectureId);
      router.replace("/teacher/lectures");
      router.refresh();
    } catch {
      setDeleting(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-sm rounded-lg bg-error-container px-4 py-3">
        <span className="text-body-md text-on-error-container">Xoá bài giảng này? Không thể hoàn tác.</span>
        <div className="ml-auto flex gap-sm">
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Huỷ</Button>
          <Button size="sm" variant="secondary" loading={deleting} onClick={remove}>Xoá hẳn</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-sm">
      <Link href={`/teacher/lectures/${lectureId}/edit`}>
        <Button size="sm" variant="ghost"><Pencil size={16} /> Sửa</Button>
      </Link>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}
        className="border-error/40 text-error hover:bg-error-container">
        <Trash2 size={16} /> Xoá
      </Button>
    </div>
  );
}
