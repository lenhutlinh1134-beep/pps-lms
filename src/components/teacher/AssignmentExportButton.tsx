"use client";

import { Download } from "lucide-react";

interface AssRow {
  title: string;
  class_name: string;
  created_at: string;
  total_students: number;
  submitted: number;
  avg_score: number | null;
  pass_count: number;
}

export function AssignmentExportButton({ data }: { data: AssRow[] }) {
  function download() {
    const rows = [
      ["Tên bài tập", "Lớp", "Ngày giao", "Sĩ số", "Đã nộp", "Tỉ lệ nộp (%)", "Điểm TB", "Đạt ≥5 (%)"],
      ...data.map((a) => {
        const submitRate = a.total_students > 0 ? Math.round((a.submitted / a.total_students) * 100) : 0;
        const passRate = a.submitted > 0 ? Math.round((a.pass_count / a.submitted) * 100) : 0;
        const date = new Date(a.created_at).toLocaleDateString("vi-VN");
        return [a.title, a.class_name, date, a.total_students, a.submitted, submitRate, a.avg_score ?? "—", passRate];
      }),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ket-qua-bai-tap-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      className="flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-4 py-2 text-label-md font-medium text-on-surface-variant hover:border-primary hover:text-primary"
    >
      <Download size={15} /> Xuất CSV
    </button>
  );
}
