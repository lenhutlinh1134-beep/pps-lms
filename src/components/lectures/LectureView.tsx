import { FileText, ExternalLink, Video as VideoIcon, GraduationCap, Calendar, BookOpen } from "lucide-react";
import { parseMedia } from "@/lib/video";

export interface LectureDetail {
  title: string;
  description: string | null;
  type: "video" | "theory";
  content_url: string | null;
  teacher_name: string | null;
  created_at: string;
  class?: { name: string } | null;
}

export function LectureView({ lecture }: { lecture: LectureDetail }) {
  const media = parseMedia(lecture.content_url);
  const date = new Date(lecture.created_at).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const teacherInitial = (lecture.teacher_name ?? "GV").charAt(0).toUpperCase();

  return (
    <article className="flex flex-col gap-md">
      {/* === Khu media === */}
      {media?.kind === "youtube" && (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black shadow-card">
          <iframe
            src={media.src}
            title={lecture.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {media?.kind === "video" && (
        <video
          src={media.src}
          controls
          className="w-full overflow-hidden rounded-xl bg-black shadow-card"
        />
      )}
      {media?.kind === "file" && (
        <a
          href={media.src}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-md rounded-xl bg-surface-container-lowest p-lg shadow-card transition-shadow hover:shadow-card-hover"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-tertiary-fixed text-tertiary">
            <FileText size={28} />
          </span>
          <div className="flex-1">
            <p className="text-body-md font-semibold">Mở tài liệu bài giảng</p>
            <p className="text-label-md text-on-surface-variant">Bấm để xem / tải file PDF hoặc tài liệu</p>
          </div>
          <ExternalLink size={20} className="text-on-surface-variant" />
        </a>
      )}

      {/* === Tiêu đề === */}
      <div className="flex flex-col gap-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-label-sm font-medium ${lecture.type === "video" ? "bg-secondary-fixed text-on-secondary-fixed" : "bg-tertiary-fixed text-on-tertiary-fixed"}`}>
            {lecture.type === "video" ? <VideoIcon size={13} /> : <FileText size={13} />}
            {lecture.type === "video" ? "Video bài giảng" : "Lý thuyết"}
          </span>
          {lecture.class?.name && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-3 py-1 text-label-sm text-on-primary-fixed">
              <BookOpen size={13} /> {lecture.class.name}
            </span>
          )}
        </div>
        <h1 className="text-headline-md leading-snug">{lecture.title}</h1>
      </div>

      {/* === Thông tin tác giả — nằm dưới player === */}
      <div className="flex items-center gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-card">
        {/* Avatar giáo viên */}
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary font-display text-body-md font-bold">
          {teacherInitial}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-body-md font-semibold truncate">
              {lecture.teacher_name ?? "Giáo viên"}
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary-fixed px-2 py-0.5 text-label-sm text-on-secondary-fixed">
              <GraduationCap size={11} /> Giáo viên
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-label-sm text-on-surface-variant">
            <Calendar size={12} />
            <span>Đăng ngày {date}</span>
          </div>
        </div>
      </div>

      {/* === Mô tả / nội dung === */}
      {lecture.description && (
        <div className="rounded-xl bg-surface-container-low p-lg">
          <p className="mb-sm text-label-md font-semibold uppercase text-on-surface-variant">Nội dung bài giảng</p>
          <p className="whitespace-pre-wrap text-body-lg leading-relaxed text-on-surface">
            {lecture.description}
          </p>
        </div>
      )}
    </article>
  );
}
