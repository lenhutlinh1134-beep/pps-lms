"use client";

import { useEffect, useRef, useState } from "react";
import { Send, GraduationCap, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface ConversationMeta {
  id: string;
  other_id: string;
  other_name: string;
  other_role: "student" | "teacher";
  class_name: string;
  last_message_at: string;
  unread_count: number;
}

interface Message {
  id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Hôm qua " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function ChatRoom({
  conversationId,
  myId,
  otherName,
  otherRole,
}: {
  conversationId: string;
  myId: string;
  otherName: string;
  otherRole: "student" | "teacher";
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, body, is_read, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) ?? []);

    // Đánh dấu đã đọc các tin nhắn từ đối phương
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", myId)
      .eq("is_read", false);
  }

  useEffect(() => {
    loadMessages();

    // Realtime subscription
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
          // Đánh dấu đọc nếu tin từ đối phương
          if (payload.new.sender_id !== myId) {
            supabase.from("messages").update({ is_read: true }).eq("id", payload.new.id).then(() => {});
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setBody("");
    try {
      const supabase = createClient();
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: myId,
        body: text,
      });
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const otherInitial = otherName.charAt(0).toUpperCase();

  return (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div className="flex items-center gap-md border-b border-outline-variant px-lg py-md">
        <span className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-body-md font-bold",
          otherRole === "teacher" ? "bg-secondary text-on-secondary" : "bg-primary-fixed text-on-primary-fixed",
        )}>
          {otherRole === "teacher" ? <GraduationCap size={18} /> : otherInitial}
        </span>
        <div>
          <p className="text-body-md font-semibold">{otherName}</p>
          <p className="text-label-sm text-on-surface-variant">
            {otherRole === "teacher" ? "Giáo viên" : "Học sinh"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-lg py-md">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-sm py-xl text-center text-on-surface-variant">
            <MessageCircle size={32} className="opacity-40" />
            <p className="text-body-md">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
          </div>
        )}

        <div className="flex flex-col gap-sm">
          {messages.map((msg, i) => {
            const isMe = msg.sender_id === myId;
            const showAvatar = !isMe && (i === 0 || messages[i - 1].sender_id !== msg.sender_id);
            return (
              <div key={msg.id} className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
                {/* Avatar đối phương */}
                {!isMe && (
                  <span className={cn(
                    "mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-label-sm font-bold",
                    showAvatar ? (otherRole === "teacher" ? "bg-secondary text-on-secondary" : "bg-primary-fixed text-on-primary-fixed") : "invisible",
                  )}>
                    {otherRole === "teacher" ? <GraduationCap size={14} /> : otherInitial}
                  </span>
                )}

                <div className={cn(
                  "flex max-w-[75%] flex-col",
                  isMe ? "items-end" : "items-start",
                )}>
                  <div className={cn(
                    "rounded-2xl px-4 py-2.5 text-body-md leading-relaxed",
                    isMe
                      ? "rounded-br-sm bg-primary text-on-primary"
                      : "rounded-bl-sm bg-surface-container-low text-on-surface",
                  )}>
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                  </div>
                  <span className="mt-0.5 px-1 text-label-sm text-on-surface-variant">
                    {timeLabel(msg.created_at)}
                    {isMe && <span className="ml-1">{msg.is_read ? "· Đã đọc" : "· Đã gửi"}</span>}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-outline-variant px-lg py-md">
        <div className="flex items-end gap-sm">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn... (Enter để gửi)"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-body-md leading-relaxed outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
          <Button onClick={send} loading={sending} disabled={!body.trim()} className="shrink-0">
            <Send size={18} />
          </Button>
        </div>
        <p className="mt-1 text-label-sm text-on-surface-variant">Shift+Enter để xuống dòng</p>
      </div>
    </div>
  );
}
