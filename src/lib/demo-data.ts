// ============================================================
// DỮ LIỆU MẪU CHO CHẾ ĐỘ "XEM THỬ" (DEMO) — chỉ minh hoạ, KHÔNG lưu thật.
// Hiển thị khi đăng nhập bằng cửa sau demo (profile.id bắt đầu "demo-").
// Tự ẩn ở production vì demo tắt khi NODE_ENV=production (xem src/lib/demo.ts).
// 🗑️ Gỡ bỏ: xoá file này + các nhánh `isDemo`/prop `demo` ở 5 file teacher
//    (page.tsx, classes/, classes/[id]/, lectures/) và ClassManager.tsx.
// ============================================================

import type { LectureItem } from "@/components/lectures/LectureGrid";

export interface DemoStudent { id: string; full_name: string; email: string }
export interface DemoNote { id: string; student_id: string; note: string; created_at: string }
export type DemoAttStatus = "present" | "absent" | "late";

export interface DemoClass {
  id: string;
  name: string;
  year: string;
  level: string;
  school: { name: string };
  role: "owner" | "co_teacher";
}

const SCHOOL = { name: "THCS Nguyễn Du" };
const YEAR = "2025–2026";

export const DEMO_TEACHER_NAME = "Cô Trần Thu Hà";

export const CLASS_6A = "demo-class-6a";
export const CLASS_7B = "demo-class-7b";

export const DEMO_CLASSES: DemoClass[] = [
  { id: CLASS_6A, name: "Lớp 6A — Tiếng Anh giao tiếp", year: YEAR, level: "A2", school: SCHOOL, role: "owner" },
  { id: CLASS_7B, name: "Lớp 7B — Luyện thi PET", year: YEAR, level: "B1", school: SCHOOL, role: "owner" },
];

export const DEMO_STUDENTS: Record<string, DemoStudent[]> = {
  [CLASS_6A]: [
    { id: "demo-s1", full_name: "Nguyễn Minh An", email: "minhan@pps.edu.vn" },
    { id: "demo-s2", full_name: "Trần Bảo Châu", email: "baochau@pps.edu.vn" },
    { id: "demo-s3", full_name: "Lê Gia Huy", email: "giahuy@pps.edu.vn" },
    { id: "demo-s4", full_name: "Phạm Khánh Linh", email: "khanhlinh@pps.edu.vn" },
    { id: "demo-s5", full_name: "Hoàng Nhật Minh", email: "nhatminh@pps.edu.vn" },
    { id: "demo-s6", full_name: "Vũ Thảo Nguyên", email: "thaonguyen@pps.edu.vn" },
    { id: "demo-s7", full_name: "Đỗ Quang Vinh", email: "quangvinh@pps.edu.vn" },
    { id: "demo-s8", full_name: "Bùi Yến Nhi", email: "yennhi@pps.edu.vn" },
  ],
  [CLASS_7B]: [
    { id: "demo-s9", full_name: "Đặng Hải Đăng", email: "haidang@pps.edu.vn" },
    { id: "demo-s10", full_name: "Ngô Phương Anh", email: "phuonganh@pps.edu.vn" },
    { id: "demo-s11", full_name: "Dương Tuấn Kiệt", email: "tuankiet@pps.edu.vn" },
    { id: "demo-s12", full_name: "Lý Mai Chi", email: "maichi@pps.edu.vn" },
    { id: "demo-s13", full_name: "Trịnh Đức Anh", email: "ducanh@pps.edu.vn" },
  ],
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000).toISOString();

// Video demo — dùng video BBC Learning English & EnglishClass101 công khai trên YouTube.
// Thay bằng video thật của trung tâm trước khi demo cho khách hàng.
export const DEMO_LECTURES: LectureItem[] = [
  {
    id: "demo-l1", title: "Present Simple — Thì hiện tại đơn", type: "video",
    teacher_name: DEMO_TEACHER_NAME, created_at: daysAgo(1),
    content_url: "https://www.youtube.com/watch?v=BCMeLAQT4Sw",  // BBC 6 Minute English
    class: { name: "Lớp 6A — Tiếng Anh giao tiếp" },
  },
  {
    id: "demo-l2", title: "Từ vựng chủ đề Gia đình (Family)", type: "video",
    teacher_name: DEMO_TEACHER_NAME, created_at: daysAgo(2),
    content_url: "https://www.youtube.com/watch?v=YbNmL6hSNKg",  // BBC Learning English
    class: { name: "Lớp 6A — Tiếng Anh giao tiếp" },
  },
  {
    id: "demo-l3", title: "Ngữ pháp Unit 5 — Tài liệu ôn tập", type: "theory",
    teacher_name: DEMO_TEACHER_NAME, created_at: daysAgo(3),
    content_url: "https://www.bbc.co.uk/learningenglish/english/course/lower-intermediate",
    class: { name: "Lớp 6A — Tiếng Anh giao tiếp" },
  },
  {
    id: "demo-l4", title: "PET Listening Part 1 — Hướng dẫn làm bài", type: "video",
    teacher_name: DEMO_TEACHER_NAME, created_at: daysAgo(2),
    content_url: "https://www.youtube.com/watch?v=9bZkp7q19f0",  // thay bằng video PET thật
    class: { name: "Lớp 7B — Luyện thi PET" },
  },
  {
    id: "demo-l5", title: "PET Reading — Chiến lược đọc hiểu", type: "theory",
    teacher_name: DEMO_TEACHER_NAME, created_at: daysAgo(5),
    content_url: null,
    class: { name: "Lớp 7B — Luyện thi PET" },
  },
  {
    id: "demo-l6", title: "Phát âm: âm /θ/ và /ð/ (th sounds)", type: "video",
    teacher_name: DEMO_TEACHER_NAME, created_at: daysAgo(6),
    content_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",  // thay bằng video phát âm thật
    class: { name: "Lớp 7B — Luyện thi PET" },
  },
];

export const DEMO_ATTENDANCE: Record<string, Record<string, DemoAttStatus>> = {
  [CLASS_6A]: {
    "demo-s1": "present", "demo-s2": "present", "demo-s3": "late",
    "demo-s4": "present", "demo-s5": "absent", "demo-s6": "present",
    "demo-s7": "present", "demo-s8": "present",
  },
  [CLASS_7B]: {
    "demo-s9": "present", "demo-s10": "present", "demo-s11": "present",
    "demo-s12": "late", "demo-s13": "present",
  },
};

export const DEMO_NOTES: Record<string, DemoNote[]> = {
  [CLASS_6A]: [
    { id: "demo-n1", student_id: "demo-s1", note: "An tiến bộ rõ phần luyện nghe, phát âm tự tin hơn. Cần luyện thêm thì quá khứ.", created_at: daysAgo(1) },
    { id: "demo-n2", student_id: "demo-s5", note: "Nhật Minh nghỉ học 2 buổi liên tiếp, phụ huynh lưu ý nhắc con vào học đều.", created_at: daysAgo(2) },
    { id: "demo-n3", student_id: "demo-s2", note: "Bảo Châu làm bài tập về nhà đầy đủ, tích cực phát biểu.", created_at: daysAgo(4) },
  ],
  [CLASS_7B]: [
    { id: "demo-n4", student_id: "demo-s9", note: "Hải Đăng cần ôn lại phần Listening Part 2, hay nhầm chi tiết.", created_at: daysAgo(1) },
  ],
};

export const DEMO_TEACHER_STATS = { classes: 2, students: 13, online: 4, flags: 2 };

// ─── Demo Student stats ───────────────────────────────────────────────────────
export const DEMO_STUDENT_STATS = {
  study_minutes_week: 45,
  listens_week: 3,
  points_total: 180,
  streak_days: 5,
};

export interface DemoAssignment {
  id: string;
  title: string;
  class_id: string;
  class_name: string;
  created_at: string;
  score: number | null; // null = chưa nộp
}

export const DEMO_STUDENT_ASSIGNMENTS: DemoAssignment[] = [
  { id: "demo-a1", title: "Bài tập Unit 5 — Từ vựng Gia đình", class_id: CLASS_6A, class_name: "Lớp 6A — Tiếng Anh giao tiếp", created_at: new Date(Date.now() - 3 * 86400_000).toISOString(), score: 85 },
  { id: "demo-a2", title: "Nghe hiểu — CLOTHES, FEELINGS AND SHOPPING", class_id: CLASS_6A, class_name: "Lớp 6A — Tiếng Anh giao tiếp", created_at: new Date(Date.now() - 1 * 86400_000).toISOString(), score: null },
];

// ─── Demo Parent data ─────────────────────────────────────────────────────────
export interface DemoChildRow {
  student_id: string;
  full_name: string;
  email: string;
  avatar_url: null;
  last_seen: string | null;
  class_names: string[];
}

export const DEMO_PARENT_CHILDREN: DemoChildRow[] = [
  {
    student_id: "demo-s1",
    full_name: "Nguyễn Minh An",
    email: "minhan@pps.edu.vn",
    avatar_url: null,
    last_seen: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // online 2 phút trước
    class_names: ["Lớp 6A — Tiếng Anh giao tiếp"],
  },
];

export interface DemoNoteRow {
  id: string;
  note: string;
  created_at: string;
  student_id: string;
  student_name: string;
  class_name: string;
}

export const DEMO_PARENT_NOTES: DemoNoteRow[] = [
  { id: "demo-n1", note: "Minh An tiến bộ rõ rệt trong phát âm. Cần luyện thêm phần nghe để cải thiện tốc độ hiểu.", created_at: new Date(Date.now() - 1 * 86400_000).toISOString(), student_id: "demo-s1", student_name: "Nguyễn Minh An", class_name: "Lớp 6A" },
  { id: "demo-n2", note: "An hoàn thành đầy đủ bài tập Unit 5. Điểm bài kiểm tra: 8.5/10. Giỏi!", created_at: new Date(Date.now() - 3 * 86400_000).toISOString(), student_id: "demo-s1", student_name: "Nguyễn Minh An", class_name: "Lớp 6A" },
  { id: "demo-n3", note: "An nghỉ buổi học thứ 4 tuần trước. Đã bù bài. Phụ huynh lưu ý theo dõi việc học ở nhà.", created_at: new Date(Date.now() - 7 * 86400_000).toISOString(), student_id: "demo-s1", student_name: "Nguyễn Minh An", class_name: "Lớp 6A" },
];

export interface DemoAttRow {
  student_id: string;
  date: string;
  status: "present" | "absent" | "late";
}

export const DEMO_PARENT_ATTENDANCE: DemoAttRow[] = [
  { student_id: "demo-s1", date: new Date(Date.now() - 0 * 86400_000).toISOString().slice(0, 10), status: "present" },
  { student_id: "demo-s1", date: new Date(Date.now() - 2 * 86400_000).toISOString().slice(0, 10), status: "present" },
  { student_id: "demo-s1", date: new Date(Date.now() - 4 * 86400_000).toISOString().slice(0, 10), status: "present" },
  { student_id: "demo-s1", date: new Date(Date.now() - 6 * 86400_000).toISOString().slice(0, 10), status: "absent" },
  { student_id: "demo-s1", date: new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10), status: "present" },
];

/** Một người dùng có phải đang ở chế độ xem thử không (id dạng "demo-..."). */
export const isDemoId = (id: string) => id.startsWith("demo-");

export const demoClass = (id: string) => DEMO_CLASSES.find((c) => c.id === id) ?? null;
export const demoStudents = (id: string): DemoStudent[] => DEMO_STUDENTS[id] ?? [];

// ─── Demo Schedule ────────────────────────────────────────────────────────────
export interface DemoSessionRow {
  id: string;
  class_id: string;
  class_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
}

export const DEMO_SESSIONS: DemoSessionRow[] = [
  { id: "demo-sess-1", class_id: CLASS_6A, class_name: "Lớp 6A — Tiếng Anh giao tiếp", day_of_week: 2, start_time: "08:00:00", end_time: "09:30:00", room: "Phòng 201" },
  { id: "demo-sess-2", class_id: CLASS_6A, class_name: "Lớp 6A — Tiếng Anh giao tiếp", day_of_week: 4, start_time: "08:00:00", end_time: "09:30:00", room: "Phòng 201" },
  { id: "demo-sess-3", class_id: CLASS_6A, class_name: "Lớp 6A — Tiếng Anh giao tiếp", day_of_week: 6, start_time: "09:00:00", end_time: "10:30:00", room: null },
  { id: "demo-sess-4", class_id: CLASS_7B, class_name: "Lớp 7B — Luyện thi PET", day_of_week: 3, start_time: "14:00:00", end_time: "15:45:00", room: "Phòng 305" },
  { id: "demo-sess-5", class_id: CLASS_7B, class_name: "Lớp 7B — Luyện thi PET", day_of_week: 5, start_time: "14:00:00", end_time: "15:45:00", room: "Phòng 305" },
  { id: "demo-sess-6", class_id: CLASS_7B, class_name: "Lớp 7B — Luyện thi PET", day_of_week: 7, start_time: "07:30:00", end_time: "09:00:00", room: "Online (Zoom)" },
];
