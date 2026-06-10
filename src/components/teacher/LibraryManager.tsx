"use client";

import { useState, useTransition } from "react";
import {
  FolderOpen, Plus, Trash2, ExternalLink, FileText,
  Video, Link2, Image, ChevronRight, Loader2, AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface Topic { id: string; title: string }
export interface Doc {
  id: string; topic_id: string; title: string;
  file_url: string | null; file_type: string; description: string | null;
}

const FILE_TYPE_ICON: Record<string, React.ElementType> = {
  pdf: FileText, video: Video, link: Link2, image: Image,
};
const FILE_TYPE_LABEL: Record<string, string> = {
  pdf: "PDF", video: "Video", link: "Link", image: "Ảnh",
};
const FILE_TYPE_COLOR: Record<string, string> = {
  pdf: "bg-error-container text-on-error-container",
  video: "bg-secondary-fixed text-on-secondary-fixed",
  link: "bg-tertiary-fixed text-on-tertiary-fixed",
  image: "bg-primary-fixed text-on-primary-fixed",
};

export function LibraryManager({ initialTopics, teacherId }: { initialTopics: Topic[]; teacherId: string }) {
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [selectedId, setSelectedId] = useState<string | null>(initialTopics[0]?.id ?? null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Form tạo chủ đề
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [topicError, setTopicError] = useState("");

  // Form tạo tài liệu
  const [showDocForm, setShowDocForm] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docType, setDocType] = useState("link");
  const [docDesc, setDocDesc] = useState("");
  const [docError, setDocError] = useState("");

  async function loadDocs(topicId: string) {
    setLoadingDocs(true);
    setDocs([]);
    const { data } = await supabase
      .from("library_docs")
      .select("id, topic_id, title, file_url, file_type, description")
      .eq("topic_id", topicId)
      .order("created_at", { ascending: false });
    setDocs((data as Doc[]) ?? []);
    setLoadingDocs(false);
  }

  function selectTopic(id: string) {
    setSelectedId(id);
    setShowDocForm(false);
    loadDocs(id);
  }

  // ===== CRUD Chủ đề =====
  async function handleCreateTopic() {
    const title = newTopicTitle.trim();
    if (!title) { setTopicError("Nhập tên chủ đề"); return; }
    setTopicError("");
    startTransition(async () => {
      const { data, error } = await supabase
        .from("library_topics")
        .insert({ title, teacher_id: teacherId })
        .select("id, title")
        .single();
      if (error) { setTopicError(error.message); return; }
      const topic = data as Topic;
      setTopics(prev => [topic, ...prev]);
      setNewTopicTitle("");
      setShowTopicForm(false);
      selectTopic(topic.id);
    });
  }

  async function handleDeleteTopic(id: string) {
    if (!confirm("Xoá chủ đề này sẽ xoá toàn bộ tài liệu bên trong. Tiếp tục?")) return;
    startTransition(async () => {
      await supabase.from("library_topics").delete().eq("id", id);
      setTopics(prev => prev.filter(t => t.id !== id));
      if (selectedId === id) {
        const next = topics.find(t => t.id !== id);
        if (next) { setSelectedId(next.id); loadDocs(next.id); }
        else { setSelectedId(null); setDocs([]); }
      }
    });
  }

  // ===== CRUD Tài liệu =====
  async function handleCreateDoc() {
    if (!selectedId) return;
    const title = docTitle.trim();
    if (!title) { setDocError("Nhập tiêu đề tài liệu"); return; }
    setDocError("");
    startTransition(async () => {
      const { data, error } = await supabase
        .from("library_docs")
        .insert({
          topic_id: selectedId,
          teacher_id: teacherId,
          title,
          file_url: docUrl.trim() || null,
          file_type: docType,
          description: docDesc.trim() || null,
        })
        .select("id, topic_id, title, file_url, file_type, description")
        .single();
      if (error) { setDocError(error.message); return; }
      setDocs(prev => [data as Doc, ...prev]);
      setDocTitle(""); setDocUrl(""); setDocType("link"); setDocDesc("");
      setShowDocForm(false);
    });
  }

  async function handleDeleteDoc(id: string) {
    if (!confirm("Xoá tài liệu này?")) return;
    startTransition(async () => {
      await supabase.from("library_docs").delete().eq("id", id);
      setDocs(prev => prev.filter(d => d.id !== id));
    });
  }

  const selectedTopic = topics.find(t => t.id === selectedId);

  return (
    <div className="flex flex-col gap-lg lg:flex-row lg:items-start">

      {/* ===== Cột trái: Danh sách chủ đề ===== */}
      <div className="flex w-full flex-col gap-sm lg:w-72 lg:shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm">Chủ đề</h2>
          <Button size="sm" onClick={() => { setShowTopicForm(v => !v); setTopicError(""); }}>
            <Plus size={16} /> Thêm
          </Button>
        </div>

        {/* Form tạo chủ đề */}
        {showTopicForm && (
          <Card padding="md" className="flex flex-col gap-sm border border-primary/30">
            <input
              value={newTopicTitle}
              onChange={e => setNewTopicTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreateTopic()}
              placeholder="Tên chủ đề..."
              className="h-11 rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-body-md outline-none focus:border-primary"
              autoFocus
            />
            {topicError && (
              <p className="flex items-center gap-1 text-label-sm text-error">
                <AlertCircle size={14} /> {topicError}
              </p>
            )}
            <div className="flex gap-sm">
              <Button size="sm" onClick={handleCreateTopic} disabled={isPending} className="flex-1">
                {isPending ? <Loader2 size={14} className="animate-spin" /> : "Lưu"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowTopicForm(false)}>Huỷ</Button>
            </div>
          </Card>
        )}

        {/* List chủ đề */}
        {topics.length === 0 && !showTopicForm && (
          <Card className="py-lg text-center">
            <FolderOpen size={28} className="mx-auto mb-sm text-on-surface-variant" />
            <p className="text-body-md text-on-surface-variant">Chưa có chủ đề nào</p>
          </Card>
        )}
        <div className="flex flex-col gap-xs">
          {topics.map(topic => (
            <div
              key={topic.id}
              className={cn(
                "group flex cursor-pointer items-center justify-between rounded-lg px-md py-sm transition-colors",
                selectedId === topic.id
                  ? "bg-primary text-on-primary"
                  : "hover:bg-surface-container",
              )}
              onClick={() => selectTopic(topic.id)}
            >
              <div className="flex min-w-0 items-center gap-sm">
                <FolderOpen size={16} className="shrink-0" />
                <span className="truncate text-body-md font-medium">{topic.title}</span>
              </div>
              <div className="flex items-center gap-xs">
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteTopic(topic.id); }}
                  className={cn(
                    "hidden rounded p-1 transition-colors group-hover:flex",
                    selectedId === topic.id
                      ? "hover:bg-white/20"
                      : "hover:bg-error-container hover:text-on-error-container",
                  )}
                >
                  <Trash2 size={14} />
                </button>
                <ChevronRight size={16} className="shrink-0 opacity-60" />
              </div>
            </div>
          ))}
        </div>
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
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-headline-sm">{selectedTopic.title}</h2>
                <p className="text-label-md text-on-surface-variant">{docs.length} tài liệu</p>
              </div>
              <Button size="sm" onClick={() => { setShowDocForm(v => !v); setDocError(""); }}>
                <Plus size={16} /> Thêm tài liệu
              </Button>
            </div>

            {/* Form tạo tài liệu */}
            {showDocForm && (
              <Card padding="md" className="flex flex-col gap-sm border border-primary/30">
                <p className="text-label-md font-semibold text-primary">Tài liệu mới</p>
                <input
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  placeholder="Tiêu đề tài liệu *"
                  className="h-11 rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-body-md outline-none focus:border-primary"
                />
                <input
                  value={docUrl}
                  onChange={e => setDocUrl(e.target.value)}
                  placeholder="URL tài liệu (Google Drive, YouTube...)"
                  className="h-11 rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-body-md outline-none focus:border-primary"
                />
                <div className="flex gap-sm">
                  {(["link", "pdf", "video", "image"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setDocType(t)}
                      className={cn(
                        "flex items-center gap-1 rounded-full px-3 py-1 text-label-md transition-colors",
                        docType === t ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant",
                      )}
                    >
                      {FILE_TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
                <input
                  value={docDesc}
                  onChange={e => setDocDesc(e.target.value)}
                  placeholder="Mô tả ngắn (tuỳ chọn)"
                  className="h-11 rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-body-md outline-none focus:border-primary"
                />
                {docError && (
                  <p className="flex items-center gap-1 text-label-sm text-error">
                    <AlertCircle size={14} /> {docError}
                  </p>
                )}
                <div className="flex gap-sm">
                  <Button size="sm" onClick={handleCreateDoc} disabled={isPending} className="flex-1">
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : "Lưu tài liệu"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowDocForm(false)}>Huỷ</Button>
                </div>
              </Card>
            )}

            {/* Loading docs */}
            {loadingDocs && (
              <div className="flex items-center justify-center py-xl">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            )}

            {/* Empty docs */}
            {!loadingDocs && docs.length === 0 && (
              <Card className="flex flex-col items-center gap-md py-xl text-center">
                <FileText size={32} className="text-on-surface-variant" />
                <div>
                  <p className="text-body-lg font-medium">Chưa có tài liệu</p>
                  <p className="mt-xs text-body-md text-on-surface-variant">
                    Nhấn &ldquo;+ Thêm tài liệu&rdquo; để thêm bài học, PDF, video vào chủ đề này.
                  </p>
                </div>
              </Card>
            )}

            {/* Danh sách tài liệu */}
            {!loadingDocs && docs.length > 0 && (
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
                        <p className="text-body-md font-semibold">{doc.title}</p>
                        {doc.description && (
                          <p className="mt-xs text-label-md text-on-surface-variant">{doc.description}</p>
                        )}
                        {doc.file_url && (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-xs flex items-center gap-1 text-label-md text-primary hover:underline"
                          >
                            <ExternalLink size={12} /> Mở tài liệu
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="shrink-0 rounded-md p-2 text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
                      >
                        <Trash2 size={16} />
                      </button>
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
