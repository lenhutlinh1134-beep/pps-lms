"use client";

import { useState } from "react";
import { Users, Upload, RefreshCw, Download, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface ImportRow {
  fullName: string;
  username: string;
}

interface ImportResult {
  fullName: string;
  username: string;
  password?: string;
  status: "success" | "error";
  message?: string;
}

export function BulkImportStudents({ classId, onDone }: { classId: string; onDone: () => void }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ImportRow[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse text whenever it changes
  function handleTextChange(val: string) {
    setText(val);
    if (!val.trim()) {
      setParsed([]);
      return;
    }

    const rows = val.split("\n").map(r => r.trim()).filter(Boolean);
    const newParsed: ImportRow[] = [];

    for (const row of rows) {
      // Split by tab or comma
      const cols = row.split(/[\t,]/).map(c => c.trim()).filter(Boolean);
      if (cols.length >= 2) {
        newParsed.push({ fullName: cols[0], username: cols[1].toLowerCase().replace(/\s+/g, "") });
      }
    }
    setParsed(newParsed);
  }

  async function handleImport() {
    if (parsed.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/teacher/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, students: parsed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Có lỗi xảy ra khi nhập danh sách");
      }

      setResults(data.results);
      onDone(); // refresh the student list outside
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (results.length === 0) return;
    let csv = "Họ và tên,Tên đăng nhập,Mật khẩu,Trạng thái\n";
    for (const r of results) {
      csv += `"${r.fullName}","${r.username}","${r.password || ""}","${r.status === "success" ? "Thành công" : r.message}"\n`;
    }
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "danh_sach_tai_khoan.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="flex flex-col gap-md">
      <div className="flex items-center gap-2">
        <Users className="text-primary" size={24} />
        <h3 className="text-title-lg">Tạo tài khoản hàng loạt</h3>
      </div>
      <p className="text-body-md text-on-surface-variant">
        Copy danh sách từ Excel (2 cột: <strong>Họ tên</strong> và <strong>Tên đăng nhập</strong>) rồi dán vào ô bên dưới. 
        Mật khẩu sẽ được hệ thống tạo ngẫu nhiên.
      </p>

      {results.length === 0 ? (
        <>
          <textarea
            className="h-32 w-full resize-y rounded-xl border border-outline bg-surface p-sm text-body-md text-on-surface focus:border-primary focus:outline-none"
            placeholder="Nguyễn Văn A    nva01&#10;Trần Thị B    ttb02"
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
          />

          {parsed.length > 0 && (
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-sm">
              <p className="mb-2 text-label-md font-semibold">Sẽ nhập {parsed.length} học sinh:</p>
              <div className="max-h-40 overflow-y-auto text-body-sm text-on-surface-variant">
                {parsed.map((p, i) => (
                  <div key={i} className="flex gap-4 border-b border-outline-variant/50 py-1 last:border-0">
                    <span className="w-1/2 font-medium">{p.fullName}</span>
                    <span className="w-1/2">{p.username}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-body-sm text-error">{error}</p>}

          <Button 
            onClick={handleImport} 
            disabled={parsed.length === 0 || loading}
            loading={loading}
            className="w-full sm:w-auto"
          >
            <Upload size={18} /> Bắt đầu tạo tài khoản
          </Button>
        </>
      ) : (
        <div className="flex flex-col gap-sm">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-label-md font-semibold">Kết quả tạo tài khoản:</p>
              <Button size="sm" variant="secondary" onClick={handleDownload}>
                <Download size={16} /> Tải file CSV
              </Button>
            </div>
            <div className="max-h-60 overflow-y-auto text-body-sm text-on-surface-variant">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-surface-container-lowest pb-2 text-label-sm font-semibold">
                  <tr>
                    <th className="py-1">Họ tên</th>
                    <th className="py-1">Tên đăng nhập</th>
                    <th className="py-1">Mật khẩu</th>
                    <th className="py-1">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-b border-outline-variant/50 last:border-0">
                      <td className="py-1 font-medium">{r.fullName}</td>
                      <td className="py-1 text-primary">{r.username}</td>
                      <td className="py-1">{r.password || "-"}</td>
                      <td className="py-1">
                        {r.status === "success" ? (
                          <span className="flex items-center gap-1 text-tertiary"><CheckCircle2 size={14} /> OK</span>
                        ) : (
                          <span className="flex items-center gap-1 text-error"><XCircle size={14} /> {r.message}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <Button variant="secondary" onClick={() => { setResults([]); setText(""); setParsed([]); }}>
            <RefreshCw size={18} /> Nhập danh sách khác
          </Button>
        </div>
      )}
    </Card>
  );
}
