"use client";

import { useState } from "react";
import { MessageCircle, GraduationCap, Plus, Search, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ChatRoom } from "./ChatRoom";
import { cn } from "@/lib/utils";

interface Student { id: string; name: string; class_id: string; class_name: string }
interface Conversation {
  id: string;
  student_id: string;
  class_id: string;
  class_name: string;
  student_name: string;
  last_message_at: string;
  unread_count: number;
}

function timeShort(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) return `${diffDays} ngày`;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function TeacherChatClient({
  myId,
  myName,
  students,
  existingConversations,
  newStudents,
}: {
  myId: string;
  myName: string;
  students: Student[];
  existingConversations: Conversation[];
  newStudents: Student[];
}) {
  const [conversations, setConversations] = useState<Conversation[]>(existingConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(
    existingConversations[0]?.id ?? null,
  );
  const [searchQ, setSearchQ] = useState("");
  const [creating, setCreating] = useState(false);

  const activeConv = conversations.find((c) => c.id === activeConvId);

  async function openOrCreate(student: Student) {
    const existing = conversations.find(
      (c) => c.student_id === student.id && c.class_id === student.class_id,
    );
    if (existing) {
      setActiveConvId(existing.id);
      return;
    }

    setCreating(true);
    try {
      const supabase = createClient();

      // Tìm giáo viên chính của lớp
      const { data: ct } = await supabase
        .from("class_teachers")
        .select("teacher_id")
        .eq("class_id", student.class_id)
        .limit(1)
        .single();

      const teacherId = ct?.teacher_id ?? myId;

      const { data: newConv, error } = await supabase
        .from("conversations")
        .upsert(
          { class_id: student.class_id, student_id: student.id, teacher_id: teacherId },
          { onConflict: "class_id,student_id,teacher_id" },
        )
        .select("id, last_message_at")
        .single();

      if (!error && newConv) {
        const conv: Conversation = {
          id: newConv.id as string,
          student_id: student.id,
          class_id: student.class_id,
          class_name: student.class_name,
          student_name: student.name,
          last_message_at: newConv.last_message_at as string,
          unread_count: 0,
        };
        setConversations((prev) => [conv, ...prev.filter((c) => c.id !== conv.id)]);
        setActiveConvId(conv.id);
      }
    } finally {
      setCreating(false);
    }
  }

  const filteredConvs = conversations.filter((c) =>
    c.student_name.toLowerCase().includes(searchQ.toLowerCase()) ||
    c.class_name.toLowerCase().includes(searchQ.toLowerCase()),
  );

  return (
    <div className="mx-auto flex h-[calc(100vh-160px)] max-w-6xl overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card">
      {/* Sidebar: danh sách học sinh */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-outline-variant">
        {/* Header */}
        <div className="border-b border-outline-variant p-md">
          <h1 className="text-headline-sm">Tin nhắn</h1>
          <p className="text-label-sm text-on-surface-variant">
            {conversations.filter((c) => c.unread_count > 0).length} cuộc trò chuyện chưa đọc
          </p>
        </div>

        {/* Tìm kiếm */}
        <div className="border-b border-outline-variant p-sm">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Tìm học sinh..."
              className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container pl-9 pr-3 text-label-md outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Danh sách conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConvs.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveConvId(c.id)}
              className={cn(
                "flex w-full items-center gap-sm border-b border-outline-variant/50 px-md py-sm text-left transition-colors hover:bg-surface-container",
                activeConvId === c.id && "bg-primary-fixed",
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-display text-body-sm font-bold text-on-primary-fixed">
                {c.student_name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-body-sm font-semibold">{c.student_name}</p>
                  <span className="shrink-0 text-label-sm text-on-surface-variant">
                    {timeShort(c.last_message_at)}
                  </span>
                </div>
                <p className="text-label-sm text-on-surface-variant">{c.class_name}</p>
              </div>
              {c.unread_count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-label-sm font-bold text-on-secondary">
                  {c.unread_count}
                </span>
              )}
            </button>
          ))}

          {/* Học sinh chưa có conversation */}
          {newStudents.length > 0 && !searchQ && (
            <>
              <div className="px-md py-sm">
                <p className="text-label-sm font-medium uppercase text-on-surface-variant">Nhắn tin mới</p>
              </div>
              {newStudents.map((s) => (
                <button
                  key={`${s.id}-${s.class_id}`}
                  onClick={() => openOrCreate(s)}
                  disabled={creating}
                  className="flex w-full items-center gap-sm border-b border-outline-variant/50 px-md py-sm text-left transition-colors hover:bg-surface-container disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
                    <Plus size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-semibold">{s.name}</p>
                    <p className="text-label-sm text-on-surface-variant">{s.class_name}</p>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </aside>

      {/* Khu chat chính */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeConv ? (
          <ChatRoom
            conversationId={activeConv.id}
            myId={myId}
            otherName={activeConv.student_name}
            otherRole="student"
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-sm text-on-surface-variant">
            <MessageCircle size={40} className="opacity-30" />
            <p className="text-body-md">Chọn một học sinh để bắt đầu nhắn tin</p>
          </div>
        )}
      </div>
    </div>
  );
}
