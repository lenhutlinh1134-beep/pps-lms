import Link from "next/link";
import { Video, FileText, PlayCircle, CheckCircle2, Eye, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/Card";

export interface LectureItem {
  id: string;
  title: string;
  type: "video" | "theory";
  teacher_name: string | null;
  created_at: string;
  content_url?: string | null;
  class?: { name: string } | null;
  view_count?: number | null;
  comment_count?: number | null;
}

// Cấu hình hiển thị theo loại bài giảng — hoist ra ngoài để không tạo lại mỗi lần render (skill: rendering-hoist-jsx / js-cache).
const TYPE_META = {
  video: {
    label: "Video",
    Icon: Video,
    cover: "bg-premium", // gradient tím → hồng
    chip: "bg-secondary-fixed text-on-secondary-fixed",
  },
  theory: {
    label: "Lý thuyết",
    Icon: FileText,
    cover: "bg-gradient-to-br from-tertiary to-tertiary-container",
    chip: "bg-tertiary-fixed text-on-tertiary-fixed",
  },
} as const;

function LectureCard({
  lecture,
  basePath,
  watched,
}: {
  lecture: LectureItem;
  basePath: string;
  watched: boolean;
}) {
  const meta = TYPE_META[lecture.type];
  const { Icon } = meta;

  return (
    <Link href={`${basePath}/${lecture.id}`} className="group">
      <Card interactive padding="none" className="flex h-full flex-col overflow-hidden">
        {/* Ảnh bìa gradient + icon lớn */}
        <div className={`relative flex h-32 items-center justify-center ${meta.cover}`}>
          <Icon size={40} className="text-white/90 transition-transform duration-300 group-hover:scale-110" />
          <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-label-sm ${meta.chip}`}>
            {meta.label}
          </span>
          {watched && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-label-sm font-semibold text-tertiary">
              <CheckCircle2 size={12} /> Đã xem
            </span>
          )}
        </div>

        {/* Nội dung */}
        <div className="flex flex-1 flex-col gap-md p-md">
          <div className="flex-1">
            <h3 className="text-headline-sm leading-snug line-clamp-2">{lecture.title}</h3>
            <p className="mt-xs text-label-md text-on-surface-variant">
              {lecture.class?.name ? `${lecture.class.name} · ` : ""}
              {lecture.teacher_name ?? "Giáo viên"}
            </p>
          </div>

          {/* Thống kê lượt xem + bình luận (chỉ hiện khi có data) */}
          {(lecture.view_count != null || lecture.comment_count != null) && (
            <div className="flex items-center gap-md">
              {lecture.view_count != null && (
                <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                  <Eye size={13} /> {lecture.view_count} lượt xem
                </span>
              )}
              {lecture.comment_count != null && (
                <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                  <MessageSquare size={13} /> {lecture.comment_count} hỏi đáp
                </span>
              )}
            </div>
          )}

          {/* Thanh tiến độ (chỉ học sinh) */}
          {lecture.view_count == null && (
            <div>
              <div className="mb-1 flex items-center justify-between text-label-sm text-on-surface-variant">
                <span>{watched ? "Hoàn thành" : "Chưa bắt đầu"}</span>
                <span className="font-semibold">{watched ? "100%" : "0%"}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: watched ? "100%" : "0%" }}
                />
              </div>
            </div>
          )}

          <span className="flex items-center gap-1 text-label-md font-semibold text-primary">
            <PlayCircle size={16} /> {watched ? "Xem lại" : "Xem bài giảng"}
          </span>
        </div>
      </Card>
    </Link>
  );
}

export function LectureGrid({
  lectures,
  basePath,
  watchedIds,
}: {
  lectures: LectureItem[];
  basePath: string;
  watchedIds?: Set<string>;
}) {
  return (
    <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
      {lectures.map((l) => (
        <LectureCard
          key={l.id}
          lecture={l}
          basePath={basePath}
          watched={watchedIds?.has(l.id) ?? false}
        />
      ))}
    </div>
  );
}
