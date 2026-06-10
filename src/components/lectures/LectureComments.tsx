"use client";

import { useEffect, useState } from "react";
import { Send, CornerDownRight, MessageSquare, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  body: string;
  author_name: string | null;
  author_role: "student" | "teacher" | "parent" | null;
  parent_comment_id: string | null;
  created_at: string;
}

interface Me {
  id: string;
  name: string;
  role: "student" | "teacher" | "parent";
}

export function LectureComments({ lectureId }: { lectureId: string }) {
  const [me, setMe] = useState<Me | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase
          .from("profiles").select("id, full_name, role").eq("id", user.id).single();
        if (p) setMe({ id: p.id, name: p.full_name || "Bạn", role: p.role });
      }
      const { data } = await supabase
        .from("lecture_comments")
        .select("id, body, author_name, author_role, parent_comment_id, created_at")
        .eq("lecture_id", lectureId)
        .order("created_at", { ascending: true });
      setComments((data as Comment[]) ?? []);
    } catch {
      /* chưa cấu hình Supabase */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectureId]);

  async function post(text: string, parent: string | null) {
    if (!text.trim() || !me) return;
    setSending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("lecture_comments").insert({
        lecture_id: lectureId,
        user_id: me.id,
        author_name: me.name,
        author_role: me.role,
        parent_comment_id: parent,
        body: text.trim(),
      });
      if (!error) {
        setBody(""); setReplyBody(""); setReplyTo(null);
        await load();
      }
    } finally {
      setSending(false);
    }
  }

  const roots = comments.filter((c) => !c.parent_comment_id);
  const repliesOf = (id: string) => comments.filter((c) => c.parent_comment_id === id);

  return (
    <section className="flex flex-col gap-md">
      <h2 className="flex items-center gap-2 text-headline-sm">
        <MessageSquare size={20} className="text-primary" /> Hỏi &amp; đáp ({comments.length})
      </h2>

      {/* Ô đặt câu hỏi */}
      {me ? (
        <div className="flex flex-col gap-sm rounded-lg bg-surface-container-lowest p-md shadow-card">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={me.role === "teacher" ? "Viết thông báo / trả lời chung..." : "Đặt câu hỏi cho giáo viên..."}
            rows={2}
            className="w-full resize-none rounded-md border border-outline-variant bg-surface-container-low p-3 text-body-md outline-none focus:border-primary"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={() => post(body, null)} loading={sending} disabled={!body.trim()}>
              <Send size={16} /> Gửi
            </Button>
          </div>
        </div>
      ) : (
        <p className="rounded-lg bg-surface-container px-4 py-3 text-body-md text-on-surface-variant">
          {loading ? "Đang tải..." : "Đăng nhập để đặt câu hỏi dưới bài giảng."}
        </p>
      )}

      {/* Danh sách câu hỏi */}
      {!loading && roots.length === 0 && me && (
        <p className="rounded-lg bg-surface-container px-4 py-6 text-center text-body-md text-on-surface-variant">
          Chưa có câu hỏi nào. Hãy là người đầu tiên đặt câu hỏi! 🙋
        </p>
      )}

      <div className="flex flex-col gap-md">
        {roots.map((c) => (
          <div key={c.id} className="rounded-lg bg-surface-container-lowest p-md shadow-card">
            <CommentRow c={c} />

            {/* Trả lời */}
            <div className="mt-sm flex flex-col gap-sm border-l-2 border-primary-fixed pl-md">
              {repliesOf(c.id).map((r) => (
                <div key={r.id} className="flex items-start gap-2">
                  <CornerDownRight size={16} className="mt-1 shrink-0 text-outline" />
                  <div className="flex-1"><CommentRow c={r} /></div>
                </div>
              ))}

              {me && (
                replyTo === c.id ? (
                  <div className="flex flex-col gap-sm">
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Viết câu trả lời..."
                      rows={2}
                      autoFocus
                      className="w-full resize-none rounded-md border border-outline-variant bg-surface-container-low p-3 text-body-md outline-none focus:border-primary"
                    />
                    <div className="flex justify-end gap-sm">
                      <Button size="sm" variant="ghost" onClick={() => { setReplyTo(null); setReplyBody(""); }}>Huỷ</Button>
                      <Button size="sm" onClick={() => post(replyBody, c.id)} loading={sending} disabled={!replyBody.trim()}>
                        <Send size={14} /> Trả lời
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setReplyTo(c.id); setReplyBody(""); }}
                    className="self-start text-label-md font-semibold text-primary hover:underline"
                  >
                    Trả lời
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CommentRow({ c }: { c: Comment }) {
  const isTeacher = c.author_role === "teacher";
  const date = new Date(c.created_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex items-start gap-sm">
      <span className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-body-md font-bold",
        isTeacher ? "bg-secondary text-on-secondary" : "bg-primary-fixed text-on-primary-fixed",
      )}>
        {isTeacher ? <GraduationCap size={18} /> : (c.author_name?.charAt(0).toUpperCase() ?? "?")}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-body-md font-semibold">{c.author_name || "Người dùng"}</span>
          {isTeacher && (
            <span className="rounded-full bg-secondary-fixed px-2 py-0.5 text-label-sm text-on-secondary-fixed">Giáo viên</span>
          )}
          <span className="text-label-sm text-on-surface-variant">{date}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-body-md text-on-surface">{c.body}</p>
      </div>
    </div>
  );
}
