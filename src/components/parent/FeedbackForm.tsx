"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface ClassOption {
  id: string;
  name: string;
  student_name: string;
  student_id: string;
}

interface Props {
  students: { student_id: string; full_name: string }[];
  classes: ClassOption[];
}

export function FeedbackForm({ classes }: Props) {
  const [selectedClassId, setSelectedClassId] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!selectedClassId) {
      setErrorMsg("Vui lòng chọn lớp học.");
      return;
    }
    if (content.trim().length < 10) {
      setErrorMsg("Nội dung phải có ít nhất 10 ký tự.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/parent/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: selectedClassId,
          student_id: selectedClass?.student_id ?? "",
          content: content.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error ?? "Gửi phản hồi thất bại. Vui lòng thử lại.");
      } else {
        setSuccessMsg("Đã gửi phản hồi thành công!");
        setSelectedClassId("");
        setContent("");
      }
    } catch {
      setErrorMsg("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-md">
        <h2 className="text-headline-sm">Gửi phản hồi mới</h2>

        {/* Success banner */}
        {successMsg && (
          <div className="rounded-lg bg-tertiary-fixed px-4 py-3 text-body-md font-medium text-on-tertiary-fixed">
            {successMsg}
          </div>
        )}

        {/* Error banner */}
        {errorMsg && (
          <div className="rounded-lg bg-error-container px-4 py-3 text-body-md font-medium text-on-error-container">
            {errorMsg}
          </div>
        )}

        {/* Class select */}
        <div className="flex flex-col gap-xs">
          <label htmlFor="fb-class" className="text-label-md font-medium">
            Chọn lớp học
          </label>
          {classes.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">
              Con bạn chưa tham gia lớp học nào.
            </p>
          ) : (
            <select
              id="fb-class"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="h-14 w-full rounded-lg border border-outline-variant bg-surface-container px-4 text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            >
              <option value="">-- Chọn lớp --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.student_name})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Content textarea */}
        <div className="flex flex-col gap-xs">
          <label htmlFor="fb-content" className="text-label-md font-medium">
            Nội dung phản hồi
          </label>
          <textarea
            id="fb-content"
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nhập nhận xét hoặc câu hỏi cho giáo viên... (tối thiểu 10 ký tự)"
            disabled={loading}
            className="w-full rounded-lg border border-outline-variant bg-surface-container px-4 py-3 text-body-md placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          <span className="text-right text-label-sm text-on-surface-variant">
            {content.length} ký tự{content.length < 10 && content.length > 0 ? ` (cần thêm ${10 - content.length})` : ""}
          </span>
        </div>

        <Button
          type="submit"
          loading={loading}
          disabled={classes.length === 0}
          className="self-end"
        >
          Gửi phản hồi
        </Button>
      </form>
    </Card>
  );
}
