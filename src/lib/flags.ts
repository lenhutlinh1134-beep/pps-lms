// ============================================================
// FLAG ENGINE — Cảnh báo thông minh (mục 2.7 trong CLAUDE.md).
// Hàm THUẦN (không gọi DB) để dễ kiểm thử & tái dùng ở cả server lẫn client.
// Trang báo cáo tổng hợp số liệu từ `student_logs` + `attendance` thành
// `StudentMetrics` rồi gọi computeFlags() để gắn cờ.
// ============================================================

export type FlagSeverity = "red" | "warn" | "headphone";

export interface Flag {
  /** mã ổn định để render key */
  key: "duration" | "listen" | "inactive" | "progress";
  severity: FlagSeverity;
  /** nhãn ngắn hiển thị trên chip */
  label: string;
  /** mô tả chi tiết (tooltip / dòng phụ) */
  detail: string;
}

export interface StudentMetrics {
  /** tổng số phút học trong tuần */
  studyMinutesWeek: number;
  /** mục tiêu số phút học/tuần (yêu cầu) */
  goalMinutesWeek: number;
  /** số lượt luyện nghe trong tuần */
  listensWeek: number;
  /** số ngày kể từ lần hoạt động gần nhất */
  daysSinceActive: number;
  /** điểm trung bình 0–1 (từ student_logs.score, null nếu chưa có bài chấm điểm) */
  avgScore: number | null;
}

// Ngưỡng theo bảng cảnh báo trong CLAUDE.md — gom 1 chỗ để dễ chỉnh.
export const FLAG_THRESHOLDS = {
  durationRatio: 0.3, // < 30% thời lượng yêu cầu
  minListensWeek: 3, // < 3 bài nghe/tuần
  inactiveDays: 7, // không hoạt động > 7 ngày
  minAvgScore: 0.5, // điểm TB < 50% (student_logs.score lưu dạng 0–1)
} as const;

/** Tính danh sách cờ cảnh báo cho 1 học sinh từ số liệu đã tổng hợp. */
export function computeFlags(m: StudentMetrics): Flag[] {
  const flags: Flag[] = [];

  // 🔴 Thời lượng học không đạt (< 30% mục tiêu tuần)
  if (m.goalMinutesWeek > 0 && m.studyMinutesWeek < m.goalMinutesWeek * FLAG_THRESHOLDS.durationRatio) {
    flags.push({
      key: "duration",
      severity: "red",
      label: "Thời lượng thấp",
      detail: `Mới học ${m.studyMinutesWeek}' / mục tiêu ${m.goalMinutesWeek}' tuần này.`,
    });
  }

  // 🎧 Luyện nghe không đủ (< 3 bài/tuần)
  if (m.listensWeek < FLAG_THRESHOLDS.minListensWeek) {
    flags.push({
      key: "listen",
      severity: "headphone",
      label: "Nghe chưa đủ",
      detail: `Mới ${m.listensWeek}/${FLAG_THRESHOLDS.minListensWeek} bài nghe trong tuần.`,
    });
  }

  // 🔴 Không hoạt động > 7 ngày
  if (m.daysSinceActive > FLAG_THRESHOLDS.inactiveDays) {
    flags.push({
      key: "inactive",
      severity: "red",
      label: "Lâu không học",
      detail: `Không hoạt động ${m.daysSinceActive} ngày.`,
    });
  }

  // ⚠️ Tiến độ thấp (điểm TB < 50%)
  if (m.avgScore != null && m.avgScore < FLAG_THRESHOLDS.minAvgScore) {
    flags.push({
      key: "progress",
      severity: "warn",
      label: "Tiến độ thấp",
      detail: `Điểm trung bình ${Math.round(m.avgScore * 100)}%.`,
    });
  }

  return flags;
}

/** Mức độ ưu tiên để sắp xếp HS "cần chú ý nhất" lên đầu. */
export function flagWeight(flags: Flag[]): number {
  return flags.reduce((sum, f) => sum + (f.severity === "red" ? 3 : f.severity === "warn" ? 2 : 1), 0);
}
