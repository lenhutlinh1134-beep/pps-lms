"use client";

import { useState } from "react";
import { MessageSquare, Save, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  assignmentId: string;
  studentId: string;
  initialFeedback: string | null;
}

export function SubmissionFeedbackForm({ assignmentId, studentId, initialFeedback }: Props) {
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const supabase = createClient();
      await supabase
        .from("submissions")
        .update({ feedback })
        .eq("assignment_id", assignmentId)
        .eq("student_id", studentId);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-sm border-t border-outline-variant pt-sm">
      <div className="mb-1 flex items-center gap-1">
        <MessageSquare size={13} className="text-on-surface-variant" />
        <p className="text-label-sm text-on-surface-variant">Nhận xét của giáo viên</p>
        {saved && (
          <span className="flex items-center gap-0.5 text-label-xs text-tertiary">
            <CheckCircle size={11} /> Đã lưu
          </span>
        )}
      </div>
      <textarea
        value={feedback}
        onChange={(e) => { setFeedback(e.target.value); setSaved(false); }}
        placeholder="Nhập nhận xét cho bài nộp này..."
        className="w-full resize-none rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-body-sm focus:border-primary focus:outline-none"
        rows={2}
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-1 flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-label-sm font-medium text-on-primary disabled:opacity-60"
      >
        <Save size={13} />
        {saving ? "Đang lưu..." : "Lưu nhận xét"}
      </button>
    </div>
  );
}
