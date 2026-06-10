"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Camera, Mail, Save, Check, ShieldCheck, GraduationCap, Baby,
  BookOpen, type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/supabase/auth";

interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
  avatar_url: string | null;
}

const ROLE_META: Record<Role, { label: string; icon: LucideIcon; chip: string }> = {
  student: { label: "Học sinh", icon: BookOpen, chip: "bg-primary-fixed text-on-primary-fixed" },
  teacher: { label: "Giáo viên", icon: GraduationCap, chip: "bg-secondary-fixed text-on-secondary-fixed" },
  parent: { label: "Phụ huynh", icon: Baby, chip: "bg-tertiary-fixed text-on-tertiary-fixed" },
  manager: { label: "Quản lý", icon: GraduationCap, chip: "bg-surface-container-high text-on-surface" },
};

/** Bỏ dấu + ký tự lạ khỏi tên file để làm key Storage an toàn. */
function safeName(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function ProfileView({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const isDemo = profile.id.startsWith("demo-");

  const [name, setName] = useState(profile.full_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const meta = ROLE_META[profile.role];
  const initial = (name || "?").charAt(0).toUpperCase();
  const shownAvatar = preview ?? avatarUrl;
  const dirty = name.trim() !== (profile.full_name ?? "") || !!pendingFile;

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) {
      setMsg({ type: "err", text: "Ảnh quá lớn (tối đa 3MB). Chọn ảnh nhỏ hơn nhé." });
      return;
    }
    setMsg(null);
    setPendingFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!name.trim()) { setMsg({ type: "err", text: "Vui lòng nhập họ tên." }); return; }
    if (isDemo) {
      setMsg({ type: "err", text: "Đang ở chế độ xem thử — đăng nhập thật để lưu thay đổi." });
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMsg({ type: "err", text: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại." }); return; }

      // Upload ảnh mới (nếu có) lên bucket 'media'
      let newAvatar = avatarUrl;
      if (pendingFile) {
        const path = `avatars/${user.id}_${Date.now()}_${safeName(pendingFile.name)}`;
        const { error: upErr } = await supabase.storage.from("media").upload(path, pendingFile, { upsert: true });
        if (upErr) { setMsg({ type: "err", text: "Tải ảnh thất bại: " + upErr.message }); return; }
        newAvatar = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name.trim(), avatar_url: newAvatar })
        .eq("id", user.id);
      if (error) { setMsg({ type: "err", text: error.message }); return; }

      setAvatarUrl(newAvatar);
      setPendingFile(null);
      setPreview(null);
      setMsg({ type: "ok", text: "Đã lưu thông tin cá nhân." });
      router.refresh();
    } catch {
      setMsg({ type: "err", text: "Không kết nối được máy chủ (xem SETUP.md)." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-lg">
      <div>
        <h1 className="text-display-lg">Hồ sơ cá nhân</h1>
        <p className="mt-xs text-body-lg text-on-surface-variant">
          Cập nhật tên hiển thị và ảnh đại diện của bạn.
        </p>
      </div>

      {/* ===== Thẻ tổng quan ===== */}
      <Card className="flex flex-col items-center gap-md text-center sm:flex-row sm:text-left">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative shrink-0"
          aria-label="Đổi ảnh đại diện"
        >
          {shownAvatar ? (
            <Image
              src={shownAvatar}
              alt="Ảnh đại diện"
              width={96}
              height={96}
              className="h-24 w-24 rounded-full object-cover shadow-card"
              unoptimized
            />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-premium font-display text-display-lg font-bold text-white shadow-card">
              {initial}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <Camera size={24} />
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-headline-md">{name || "(Chưa có tên)"}</h2>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-label-md", meta.chip)}>
              <meta.icon size={14} /> {meta.label}
            </span>
            {profile.email && (
              <span className="inline-flex items-center gap-1 text-label-md text-on-surface-variant">
                <Mail size={14} /> {profile.email}
              </span>
            )}
          </div>
          <p className="mt-2 text-label-sm text-on-surface-variant">
            Bấm vào ảnh để đổi ảnh đại diện (tối đa 3MB).
          </p>
        </div>
      </Card>

      {/* ===== Form chỉnh sửa ===== */}
      <Card className="flex flex-col gap-md">
        <h3 className="text-headline-sm">Thông tin cơ bản</h3>
        <form onSubmit={save} className="flex flex-col gap-md">
          <Input
            label="Họ và tên"
            name="full_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Nguyễn Văn An"
          />
          <Input
            label="Email"
            value={profile.email ?? ""}
            leadingIcon={<Mail size={20} />}
            disabled
            readOnly
          />
          <p className="-mt-2 text-label-sm text-on-surface-variant">
            Email gắn với tài khoản đăng nhập, không thể đổi tại đây.
          </p>

          {msg && (
            <p className={cn(
              "flex items-center gap-2 rounded-md px-4 py-3 text-body-md",
              msg.type === "ok"
                ? "bg-tertiary-fixed text-on-tertiary-fixed"
                : "bg-error-container text-on-error-container",
            )}>
              {msg.type === "ok" && <Check size={18} />} {msg.text}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={saving} disabled={!dirty}>
              <Save size={18} /> Lưu thay đổi
            </Button>
          </div>
        </form>
      </Card>

      {/* ===== Bảo mật / tài khoản ===== */}
      <Card className="flex items-start gap-md">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary-fixed text-primary">
          <ShieldCheck size={22} />
        </span>
        <div>
          <p className="text-body-md font-semibold">Bảo mật tài khoản</p>
          <p className="text-label-sm text-on-surface-variant">
            Đăng nhập bằng Email / Google qua Supabase Auth. Đổi mật khẩu &amp; quản lý thiết bị sẽ sớm ra mắt.
          </p>
        </div>
      </Card>
    </div>
  );
}
