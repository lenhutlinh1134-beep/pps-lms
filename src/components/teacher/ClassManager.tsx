"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users, ClipboardCheck, MessageSquare, UserPlus, Trash2, Mail, Save,
  Check, X, Clock, Send, AlertTriangle, Headphones, Ban, TrendingDown,
  History, UserCog, BarChart2,
} from "lucide-react";
import { ClassStatsTab } from "./ClassStatsTab";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/EmptyState";
import { DEMO_ATTENDANCE, DEMO_NOTES } from "@/lib/demo-data";
import { computeFlags, type StudentMetrics } from "@/lib/flags";
import { cn } from "@/lib/utils";

interface Student { id: string; full_name: string | null; email: string | null }
interface Note { id: string; student_id: string; note: string; created_at: string }
type AttStatus = "present" | "absent" | "late";
export type ClassTab = "students" | "attendance" | "history" | "notes" | "flags" | "teachers" | "stats";
type Tab = ClassTab;

const today = () => new Date().toISOString().slice(0, 10);

export function ClassManager({
  classId,
  initialStudents,
  demo = false,
  initialTab = "students",
}: {
  classId: string;
  initialStudents: Student[];
  /** Chế độ xem thử: dùng dữ liệu mẫu, mọi thao tác chỉ giả lập (không gọi máy chủ). */
  demo?: boolean;
  /** Tab mở sẵn khi vào trang (vd: từ nút "Điểm danh ngay" trên dashboard). */
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [students, setStudents] = useState<Student[]>(initialStudents);

  const refreshStudents = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("class_students")
        .select("student:profiles(id, full_name, email)")
        .eq("class_id", classId);
      const rows = (data ?? []) as unknown as Array<{ student: Student | Student[] | null }>;
      const list = rows.flatMap((r) => (Array.isArray(r.student) ? r.student : r.student ? [r.student] : []));
      setStudents(list);
    } catch { /* noop */ }
  }, [classId]);

  const addLocal = useCallback((s: Student) => setStudents((prev) => [...prev, s]), []);
  const removeLocal = useCallback((id: string) => setStudents((prev) => prev.filter((x) => x.id !== id)), []);

  return (
    <div className="flex flex-col gap-lg">
      {/* Tabs */}
      <div className="flex gap-sm overflow-x-auto">
        {([["stats", "Thống kê", BarChart2], ["students", "Học sinh", Users], ["attendance", "Điểm danh", ClipboardCheck], ["history", "Lịch sử điểm danh", History], ["notes", "Nhận xét", MessageSquare], ["flags", "Cảnh báo", AlertTriangle], ["teachers", "Giáo viên", UserCog]] as [Tab, string, typeof Users][]).map(
          ([t, label, Icon]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-body-md font-semibold transition-colors",
                tab === t ? "bg-primary text-on-primary shadow-card-hover" : "bg-surface-container text-on-surface-variant hover:bg-primary-fixed",
              )}
            >
              <Icon size={18} /> {label}
            </button>
          ),
        )}
      </div>

      {tab === "stats" && <ClassStatsTab classId={classId} demo={demo} totalStudents={students.length} />}
      {tab === "students" && (
        <StudentsTab classId={classId} students={students} demo={demo}
          onChange={refreshStudents} onAddLocal={addLocal} onRemoveLocal={removeLocal} />
      )}
      {tab === "attendance" && <AttendanceTab classId={classId} students={students} demo={demo} />}
      {tab === "history" && <AttendanceHistoryTab classId={classId} students={students} demo={demo} />}
      {tab === "notes" && <NotesTab classId={classId} students={students} demo={demo} />}
      {tab === "flags" && <FlagsTab classId={classId} students={students} demo={demo} />}
      {tab === "teachers" && <TeachersTab classId={classId} demo={demo} />}
    </div>
  );
}

import { BulkImportStudents } from "./BulkImportStudents";

/* ---------------- Tab Học sinh ---------------- */
function StudentsTab({ classId, students, demo, onChange, onAddLocal, onRemoveLocal }: {
  classId: string; students: Student[]; demo: boolean;
  onChange: () => void; onAddLocal: (s: Student) => void; onRemoveLocal: (id: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!email.trim()) return;
    setLoading(true);
    try {
      if (demo) {
        const mail = email.trim();
        const name = mail.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        onAddLocal({ id: `demo-new-${Date.now()}`, full_name: name, email: mail });
        setMsg({ type: "ok", text: `Đã thêm ${name} vào lớp (xem thử).` });
        setEmail("");
        return;
      }
      const supabase = createClient();
      const { data, error } = await supabase.rpc("add_student_by_email", { p_class_id: classId, p_email: email.trim() });
      if (error) { setMsg({ type: "err", text: error.message }); return; }
      const name = (data as { full_name: string }[] | null)?.[0]?.full_name ?? "Học sinh";
      setMsg({ type: "ok", text: `Đã thêm ${name} vào lớp.` });
      setEmail("");
      onChange();
    } catch {
      setMsg({ type: "err", text: "Không kết nối được máy chủ (xem SETUP.md)." });
    } finally {
      setLoading(false);
    }
  }

  async function removeStudent(id: string) {
    if (demo) { onRemoveLocal(id); return; }
    try {
      const supabase = createClient();
      await supabase.from("class_students").delete().eq("class_id", classId).eq("student_id", id);
      onChange();
    } catch { /* noop */ }
  }

  return (
    <div className="flex flex-col gap-md">
      {!demo && <BulkImportStudents classId={classId} onDone={onChange} />}

      <Card className="flex flex-col gap-sm">
        <h3 className="text-headline-sm">Thêm thủ công 1 học sinh</h3>
        <p className="text-body-md text-on-surface-variant">Nhập email học sinh đã đăng ký tài khoản để thêm vào lớp.</p>
        <form onSubmit={addStudent} className="flex flex-col gap-sm sm:flex-row">
          <Input
            name="email" type="email" placeholder="email-hoc-sinh@email.com"
            leadingIcon={<Mail size={20} />}
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" loading={loading} className="sm:w-auto"><UserPlus size={18} /> Thêm</Button>
        </form>
        {msg && (
          <p className={cn("rounded-md px-4 py-2 text-body-md",
            msg.type === "ok" ? "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-error-container text-on-error-container")}>
            {msg.text}
          </p>
        )}
      </Card>

      {students.length === 0 ? (
        <EmptyState icon={Users} title="Lớp chưa có học sinh" description="Thêm học sinh bằng email ở trên, hoặc để học sinh tự đăng ký chọn lớp này." />
      ) : (
        <Card padding="none">
          <div className="border-b border-outline-variant px-lg py-md">
            <h3 className="text-body-md font-bold">Danh sách ({students.length})</h3>
          </div>
          <ul className="divide-y divide-outline-variant">
            {students.map((s) => (
              <li key={s.id} className="flex items-center gap-md px-lg py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed font-display font-bold text-on-primary-fixed">
                  {(s.full_name ?? "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-md font-semibold">{s.full_name ?? "(Chưa có tên)"}</p>
                  <p className="truncate text-label-md text-on-surface-variant">{s.email}</p>
                </div>
                <button onClick={() => removeStudent(s.id)} title="Xoá khỏi lớp"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-error-container hover:text-on-error-container">
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Tab Điểm danh ---------------- */
function AttendanceTab({ classId, students, demo }: { classId: string; students: Student[]; demo: boolean }) {
  const [date, setDate] = useState(today());
  const [att, setAtt] = useState<Record<string, AttStatus>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadAttendance = useCallback(async () => {
    if (demo) { setAtt({ ...(DEMO_ATTENDANCE[classId] ?? {}) }); return; }
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("attendance").select("student_id, status").eq("class_id", classId).eq("date", date);
      const map: Record<string, AttStatus> = {};
      (data ?? []).forEach((r: { student_id: string; status: AttStatus }) => { map[r.student_id] = r.status; });
      setAtt(map);
    } catch { /* noop */ }
  }, [classId, date, demo]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  /** Bulk Action: đánh dấu nhanh cả lớp cùng một trạng thái. */
  function markAll(status: AttStatus) {
    setAtt(Object.fromEntries(students.map((s) => [s.id, status])));
    setSaved(false);
  }

  async function save() {
    setSaving(true); setSaved(false); setErr(null);
    try {
      if (demo) { setSaved(true); return; }
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const rows = students
        .filter((s) => att[s.id])
        .map((s) => ({ class_id: classId, student_id: s.id, date, status: att[s.id], recorded_by: user?.id }));
      if (rows.length > 0) {
        const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "class_id,student_id,date" });
        if (error) { setErr(error.message); return; }
      }
      setSaved(true);
    } catch {
      setErr("Lưu điểm danh thất bại — kiểm tra kết nối máy chủ (xem SETUP.md).");
    } finally { setSaving(false); }
  }

  const STATUSES: { v: AttStatus; label: string; icon: typeof Check; on: string }[] = [
    { v: "present", label: "Có mặt", icon: Check, on: "bg-tertiary text-on-tertiary" },
    { v: "late", label: "Muộn", icon: Clock, on: "bg-secondary text-on-secondary" },
    { v: "absent", label: "Vắng", icon: X, on: "bg-error text-on-error" },
  ];

  if (students.length === 0) {
    return <EmptyState icon={ClipboardCheck} title="Chưa có học sinh để điểm danh" description="Thêm học sinh ở tab Học sinh trước." />;
  }

  return (
    <div className="flex flex-col gap-md">
      <Card className="flex flex-col gap-md">
        <div className="flex flex-wrap items-end justify-between gap-md">
          <Input label="Ngày điểm danh" type="date" value={date} onChange={(e) => { setDate(e.target.value); setSaved(false); }} className="max-w-[200px]" />
          <Button onClick={save} loading={saving}><Save size={18} /> Lưu điểm danh</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant pt-md">
          <span className="text-label-md text-on-surface-variant">Đánh dấu nhanh cả lớp:</span>
          <button onClick={() => markAll("present")} className="rounded-full bg-tertiary-fixed px-3 py-1.5 text-label-md font-semibold text-on-tertiary-fixed hover:opacity-90">Tất cả có mặt</button>
          <button onClick={() => markAll("absent")} className="rounded-full bg-error-container px-3 py-1.5 text-label-md font-semibold text-on-error-container hover:opacity-90">Tất cả vắng</button>
        </div>
      </Card>

      {saved && <p className="rounded-md bg-tertiary-fixed px-4 py-2 text-body-md text-on-tertiary-fixed">✅ Đã lưu điểm danh ngày {new Date(date).toLocaleDateString("vi-VN")}.</p>}
      {err && <p className="rounded-md bg-error-container px-4 py-2 text-body-md text-on-error-container">{err}</p>}

      <Card padding="none">
        <ul className="divide-y divide-outline-variant">
          {students.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-md px-lg py-3">
              <span className="min-w-0 flex-1 truncate text-body-md font-semibold">{s.full_name ?? s.email}</span>
              <div className="flex gap-1">
                {STATUSES.map(({ v, label, icon: Icon, on }) => (
                  <button key={v} onClick={() => { setAtt((a) => ({ ...a, [s.id]: v })); setSaved(false); }}
                    className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-label-md font-semibold transition-colors",
                      att[s.id] === v ? on : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high")}>
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ---------------- Tab Nhận xét ---------------- */
function NotesTab({ classId, students, demo }: { classId: string; students: Student[]; demo: boolean }) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [text, setText] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    if (demo) { setNotes([...(DEMO_NOTES[classId] ?? [])]); return; }
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("teacher_notes").select("id, student_id, note, created_at")
        .eq("class_id", classId).order("created_at", { ascending: false });
      setNotes((data as Note[]) ?? []);
    } catch { /* noop */ }
  }, [classId, demo]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!text.trim() || !studentId) return;
    setSending(true);
    try {
      if (demo) {
        setNotes((prev) => [
          { id: `demo-note-${Date.now()}`, student_id: studentId, note: text.trim(), created_at: new Date().toISOString() },
          ...prev,
        ]);
        setText("");
        return;
      }
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("teacher_notes").insert({
        class_id: classId, student_id: studentId, teacher_id: user?.id, note: text.trim(),
      });
      if (error) { setErr(error.message); return; }
      setText(""); await loadNotes();
    } catch {
      setErr("Gửi nhận xét thất bại — kiểm tra kết nối máy chủ (xem SETUP.md).");
    } finally { setSending(false); }
  }

  const _nameOf = (id: string) => students.find((s) => s.id === id)?.full_name ?? id.slice(0, 8);

  if (students.length === 0) {
    return <EmptyState icon={MessageSquare} title="Chưa có học sinh để nhận xét" description="Thêm học sinh ở tab Học sinh trước." />;
  }

  return (
    <div className="flex flex-col gap-md">
      <Card className="flex flex-col gap-sm">
        <h3 className="text-headline-sm">Viết nhận xét</h3>
        <p className="text-body-md text-on-surface-variant">Nhận xét sẽ hiển thị cho phụ huynh của học sinh này.</p>
        <form onSubmit={addNote} className="flex flex-col gap-sm">
          <Select label="Học sinh" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name ?? s.email}</option>)}
          </Select>
          <textarea
            value={text} onChange={(e) => setText(e.target.value)} rows={3}
            placeholder="VD: Em tiến bộ tốt phần luyện nghe, cần luyện thêm phát âm..."
            className="w-full resize-none rounded-lg border border-outline-variant bg-surface-container-lowest p-3 text-body-lg outline-none focus:border-primary"
          />
          {err && <p className="rounded-md bg-error-container px-4 py-2 text-body-md text-on-error-container">{err}</p>}
          <div className="flex justify-end">
            <Button type="submit" loading={sending} disabled={!text.trim()}><Send size={16} /> Gửi nhận xét</Button>
          </div>
        </form>
      </Card>

      {notes.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Chưa có nhận xét nào" description="Các nhận xét bạn viết sẽ hiện ở đây." />
      ) : (
        <div className="flex flex-col gap-sm">
          {notes.map((n) => (
            <Card key={n.id} padding="md" className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-body-md font-semibold text-primary">{_nameOf(n.student_id)}</span>
                <span className="text-label-sm text-on-surface-variant">{new Date(n.created_at).toLocaleDateString("vi-VN")}</span>
              </div>
              <p className="whitespace-pre-wrap text-body-md text-on-surface">{n.note}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Tab Lịch sử điểm danh ---------------- */
interface AttRow { student_id: string; date: string; status: AttStatus }

function AttendanceHistoryTab({ classId, students, demo }: { classId: string; students: Student[]; demo: boolean }) {
  const [rows, setRows] = useState<AttRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStudent, setFilterStudent] = useState("all");
  const [filterMonth, setFilterMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (demo) {
          setRows([]);
          return;
        }
        const supabase = createClient();
        const monthStart = `${filterMonth}-01`;
        const nextMonth = new Date(filterMonth + "-01");
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const monthEnd = nextMonth.toISOString().slice(0, 10);
        const { data } = await supabase
          .from("attendance")
          .select("student_id, date, status")
          .eq("class_id", classId)
          .gte("date", monthStart)
          .lt("date", monthEnd)
          .order("date", { ascending: false });
        setRows((data as AttRow[]) ?? []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [classId, demo, filterMonth]);

  if (students.length === 0) {
    return <EmptyState icon={History} title="Chưa có học sinh" description="Thêm học sinh ở tab Học sinh trước." />;
  }

  const STATUS_LABEL: Record<AttStatus, string> = { present: "Có mặt", absent: "Vắng", late: "Muộn" };
  const STATUS_COLOR: Record<AttStatus, string> = {
    present: "bg-tertiary-fixed text-on-tertiary-fixed",
    absent: "bg-error-container text-on-error-container",
    late: "bg-secondary-fixed text-on-secondary-fixed",
  };

  const filtered = rows.filter((r) => filterStudent === "all" || r.student_id === filterStudent);
  const dates = [...new Set(filtered.map((r) => r.date))].sort((a, b) => b.localeCompare(a));

  const rowMap = new Map<string, Map<string, AttStatus>>();
  filtered.forEach((r) => {
    if (!rowMap.has(r.date)) rowMap.set(r.date, new Map());
    rowMap.get(r.date)!.set(r.student_id, r.status);
  });

  const displayStudents = filterStudent === "all" ? students : students.filter((s) => s.id === filterStudent);

  return (
    <div className="flex flex-col gap-md">
      {/* Filter */}
      <Card className="flex flex-wrap gap-md">
        <Input
          type="month"
          label="Tháng"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="max-w-[180px]"
        />
        <Select
          label="Học sinh"
          value={filterStudent}
          onChange={(e) => setFilterStudent(e.target.value)}
          className="max-w-[240px]"
        >
          <option value="all">Tất cả học sinh</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.full_name ?? s.email}</option>
          ))}
        </Select>
      </Card>

      {loading ? (
        <p className="py-lg text-center text-body-md text-on-surface-variant">Đang tải…</p>
      ) : dates.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Chưa có dữ liệu điểm danh" description={`Tháng ${filterMonth} chưa có điểm danh nào được lưu.`} />
      ) : (
        <>
          {/* Tổng kết */}
          <div className="grid grid-cols-3 gap-md">
            {[
              { label: "Buổi học", value: dates.length, color: "text-primary" },
              { label: "Lượt có mặt", value: filtered.filter((r) => r.status === "present").length, color: "text-tertiary" },
              { label: "Lượt vắng", value: filtered.filter((r) => r.status === "absent").length, color: "text-error" },
            ].map((s) => (
              <Card key={s.label} padding="md" className="text-center">
                <p className={`font-display text-display-sm ${s.color}`}>{s.value}</p>
                <p className="text-label-md text-on-surface-variant">{s.label}</p>
              </Card>
            ))}
          </div>

          {/* Bảng ma trận ngày × học sinh */}
          <Card padding="none" className="overflow-x-auto">
            <table className="w-full text-body-md">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  <th className="px-lg py-3 text-left font-semibold text-on-surface-variant">Ngày</th>
                  {(filterStudent === "all" ? students : students.filter((s) => s.id === filterStudent)).map((s) => (
                    <th key={s.id} className="px-md py-3 text-center font-semibold text-on-surface-variant whitespace-nowrap">
                      {s.full_name ?? s.email}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {dates.map((date) => {
                  const dayMap = rowMap.get(date) ?? new Map();
                  return (
                    <tr key={date} className="hover:bg-surface-container-low">
                      <td className="px-lg py-3 font-semibold whitespace-nowrap">
                        {new Date(date + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}
                      </td>
                      {(filterStudent === "all" ? students : students.filter((s) => s.id === filterStudent)).map((s) => {
                        const st = dayMap.get(s.id) as AttStatus | undefined;
                        return (
                          <td key={s.id} className="px-md py-3 text-center">
                            {st ? (
                              <span className={cn("rounded-full px-2 py-0.5 text-label-sm font-medium", STATUS_COLOR[st])}>
                                {STATUS_LABEL[st]}
                              </span>
                            ) : (
                              <span className="text-label-sm text-on-surface-variant">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

/* ---------------- Tab Cảnh báo (Flag Engine) ---------------- */
interface MetricsRow {
  student_id: string;
  study_minutes_week: number;
  listens_week: number;
  days_since_active: number;
  avg_score: number | null;
}

function FlagsTab({ classId, students, demo }: { classId: string; students: Student[]; demo: boolean }) {
  const [rows, setRows] = useState<MetricsRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (demo) {
          setRows(students.map((s, i) => ({
            student_id: s.id,
            study_minutes_week: i % 3 === 0 ? 5 : i % 3 === 1 ? 45 : 70,
            listens_week: i % 3 === 0 ? 1 : i % 3 === 1 ? 2 : 5,
            days_since_active: i % 3 === 0 ? 10 : 1,
            avg_score: i % 3 === 2 ? 80 : i % 3 === 1 ? 42 : null,
          })));
          return;
        }
        const supabase = createClient();
        const { data } = await supabase.rpc("get_class_student_metrics", { p_class_id: classId });
        setRows((data as MetricsRow[]) ?? []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [classId, demo, students]);

  if (students.length === 0) {
    return <EmptyState icon={AlertTriangle} title="Chưa có học sinh để phân tích" description="Thêm học sinh ở tab Học sinh trước." />;
  }

  if (loading) {
    return <div className="py-lg text-center text-body-md text-on-surface-variant">Đang phân tích dữ liệu…</div>;
  }

  const metricsMap = new Map(rows.map((r) => [r.student_id, r]));

  const analyzed = students.map((s) => {
    const m = metricsMap.get(s.id);
    const metrics: StudentMetrics = {
      studyMinutesWeek: m?.study_minutes_week ?? 0,
      goalMinutesWeek: 60,
      listensWeek: m?.listens_week ?? 0,
      daysSinceActive: m?.days_since_active ?? 999,
      avgScore: m?.avg_score ?? null,
    };
    return { student: s, flags: computeFlags(metrics), metrics };
  }).sort((a, b) => b.flags.length - a.flags.length);

  const flagCount = analyzed.filter((x) => x.flags.length > 0).length;

  const FLAG_STYLE: Record<string, string> = {
    red: "bg-error-container text-on-error-container",
    warn: "bg-secondary-fixed text-on-secondary-fixed",
    headphone: "bg-tertiary-fixed text-on-tertiary-fixed",
  };

  return (
    <div className="flex flex-col gap-md">
      <Card className="flex items-center gap-md">
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary-fixed text-secondary">
          <AlertTriangle size={22} />
        </span>
        <div>
          <p className="text-body-md font-semibold">{flagCount} học sinh cần chú ý</p>
          <p className="text-label-sm text-on-surface-variant">
            Trong {students.length} học sinh — dựa trên dữ liệu 7 ngày qua.
          </p>
        </div>
      </Card>

      {analyzed.map(({ student: s, flags, metrics }) => (
        <Card key={s.id} padding="md" className="flex flex-col gap-sm">
          <div className="flex flex-wrap items-center justify-between gap-sm">
            <div className="flex items-center gap-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-fixed font-display text-label-md font-bold text-on-primary-fixed">
                {(s.full_name ?? "?").charAt(0).toUpperCase()}
              </span>
              <p className="text-body-md font-semibold">{s.full_name ?? s.email}</p>
            </div>
            {flags.length === 0 ? (
              <span className="rounded-full bg-tertiary-fixed px-3 py-1 text-label-sm text-on-tertiary-fixed">Bình thường ✓</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {flags.map((f) => (
                  <span key={f.key} className={cn("rounded-full px-3 py-1 text-label-sm font-medium", FLAG_STYLE[f.severity] ?? "bg-surface-container")}>
                    {f.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-sm text-center">
            <div className="rounded-md bg-surface-container-low p-2">
              <p className="font-display text-headline-sm text-primary">{metrics.studyMinutesWeek}&apos;</p>
              <p className="text-label-sm text-on-surface-variant">Phút / tuần</p>
            </div>
            <div className="rounded-md bg-surface-container-low p-2">
              <p className="font-display text-headline-sm text-secondary">{metrics.listensWeek}</p>
              <p className="text-label-sm text-on-surface-variant">Lượt nghe</p>
            </div>
            <div className="rounded-md bg-surface-container-low p-2">
              <p className="font-display text-headline-sm text-tertiary">
                {metrics.daysSinceActive >= 999 ? "—" : `${metrics.daysSinceActive}d`}
              </p>
              <p className="text-label-sm text-on-surface-variant">Ngày nghỉ</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- Tab Giáo viên (Co-teacher) ---------------- */
interface TeacherRow { teacher_id: string; full_name: string | null; email: string | null; role: string }

function TeachersTab({ classId, demo }: { classId: string; demo: boolean }) {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const loadTeachers = useCallback(async () => {
    setFetching(true);
    try {
      if (demo) { setTeachers([]); return; }
      const supabase = createClient();
      const { data } = await supabase
        .from("class_teachers")
        .select("teacher_id, role, profiles:teacher_id(full_name, email)")
        .eq("class_id", classId);
      const rows = ((data ?? []) as unknown as Array<{
        teacher_id: string; role: string;
        profiles: { full_name: string | null; email: string | null } | null;
      }>).map((r) => ({
        teacher_id: r.teacher_id,
        full_name: r.profiles?.full_name ?? null,
        email: r.profiles?.email ?? null,
        role: r.role,
      }));
      setTeachers(rows);
    } finally {
      setFetching(false);
    }
  }, [classId, demo]);

  useEffect(() => { loadTeachers(); }, [loadTeachers]);

  async function addTeacher(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!email.trim()) return;
    setLoading(true);
    try {
      if (demo) {
        setMsg({ type: "ok", text: "Đã mời giáo viên (xem thử)." });
        setEmail("");
        return;
      }
      const supabase = createClient();
      const { data, error } = await supabase.rpc("add_teacher_by_email", {
        p_class_id: classId,
        p_email: email.trim(),
      });
      if (error) { setMsg({ type: "err", text: error.message }); return; }
      const name = (data as { full_name: string }[] | null)?.[0]?.full_name ?? "Giáo viên";
      setMsg({ type: "ok", text: `Đã thêm ${name} làm đồng giáo viên.` });
      setEmail("");
      await loadTeachers();
    } catch {
      setMsg({ type: "err", text: "Không kết nối được máy chủ." });
    } finally {
      setLoading(false);
    }
  }

  async function removeTeacher(teacherId: string) {
    if (demo) return;
    try {
      const supabase = createClient();
      await supabase
        .from("class_teachers")
        .delete()
        .eq("class_id", classId)
        .eq("teacher_id", teacherId)
        .neq("role", "owner");
      await loadTeachers();
    } catch { /* noop */ }
  }

  return (
    <div className="flex flex-col gap-md">
      <Card className="flex flex-col gap-sm">
        <h3 className="text-headline-sm">Thêm đồng giáo viên</h3>
        <p className="text-body-md text-on-surface-variant">
          Nhập email giáo viên đã có tài khoản để cùng quản lý lớp này.
        </p>
        <form onSubmit={addTeacher} className="flex flex-col gap-sm sm:flex-row">
          <Input
            name="email" type="email" placeholder="email-giaovien@email.com"
            leadingIcon={<Mail size={20} />}
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" loading={loading} className="sm:w-auto">
            <UserCog size={18} /> Thêm
          </Button>
        </form>
        {msg && (
          <p className={cn("rounded-md px-4 py-2 text-body-md",
            msg.type === "ok" ? "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-error-container text-on-error-container")}>
            {msg.text}
          </p>
        )}
      </Card>

      {fetching ? (
        <p className="py-lg text-center text-body-md text-on-surface-variant">Đang tải…</p>
      ) : teachers.length === 0 ? (
        <EmptyState icon={UserCog} title="Chưa có đồng giáo viên" description="Thêm giáo viên bằng email ở trên để cùng quản lý lớp." />
      ) : (
        <Card padding="none">
          <div className="border-b border-outline-variant px-lg py-md">
            <h3 className="text-body-md font-bold">Giáo viên lớp này ({teachers.length})</h3>
          </div>
          <ul className="divide-y divide-outline-variant">
            {teachers.map((t) => (
              <li key={t.teacher_id} className="flex items-center gap-md px-lg py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-fixed font-display font-bold text-on-secondary-fixed">
                  {(t.full_name ?? "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-md font-semibold">{t.full_name ?? "(Chưa có tên)"}</p>
                  <p className="truncate text-label-md text-on-surface-variant">{t.email}</p>
                </div>
                <span className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-label-sm font-medium",
                  t.role === "owner" ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-container text-on-surface-variant",
                )}>
                  {t.role === "owner" ? "Chủ lớp" : "Đồng GV"}
                </span>
                {t.role !== "owner" && (
                  <button onClick={() => removeTeacher(t.teacher_id)} title="Xoá khỏi lớp"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-error-container hover:text-on-error-container">
                    <Trash2 size={18} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
