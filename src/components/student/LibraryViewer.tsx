"use client";

import { useState, useEffect } from "react";
import { FolderOpen, FileText, Video, Link2, Image, ExternalLink, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { Topic, Doc } from "@/components/teacher/LibraryManager";

const FILE_TYPE_ICON: Record<string, React.ElementType> = {
  pdf: FileText, video: Video, link: Link2, image: Image,
};
const FILE_TYPE_COLOR: Record<string, string> = {
  pdf: "bg-error-container text-on-error-container",
  video: "bg-secondary-fixed text-on-secondary-fixed",
  link: "bg-tertiary-fixed text-on-tertiary-fixed",
  image: "bg-primary-fixed text-on-primary-fixed",
};
const FILE_TYPE_LABEL: Record<string, string> = {
  pdf: "PDF", video: "Video", link: "Link", image: "Ảnh",
};

export function LibraryViewer({ initialTopics, isDemo = false }: { initialTopics: Topic[]; isDemo?: boolean }) {
  const supabase = createClient();
  const [selectedId, setSelectedId] = useState<string | null>(initialTopics[0]?.id ?? null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadDocs(topicId: string) {
    if (isDemo) return;
    setLoading(true);
    setDocs([]);
    const { data } = await supabase
      .from("library_docs")
      .select("id, topic_id, title, file_url, file_type, description")
      .eq("topic_id", topicId)
      .order("created_at", { ascending: false });
    setDocs((data as Doc[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (selectedId) loadDocs(selectedId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectTopic(id: string) {
    setSelectedId(id);
    loadDocs(id);
  }

  const selectedTopic = initialTopics.find(t => t.id === selectedId);

  return (
    <div className="flex flex-col gap-lg lg:flex-row lg:items-start">

      {/* ===== Cột trái: Danh sách chủ đề ===== */}
      <div className="flex w-full flex-col gap-sm lg:w-72 lg:shrink-0">
        <h2 className="text-headline-sm">Chủ đề</h2>

        {initialTopics.length === 0 ? (
          <Card className="py-lg text-center">
            <FolderOpen size={28} className="mx-auto mb-sm text-on-surface-variant" />
            <p className="text-body-md text-on-surface-variant">Giáo viên chưa thêm tài liệu nào</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-xs">
            {initialTopics.map(topic => (
              <button
                key={topic.id}
                onClick={() => selectTopic(topic.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-sm rounded-lg px-md py-sm text-left transition-colors",
                  selectedId === topic.id
                    ? "bg-primary text-on-primary"
                    : "hover:bg-surface-container",
                )}
              >
                <FolderOpen size={16} className="shrink-0" />
                <span className="truncate text-body-md font-medium">{topic.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ===== Cột phải: Danh sách tài liệu ===== */}
      <div className="flex flex-1 flex-col gap-md">
        {!selectedTopic ? (
          <Card className="flex flex-col items-center gap-md py-xl text-center">
            <FolderOpen size={36} className="text-on-surface-variant" />
            <p className="text-body-lg text-on-surface-variant">Chọn một chủ đề để xem tài liệu</p>
          </Card>
        ) : (
          <>
            <div>
              <h2 className="text-headline-sm">{selectedTopic.title}</h2>
              {!loading && (
                <p className="text-label-md text-on-surface-variant">{docs.length} tài liệu</p>
              )}
            </div>

            {loading && (
              <div className="flex items-center justify-center py-xl">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            )}

            {!loading && docs.length === 0 && (
              <Card className="flex flex-col items-center gap-md py-xl text-center">
                <FileText size={32} className="text-on-surface-variant" />
                <div>
                  <p className="text-body-lg font-medium">Chưa có tài liệu</p>
                  <p className="mt-xs text-body-md text-on-surface-variant">
                    Giáo viên chưa thêm tài liệu vào chủ đề này.
                  </p>
                </div>
              </Card>
            )}

            {!loading && docs.length > 0 && (
              <div className="flex flex-col gap-sm">
                {docs.map(doc => {
                  const Icon = FILE_TYPE_ICON[doc.file_type] ?? Link2;
                  const colorClass = FILE_TYPE_COLOR[doc.file_type] ?? FILE_TYPE_COLOR.link;
                  return (
                    <Card key={doc.id} padding="md" className="flex items-start gap-sm">
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md", colorClass)}>
                        <Icon size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-sm">
                          <p className="text-body-md font-semibold">{doc.title}</p>
                          <span className={cn("rounded-full px-2 py-0.5 text-label-xs", colorClass)}>
                            {FILE_TYPE_LABEL[doc.file_type] ?? "File"}
                          </span>
                        </div>
                        {doc.description && (
                          <p className="mt-xs text-label-md text-on-surface-variant">{doc.description}</p>
                        )}
                        {doc.file_url ? (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-xs inline-flex items-center gap-1 text-label-md text-primary hover:underline"
                          >
                            <ExternalLink size={12} /> Mở tài liệu
                          </a>
                        ) : (
                          <p className="mt-xs text-label-md text-on-surface-variant italic">Chưa có link</p>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
