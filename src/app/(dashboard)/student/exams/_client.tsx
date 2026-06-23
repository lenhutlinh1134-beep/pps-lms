"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Headphones, Clock, CheckCircle, Play, RotateCcw, ChevronRight } from "lucide-react";

interface AttemptInfo {
  count: number;
  lastBand: number | null;
  lastScore: number | null;
  hasUnfinished: boolean;
}

interface Exam {
  id: string;
  title: string;
  description: string | null;
  skill: string;
  exam_type: string;
  duration_minutes: number;
  total_questions: number;
  is_published: boolean;
  thumbnail_url: string | null;
  created_at: string;
  attemptInfo: AttemptInfo | null;
}

const SKILL_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  reading:   { label: "Reading",   icon: <BookOpen size={14} />,    color: "bg-blue-100 text-blue-700" },
  listening: { label: "Listening", icon: <Headphones size={14} />,  color: "bg-purple-100 text-purple-700" },
  full:      { label: "Full Test", icon: <BookOpen size={14} />,    color: "bg-green-100 text-green-700" },
};

const TYPE_LABELS: Record<string, string> = {
  ielts:    "IELTS",
  ket:      "KET",
  pet:      "PET",
  toeic:    "TOEIC",
  internal: "Nội bộ",
};

function BandBadge({ band }: { band: number }) {
  const color = band >= 7 ? "text-green-600 bg-green-50" : band >= 5.5 ? "text-yellow-600 bg-yellow-50" : "text-red-600 bg-red-50";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
      Band {band.toFixed(1)}
    </span>
  );
}

function ExamCard({ exam, onStart }: { exam: Exam; onStart: (exam: Exam) => void }) {
  const skill = SKILL_LABELS[exam.skill] ?? SKILL_LABELS.reading;
  const { attemptInfo: ai } = exam;
  const done = ai && ai.count > 0 && !ai.hasUnfinished;
  const unfinished = ai?.hasUnfinished;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
      {/* Thumbnail / Header */}
      <div className="h-3 bg-gradient-to-r from-[#6b38d4] to-[#b4136d]" />

      <div className="p-5">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${skill.color}`}>
            {skill.icon}{skill.label}
          </span>
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {TYPE_LABELS[exam.exam_type] ?? exam.exam_type.toUpperCase()}
          </span>
          {unfinished && (
            <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full animate-pulse">
              Đang làm dở
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 text-base leading-snug mb-1 group-hover:text-[#6b38d4] transition-colors">
          {exam.title}
        </h3>
        {exam.description && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">{exam.description}</p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          <span className="flex items-center gap-1">
            <Clock size={12} /> {exam.duration_minutes} phút
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle size={12} /> {exam.total_questions} câu
          </span>
          {ai && ai.count > 0 && (
            <span className="flex items-center gap-1">
              <RotateCcw size={12} /> {ai.count} lần làm
            </span>
          )}
        </div>

        {/* Last score */}
        {ai?.lastBand && (
          <div className="flex items-center gap-2 mb-4">
            <BandBadge band={ai.lastBand} />
            {ai.lastScore !== null && (
              <span className="text-xs text-gray-400">{ai.lastScore}% lần gần nhất</span>
            )}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={() => onStart(exam)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all
            bg-[#6b38d4] text-white hover:opacity-90 active:scale-95"
        >
          {unfinished ? (
            <><RotateCcw size={15} /> Tiếp tục làm</>
          ) : done ? (
            <><RotateCcw size={15} /> Làm lại</>
          ) : (
            <><Play size={15} /> Bắt đầu làm bài</>
          )}
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

export function StudentExamsClient() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter]   = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [starting, setStarting] = useState<string | null>(null);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (skillFilter !== "all") params.set("skill", skillFilter);
      if (typeFilter !== "all")  params.set("exam_type", typeFilter);
      const res = await fetch(`/api/exams?${params}`);
      const data = await res.json() as { exams?: Exam[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Lỗi tải danh sách đề");
      setExams(data.exams ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  }, [skillFilter, typeFilter]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  async function handleStart(exam: Exam) {
    setStarting(exam.id);
    try {
      const res = await fetch(`/api/exams/${exam.id}/attempt`, { method: "POST" });
      const data = await res.json() as { attemptId?: string; error?: string };
      if (!res.ok || !data.attemptId) throw new Error(data.error ?? "Không thể bắt đầu");
      router.push(`/student/exams/${exam.id}/take?attempt=${data.attemptId}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Lỗi khi bắt đầu bài thi");
      setStarting(null);
    }
  }

  // Filter client-side by status
  const filtered = exams.filter((e) => {
    if (statusFilter === "unfinished") return e.attemptInfo?.hasUnfinished || !e.attemptInfo?.count;
    if (statusFilter === "finished")   return e.attemptInfo?.count && !e.attemptInfo?.hasUnfinished;
    return true;
  });

  return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Luyện đề thi</h1>
          <p className="text-gray-500 text-sm mt-1">Luyện tập các đề thi IELTS, KET, PET như thi thật với hệ thống chấm điểm tự động</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {/* Skill */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
            {["all","reading","listening"].map((s) => (
              <button
                key={s}
                onClick={() => setSkillFilter(s)}
                className={`px-3 py-1.5 font-medium transition-colors ${skillFilter === s ? "bg-[#6b38d4] text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {s === "all" ? "Tất cả" : s === "reading" ? "Reading" : "Listening"}
              </button>
            ))}
          </div>

          {/* Type */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
            {["all","ielts","ket","pet","toeic","internal"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 font-medium transition-colors ${typeFilter === t ? "bg-[#6b38d4] text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {t === "all" ? "Tất cả" : TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Status */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
            {[
              { value: "all",        label: "Tất cả" },
              { value: "unfinished", label: "Chưa làm / đang làm" },
              { value: "finished",   label: "Đã hoàn thành" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 font-medium transition-colors ${statusFilter === opt.value ? "bg-[#6b38d4] text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 h-56 animate-pulse">
                <div className="h-3 bg-gray-200 rounded-t-2xl" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500">{error}</p>
            <button onClick={fetchExams} className="mt-3 text-sm text-[#6b38d4] underline">Thử lại</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Chưa có đề thi nào</p>
            <p className="text-gray-400 text-sm mt-1">Giáo viên sẽ thêm đề thi sớm</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((exam) => (
              <div key={exam.id} className={starting === exam.id ? "opacity-60 pointer-events-none" : ""}>
                <ExamCard exam={exam} onStart={handleStart} />
              </div>
            ))}
          </div>
        )}
      </div>
  );
}
