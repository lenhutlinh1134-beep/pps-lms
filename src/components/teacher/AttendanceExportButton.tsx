"use client";

import { Download } from "lucide-react";

interface ClassAtt {
  class_name: string;
  student_count: number;
  session_count: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  total_records: number;
}

export function AttendanceExportButton({ data }: { data: ClassAtt[] }) {
  function download() {
    const rows = [
      ["Lớp", "Sĩ số", "Số buổi", "Hiện diện", "Vắng", "Đi trễ", "Tỉ lệ đi học (%)"],
      ...data.map((c) => {
        const rate = c.total_records > 0 ? Math.round((c.present_count / c.total_records) * 100) : 0;
        return [c.class_name, c.student_count, c.session_count, c.present_count, c.absent_count, c.late_count, rate];
      }),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diem-danh-${new Date().toISOString().slice(0, 10)}.csv`;
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
