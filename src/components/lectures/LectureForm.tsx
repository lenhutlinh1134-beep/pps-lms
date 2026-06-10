"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Video, FileText, Link as LinkIcon, Upload, X, CloudUpload, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface ClassOption { id: string; name: string }

export interface EditLecture {
  id: string;
  class_id: string;
  type: "video" | "theory";
  title: string;
  description: string | null;
  content_url: string | null;
}

function safeName(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function LectureForm({ lecture }: { lecture?: EditLecture }) {
  const router = useRouter();
  const isEdit = !!lecture;
  const dropRef = useRef<HTMLDivElement>(null);

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState(lecture?.class_id ?? "");
  const [type, setType] = useState<"video" | "theory">(lecture?.type ?? "video");
  const [title, setTitle] = useState(lecture?.title ?? "");
  const [description, setDescription] = useState(lecture?.description ?? "");
  const [contentUrl, setContentUrl] = useState(lecture?.content_url ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("class_teachers").select("class:classes(id, name)").eq("teacher_id", user.id);
        const rows = (data ?? []) as unknown as Array<{ class: ClassOption | ClassOption[] | null }>;
        const list = rows.flatMap((r) => (Array.isArray(r.class) ? r.class : r.class ? [r.class] : []));
        setClasses(list);
        if (!isEdit && list[0]) setClassId(list[0].id);
      } catch { /* chưa cấu hình Supabase */ }
    })();
  }, [isEdit]);

  // Drag-and-drop handlers
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }
  function handleDragLeave() { setDragging(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) selectFile(dropped);
  }
  function selectFile(f: File) {
    setFile(f);
    setContentUrl("");
    setUploaded(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) { setError("Vui lòng nhập tiêu đề bài giảng."); return; }
    if (!classId) { setError("Bạn chưa có lớp nào. Hãy tạo lớp trước."); return; }

    setLoading(true);
    setUploadPct(0);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Bạn cần đăng nhập."); return; }

      let finalUrl = contentUrl.trim();
      if (file) {
        // Simulate upload progress (Supabase Storage không trả progress event)
        const timer = setInterval(() => setUploadPct((p) => Math.min(p + 12, 88)), 200);
        const path = `lectures/${classId}/${Date.now()}_${safeName(file.name)}`;
        const { error: upErr } = await supabase.storage.from("media").upload(path, file, { upsert: false });
        clearInterval(timer);
        if (upErr) {
          setError("Tải file thất bại: " + upErr.message + " (đã tạo bucket 'media' public chưa? xem SETUP.md)");
          return;
        }
        setUploadPct(100);
        setUploaded(true);
        finalUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      }

      if (isEdit) {
        const { error: updErr } = await supabase.from("lectures").update({
          class_id: classId, title: title.trim(), description: description.trim() || null,
          type, content_url: finalUrl || null,
        }).eq("id", lecture!.id);
        if (updErr) { setError(updErr.message); return; }
        router.replace(`/teacher/lectures/${lecture!.id}`);
      } else {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        const { error: insErr } = await supabase.from("lectures").insert({
          class_id: classId, teacher_id: user.id, teacher_name: profile?.full_name ?? "Giáo viên",
          title: title.trim(), description: description.trim() || null, type, content_url: finalUrl || null,
        });
        if (insErr) { setError(insErr.message); return; }
        router.replace("/teacher/lectures");
      }
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ. Kiểm tra cấu hình Supabase (xem SETUP.md).");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-md">
      <Card className="flex flex-col gap-md">
        {/* Loại bài giảng */}
        <div>
          <p className="mb-2 text-label-md font-medium text-on-surface-variant">Loại bài giảng</p>
          <div className="grid grid-cols-2 gap-sm">
            {([["video", "Video bài giảng", Video, "Đăng link YouTube hoặc upload file mp4"], ["theory", "Lý thuyết / Tài liệu", FileText, "Tài liệu PDF, slide, hoặc ghi chú"]] as const).map(([v, label, Icon, hint]) => (
              <button
                key={v}
                type="button"
                onClick={() => setType(v)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-xl border-2 p-md text-left transition-all",
                  type === v
                    ? "border-primary bg-primary-fixed shadow-card-hover"
                    : "border-outline-variant bg-surface-container-lowest hover:border-primary/40",
                )}
              >
                <Icon size={24} className={type === v ? "text-primary" : "text-on-surface-variant"} />
                <span className={cn("text-body-md font-semibold", type === v ? "text-primary" : "text-on-surface")}>
                  {label}
                </span>
                <span className="text-label-sm text-on-surface-variant">{hint}</span>
              </button>
            ))}
          </div>
        </div>

        <Select label="Lớp học *" name="classId" value={classId} onChange={(e) => setClassId(e.target.value)}>
          {classes.length === 0
            ? <option value="">— Bạn chưa có lớp nào —</option>
            : classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>

        <Input
          label="Tiêu đề bài giảng *"
          name="title"
          placeholder={type === "video" ? "VD: Present Simple — Thì hiện tại đơn" : "VD: Ngữ pháp Unit 5 — Mệnh đề quan hệ"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Link URL */}
        <Input
          label={type === "video" ? "Link video (YouTube hoặc mp4 trực tiếp)" : "Link tài liệu (PDF / slide)"}
          name="contentUrl"
          placeholder="https://..."
          leadingIcon={<LinkIcon size={20} />}
          value={contentUrl}
          onChange={(e) => { setContentUrl(e.target.value); setFile(null); }}
          disabled={!!file}
        />

        {/* Drag-and-drop zone */}
        <div>
          <p className="mb-2 text-label-md font-medium text-on-surface-variant">— hoặc — kéo thả file lên đây</p>

          {file ? (
            /* File đã chọn */
            <div className="overflow-hidden rounded-xl border border-primary bg-primary-fixed">
              {/* Header file info */}
              <div className="flex items-center gap-md p-md">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary">
                  {type === "video" ? <Video size={22} /> : <FileText size={22} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-md font-semibold text-on-surface">{file.name}</p>
                  <p className="text-label-sm text-on-surface-variant">{formatBytes(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setFile(null); setUploadPct(0); setUploaded(false); }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Progress bar (khi đang upload) */}
              {loading && uploadPct > 0 && (
                <div className="px-md pb-md">
                  <div className="mb-1 flex items-center justify-between text-label-sm">
                    <span className="text-primary font-medium">
                      {uploaded ? "Tải lên hoàn tất!" : `Đang tải lên... ${uploadPct}%`}
                    </span>
                    {uploaded && <CheckCircle2 size={14} className="text-tertiary" />}
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-primary/20">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        uploaded ? "bg-tertiary" : "bg-primary",
                      )}
                      style={{ width: `${uploadPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Drop zone */
            <div
              ref={dropRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative flex flex-col items-center justify-center gap-sm rounded-xl border-2 border-dashed p-xl text-center transition-all",
                dragging
                  ? "border-primary bg-primary-fixed/60 scale-[1.01]"
                  : "border-outline-variant bg-surface-container-low hover:border-primary/60 hover:bg-primary-fixed/30",
              )}
            >
              <div className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
                dragging ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant",
              )}>
                <CloudUpload size={26} />
              </div>
              <div>
                <p className="text-body-md font-semibold text-on-surface">
                  {dragging ? "Thả file vào đây!" : "Kéo thả file vào đây"}
                </p>
                <p className="text-label-md text-on-surface-variant">hoặc</p>
              </div>
              <label className="cursor-pointer rounded-full border border-primary bg-primary-fixed px-5 py-2.5 text-label-md font-semibold text-primary transition-colors hover:bg-primary hover:text-on-primary">
                Chọn file từ máy tính
                <input
                  type="file"
                  className="hidden"
                  accept="video/*,application/pdf,image/*,.ppt,.pptx,.doc,.docx"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) selectFile(f); }}
                />
              </label>
              <p className="text-label-sm text-on-surface-variant">
                Hỗ trợ: mp4 · pdf · pptx · docx · hình ảnh (tối đa 500 MB)
              </p>
            </div>
          )}
        </div>

        {/* Mô tả */}
        <div>
          <label htmlFor="desc" className="mb-2 block text-label-md font-medium text-on-surface-variant">
            Mô tả / ghi chú cho học sinh
          </label>
          <textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Tóm tắt nội dung bài giảng, yêu cầu học sinh cần chuẩn bị, bài tập sau khi xem..."
            className="w-full resize-none rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-body-lg leading-relaxed outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>
      </Card>

      {error && (
        <p className="rounded-xl bg-error-container px-4 py-3 text-body-md text-on-error-container">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-sm">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Huỷ</Button>
        <Button type="submit" loading={loading}>
          {loading ? (file ? "Đang tải file lên..." : "Đang lưu...") : (isEdit ? "Lưu thay đổi" : "Đăng bài giảng")}
        </Button>
      </div>
    </form>
  );
}
