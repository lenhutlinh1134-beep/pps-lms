"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, School } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";

interface SchoolOption {
  id: string;
  name: string;
}

interface CustomField {
  key: string;
  value: string;
}

export function NewClassForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [schoolMode, setSchoolMode] = useState<"existing" | "new">("new");
  const [schoolId, setSchoolId] = useState("");
  const [newSchoolName, setNewSchoolName] = useState("");
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.from("schools").select("id, name").order("name");
        if (data && data.length > 0) {
          setSchools(data);
          setSchoolMode("existing");
          setSchoolId(data[0].id);
        }
      } catch {
        /* chưa cấu hình Supabase */
      }
    })();
  }, []);

  function addField() {
    setCustomFields((f) => [...f, { key: "", value: "" }]);
  }
  function updateField(i: number, patch: Partial<CustomField>) {
    setCustomFields((f) => f.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function removeField(i: number) {
    setCustomFields((f) => f.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Vui lòng nhập tên lớp.");
      return;
    }
    if (schoolMode === "new" && !newSchoolName.trim()) {
      setError("Vui lòng nhập tên trường (hoặc chọn trường có sẵn).");
      return;
    }

    const custom: Record<string, string> = {};
    customFields.forEach((f) => {
      if (f.key.trim()) custom[f.key.trim()] = f.value;
    });

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("create_class", {
        p_name: name.trim(),
        p_year: year.trim() || null,
        p_school_id: schoolMode === "existing" ? schoolId || null : null,
        p_school_name: schoolMode === "new" ? newSchoolName.trim() : null,
        p_custom: custom,
      });
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      router.replace("/teacher/classes");
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
        <h2 className="text-headline-sm">Thông tin lớp</h2>

        <Input
          label="Tên lớp *"
          name="name"
          placeholder="VD: PET 01"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Input
          label="Năm học"
          name="year"
          placeholder="VD: 2025 - 2026"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />

        {/* Trường */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-label-md text-on-surface-variant">Trường</span>
            {schools.length > 0 && (
              <button
                type="button"
                onClick={() => setSchoolMode((m) => (m === "new" ? "existing" : "new"))}
                className="text-label-md font-semibold text-primary hover:underline"
              >
                {schoolMode === "new" ? "Chọn trường có sẵn" : "+ Tạo trường mới"}
              </button>
            )}
          </div>
          {schoolMode === "existing" && schools.length > 0 ? (
            <Select name="schoolId" value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          ) : (
            <Input
              name="newSchoolName"
              placeholder="Tên trường mới (VD: PPS Hà Nội Campus)"
              leadingIcon={<School size={20} />}
              value={newSchoolName}
              onChange={(e) => setNewSchoolName(e.target.value)}
            />
          )}
        </div>
      </Card>

      {/* Trường dữ liệu tuỳ biến */}
      <Card className="flex flex-col gap-md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-headline-sm">Thông tin thêm</h2>
            <p className="text-label-md text-on-surface-variant">Tuỳ chọn — thêm trường dữ liệu riêng cho lớp.</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={addField}>
            <Plus size={16} /> Thêm
          </Button>
        </div>

        {customFields.length === 0 ? (
          <p className="rounded-md bg-surface-container px-4 py-3 text-label-md text-on-surface-variant">
            Chưa có trường thêm nào. VD: “Phòng học”, “Lịch học”, “Giáo trình”…
          </p>
        ) : (
          customFields.map((f, i) => (
            <div key={i} className="flex items-end gap-sm">
              <Input
                label={i === 0 ? "Tên trường" : undefined}
                placeholder="VD: Phòng học"
                value={f.key}
                onChange={(e) => updateField(i, { key: e.target.value })}
              />
              <Input
                label={i === 0 ? "Giá trị" : undefined}
                placeholder="VD: P.302"
                value={f.value}
                onChange={(e) => updateField(i, { value: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeField(i)}
                className="mb-1 flex h-14 w-12 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
                aria-label="Xoá"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))
        )}
      </Card>

      {error && (
        <p className="rounded-md bg-error-container px-4 py-3 text-body-md text-on-error-container">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-sm">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Huỷ</Button>
        <Button type="submit" loading={loading}>Tạo lớp</Button>
      </div>
    </form>
  );
}
