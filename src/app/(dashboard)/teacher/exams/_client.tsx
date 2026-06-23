"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, BookOpen, Headphones, Clock, Users, Eye, EyeOff, ChevronRight, FileUp } from "lucide-react";

interface Exam {
  id: string;
  title: string;
  description: string | null;
  skill: string;
  exam_type: string;
  duration_minutes: number;
  total_questions: number;
  is_published: boolean;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  ielts: "IELTS", ket: "KET", pet: "PET", toeic: "TOEIC", internal: "Nội bộ",
};

export function TeacherExamsClient() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/exams");
      const data = await res.json() as { exams?: Exam[] };
      setExams(data.exams ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function togglePublish(exam: Exam) {
    setToggling(exam.id);
    const res = await fetch(`/api/exams/${exam.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !exam.is_published }),
    });
    if (res.ok) {
      setExams((prev) => prev.map((e) => e.id === exam.id ? { ...e, is_published: !e.is_published } : e));
    }
    setToggling(null);
  }

  return (
          <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý đề thi</h1>
            <p className="text-gray-500 text-sm mt-1">Tạo và quản lý các bộ đề luyện thi cho học sinh</p>
          </div>
          <Link href="/teacher/exams/import"
            className="flex items-center gap-2 border border-[#6b38d4] text-[#6b38d4] px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#6b38d4]/5 transition-colors">
            <FileUp size={16} /> Import PDF
          </Link>
          <Link href="/teacher/exams/new"
            className="flex items-center gap-2 bg-[#6b38d4] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            <Plus size={16} /> Tạo đề mới
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Tổng đề",       value: exams.length,                             color: "text-[#6b38d4]" },
            { label: "Đã công bố",    value: exams.filter((e) => e.is_published).length, color: "text-green-600" },
            { label: "Chưa công bố",  value: exams.filter((e) => !e.is_published).length, color: "text-gray-500" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Exam list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 h-24 animate-pulse" />
            ))}
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <BookOpen size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium">Chưa có đề thi nào</p>
            <Link href="/teacher/exams/new"
              className="inline-flex items-center gap-2 mt-4 bg-[#6b38d4] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90">
              <Plus size={15} /> Tạo đề đầu tiên
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {exams.map((exam) => (
              <div key={exam.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                {/* Skill icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                  ${exam.skill === "listening" ? "bg-purple-100" : "bg-blue-100"}`}>
                  {exam.skill === "listening"
                    ? <Headphones size={18} className="text-purple-600" />
                    : <BookOpen    size={18} className="text-blue-600" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{exam.title}</h3>
                    <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {TYPE_LABELS[exam.exam_type] ?? exam.exam_type}
                    </span>
                    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium
                      ${exam.is_published ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                      {exam.is_published ? "Đã công bố" : "Nháp"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Clock size={11} /> {exam.duration_minutes} phút</span>
                    <span className="flex items-center gap-1"><Users size={11} /> {exam.total_questions} câu</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => togglePublish(exam)}
                    disabled={toggling === exam.id}
                    title={exam.is_published ? "Ẩn đề" : "Công bố cho học sinh"}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all
                      ${exam.is_published
                        ? "bg-green-50 text-green-600 hover:bg-green-100"
                        : "bg-gray-50 text-gray-500 hover:bg-gray-100"}
                      disabled:opacity-50`}>
                    {exam.is_published ? <Eye size={13} /> : <EyeOff size={13} />}
                    {toggling === exam.id ? "..." : exam.is_published ? "Công bố" : "Ẩn"}
                  </button>
                  <Link href={`/teacher/exams/${exam.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#6b38d4]/5 text-[#6b38d4] hover:bg-[#6b38d4]/10 transition-colors">
                    Xem kết quả <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );
}
