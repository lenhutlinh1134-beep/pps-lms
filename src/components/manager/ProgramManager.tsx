"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Loader2, AlertCircle, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export interface Program {
  id: string;
  code: string;
  name: string;
  level: number;
  tuition: number;
  specialty_id: string | null;
  specialty_name: string | null;
  created_at: string;
}

export interface Specialty {
  id: string;
  name: string;
}

const LEVEL_LABELS: Record<number, string> = {
  1: "Cơ bản", 2: "Trung cấp", 3: "Nâng cao", 4: "Chuyên sâu",
};

function fmtMoney(n: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
}

export function ProgramManager({
  initialPrograms,
  specialties,
  managerId,
}: {
  initialPrograms: Program[];
  specialties: Specialty[];
  managerId: string;
}) {
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [programs, setPrograms] = useState<Program[]>(initialPrograms);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");

  // Form state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [level, setLevel] = useState(1);
  const [tuition, setTuition] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");

  function resetForm() {
    setCode(""); setName(""); setLevel(1); setTuition(""); setSpecialtyId("");
    setFormError("");
  }

  async function handleAdd() {
    if (!code.trim() || !name.trim()) {
      setFormError("Mã chương trình và tên là bắt buộc");
      return;
    }
    setFormError("");
    startTransition(async () => {
      const { data, error } = await supabase
        .from("programs")
        .insert({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          level,
          tuition: parseFloat(tuition) || 0,
          specialty_id: specialtyId || null,
          created_by: managerId,
        })
        .select("id, code, name, level, tuition, specialty_id, created_at, specialties(name)")
        .single();

      if (error) { setFormError(error.message); return; }

      const row = data as unknown as { id: string; code: string; name: string; level: number; tuition: number; specialty_id: string | null; created_at: string; specialties: { name: string } | null };
      const newProg: Program = {
        id: row.id, code: row.code, name: row.name, level: row.level,
        tuition: row.tuition, specialty_id: row.specialty_id,
        specialty_name: row.specialties?.name ?? null,
        created_at: row.created_at,
      };
      setPrograms(prev => [newProg, ...prev]);
      resetForm();
      setShowForm(false);
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Xoá chương trình học này?")) return;
    startTransition(async () => {
      await supabase.from("programs").delete().eq("id", id);
      setPrograms(prev => prev.filter(p => p.id !== id));
    });
  }

  return (
    <div className="flex flex-col gap-lg">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-label-md text-on-surface-variant">{programs.length} chương trình</p>
        <Button size="sm" onClick={() => { setShowForm(v => !v); resetForm(); }}>
          <Plus size={16} /> Thêm chương trình
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card padding="md" className="flex flex-col gap-sm border border-primary/30">
          <p className="text-label-md font-semibold text-primary">Chương trình mới</p>
          <div className="grid gap-sm sm:grid-cols-2">
            <input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Mã chương trình * (VD: ANH-SO-CAP)"
              className="h-11 rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-body-md outline-none focus:border-primary"
            />
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tên chương trình *"
              className="h-11 rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-body-md outline-none focus:border-primary"
            />
            <select
              value={level}
              onChange={e => setLevel(Number(e.target.value))}
              className="h-11 rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-body-md outline-none focus:border-primary"
            >
              {[1, 2, 3, 4].map(l => (
                <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
              ))}
            </select>
            <input
              type="number"
              value={tuition}
              onChange={e => setTuition(e.target.value)}
              placeholder="Học phí (VNĐ)"
              className="h-11 rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-body-md outline-none focus:border-primary"
            />
            <select
              value={specialtyId}
              onChange={e => setSpecialtyId(e.target.value)}
              className="h-11 rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-body-md outline-none focus:border-primary"
            >
              <option value="">-- Chọn chuyên môn --</option>
              {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {formError && (
            <p className="flex items-center gap-1 text-label-sm text-error">
              <AlertCircle size={14} /> {formError}
            </p>
          )}
          <div className="flex gap-sm">
            <Button size="sm" onClick={handleAdd} disabled={isPending} className="flex-1">
              {isPending ? <Loader2 size={14} className="animate-spin" /> : "Lưu"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}>Huỷ</Button>
          </div>
        </Card>
      )}

      {/* Table */}
      {programs.length === 0 ? (
        <Card className="flex flex-col items-center gap-md py-xl text-center">
          <GraduationCap size={36} className="text-on-surface-variant" />
          <div>
            <p className="text-body-lg font-medium">Chưa có chương trình học nào</p>
            <p className="mt-xs text-body-md text-on-surface-variant">
              Nhấn &ldquo;+ Thêm chương trình&rdquo; để bắt đầu.
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-md">
              <thead>
                <tr className="border-b border-outline-variant">
                  {["Mã", "Tên chương trình", "Cấp độ", "Chuyên môn", "Học phí", ""].map(h => (
                    <th key={h} className="pb-md pr-lg text-label-md font-semibold text-on-surface-variant last:pr-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {programs.map(p => (
                  <tr key={p.id} className="transition-colors hover:bg-surface-container">
                    <td className="py-md pr-lg">
                      <span className="rounded-md bg-primary-fixed px-2 py-1 text-label-sm font-mono font-semibold text-on-primary-fixed">
                        {p.code}
                      </span>
                    </td>
                    <td className="py-md pr-lg font-medium">{p.name}</td>
                    <td className="py-md pr-lg">
                      <span className="rounded-full bg-surface-container px-3 py-1 text-label-sm text-on-surface-variant">
                        {LEVEL_LABELS[p.level] ?? `Cấp ${p.level}`}
                      </span>
                    </td>
                    <td className="py-md pr-lg text-on-surface-variant">{p.specialty_name ?? "—"}</td>
                    <td className="py-md pr-lg font-semibold text-primary">
                      {p.tuition > 0 ? fmtMoney(p.tuition) : "—"}
                    </td>
                    <td className="py-md">
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="rounded-md p-2 text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
