"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, PanelLeftClose, PanelLeft, Play, Pause, SkipBack, SkipForward,
  Square, Minus, Plus, Infinity as InfinityIcon, Languages, Mic, RotateCcw,
  Eye, Target, GraduationCap, Headphones, Loader2, AlertCircle, CheckCircle2, X,
} from "lucide-react";
import { VOICES, type VoiceId, audioUrl, type ListeningTopic } from "@/lib/listening";
import { isB1Word, tokenize, normalizeWord } from "@/lib/b1-words";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Mode = "listen" | "dictation" | "shadow";
interface TopicMeta { id: string; emoji: string; name: string; count: number }

const SPEEDS = [0.6, 0.75, 0.85, 1.0, 1.15];
const VOICE_OPTIONS: { id: VoiceId | "random"; label: string }[] = [
  ...VOICES.map((v) => ({ id: v.id, label: `${v.label} (${v.hint})` })),
  { id: "random", label: "Ngẫu nhiên 4 giọng" },
];

export function ListeningStudio({
  topic, topics, basePath, backHref,
}: {
  topic: ListeningTopic;
  topics: TopicMeta[];
  basePath: string;
  backHref: string;
}) {
  const router = useRouter();
  const total = topic.paras.length;

  // ---- UI state ----
  const [mode, setMode] = useState<Mode>("listen");
  const [idx, setIdx] = useState(0);
  const [voice, setVoice] = useState<VoiceId | "random">("aria");
  const [speed, setSpeed] = useState(1.0);
  const [loopCnt, setLoopCnt] = useState(1);
  const [loopInf, setLoopInf] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [autoPlayTopic, setAutoPlayTopic] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeWord, setActiveWord] = useState(-1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dicOnlyB1, setDicOnlyB1] = useState(true);
  const [dicValues, setDicValues] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  // ---- engine refs (tránh stale closure trong callback audio) ----
  const audioRef = useRef<HTMLAudioElement>(null);
  const idxRef = useRef(0);
  const modeRef = useRef<Mode>("listen");
  const speedRef = useRef(1.0);
  const voiceRef = useRef<VoiceId | "random">("aria");
  const loopInfRef = useRef(false);
  const loopCntRef = useRef(1);
  const loopRemRef = useRef(1);
  const autoPlayRef = useRef(true);
  const playingRef = useRef(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { voiceRef.current = voice; }, [voice]);
  useEffect(() => { loopInfRef.current = loopInf; }, [loopInf]);
  useEffect(() => { loopCntRef.current = loopCnt; }, [loopCnt]);
  useEffect(() => { autoPlayRef.current = autoPlayTopic; }, [autoPlayTopic]);
  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);

  function showToast(type: "success" | "error" | "info", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  const para = topic.paras[idx];
  const vi = topic.vi_paras?.[idx] ?? "";

  // Token hoá đoạn văn (gắn chỉ số từ)
  const tokens = useMemo(() => {
    let w = -1;
    return tokenize(para).map((t) => ({ ...t, wordIdx: t.isWord ? ++w : -1 }));
  }, [para]);
  const totalWords = useMemo(() => tokens.filter((t) => t.isWord).length, [tokens]);

  // Token cho chế độ Chép
  const dicTokens = useMemo(() => {
    let inp = -1;
    return tokenize(para).map((t) => {
      const blank = t.isWord && (!dicOnlyB1 || isB1Word(t.text));
      return { ...t, isInput: blank, inputIdx: blank ? ++inp : -1, answer: normalizeWord(t.text) };
    });
  }, [para, dicOnlyB1]);
  const dicCount = useMemo(() => dicTokens.filter((t) => t.isInput).length, [dicTokens]);

  // Reset dictation khi đổi đoạn / chế độ blank
  useEffect(() => { setDicValues(Array(dicCount).fill("")); }, [dicCount, idx, dicOnlyB1]);

  // Phát hiện chép đúng hết → success toast
  useEffect(() => {
    if (mode !== "dictation" || dicCount === 0 || dicValues.length === 0) return;
    const allCorrect = dicTokens
      .filter((t) => t.isInput)
      .every((t, i) => normalizeWord(dicValues[i] ?? "") === t.answer);
    if (allCorrect) {
      showToast("success", `Xuất sắc! Bạn đã chép đúng tất cả ${dicCount} từ! 🎉`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dicValues]);

  // ===== Audio engine =====
  function resolveVoice(): VoiceId {
    const v = voiceRef.current;
    if (v === "random") {
      const arr: VoiceId[] = ["aria", "guy", "ryan", "sonia"];
      return arr[Math.floor(Math.random() * arr.length)];
    }
    return v;
  }

  function speak() {
    const a = audioRef.current;
    if (!a || !playingRef.current) return;
    setAudioError(null);
    setAudioLoading(true);
    a.src = audioUrl(resolveVoice(), topic.id, idxRef.current);
    a.playbackRate = speedRef.current;
    a.play().catch(() => {
      setAudioLoading(false);
      doStop();
      showToast("error", "Không thể phát audio. Kiểm tra kết nối mạng và thử lại.");
      setAudioError("Không thể phát audio cho đoạn này.");
    });
  }

  function doPlay() {
    setIsPlaying(true);
    playingRef.current = true;
    loopRemRef.current = loopInfRef.current ? Infinity : loopCntRef.current;
    speak();
  }

  function doStop() {
    setIsPlaying(false);
    playingRef.current = false;
    setActiveWord(-1);
    setAudioLoading(false);
    const a = audioRef.current;
    if (a) { a.pause(); a.currentTime = 0; }
    setProgress(0);
  }

  function togglePlay() {
    if (playingRef.current) doStop();
    else doPlay();
  }

  function goTo(i: number) {
    if (i < 0 || i >= total) return;
    idxRef.current = i;
    setIdx(i);
    setActiveWord(-1);
    setMatched(new Set());
    if (playingRef.current) setTimeout(speak, 50);
  }

  function logListen() {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("student_logs").insert({ student_id: user.id, type: "listen", listen_count: 1 });
      } catch { /* bỏ qua */ }
    })();
  }

  function onCanPlay() {
    setAudioLoading(false);
    setAudioError(null);
  }

  function onAudioError() {
    setAudioLoading(false);
    doStop();
    setAudioError("Không tải được audio cho đoạn này.");
    showToast("error", "Không tải được audio. Hãy thử đoạn khác hoặc kiểm tra kết nối mạng.");
  }

  function onTimeUpdate() {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    setAudioLoading(false);
    const ratio = a.currentTime / a.duration;
    setProgress(ratio);
    if (modeRef.current !== "dictation" && totalWords > 0) {
      setActiveWord(Math.min(totalWords - 1, Math.floor(ratio * totalWords)));
    }
  }

  function onEnded() {
    if (!playingRef.current) return;
    logListen();
    loopRemRef.current = loopInfRef.current ? Infinity : loopRemRef.current - 1;
    if (loopRemRef.current > 0) {
      setTimeout(speak, 400);
      return;
    }
    if (idxRef.current < total - 1) {
      const ni = idxRef.current + 1;
      idxRef.current = ni;
      setIdx(ni);
      setActiveWord(-1);
      loopRemRef.current = loopInfRef.current ? Infinity : loopCntRef.current;
      setTimeout(speak, 500);
    } else if (autoPlayRef.current) {
      const tIdx = topics.findIndex((t) => t.id === topic.id);
      if (tIdx >= 0 && tIdx < topics.length - 1) {
        showToast("success", `Hoàn thành "${topic.name}"! Chuyển sang bài tiếp theo...`);
        router.push(`${basePath}/${topics[tIdx + 1].id}`);
      } else {
        showToast("success", "Tuyệt vời! Bạn đã hoàn thành chủ đề này.");
        doStop();
      }
    } else {
      showToast("info", `Đã nghe xong chủ đề "${topic.name}".`);
      doStop();
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
  }

  function changeVoice(v: VoiceId | "random") {
    setVoice(v); voiceRef.current = v;
    if (playingRef.current) setTimeout(speak, 50);
  }

  function changeSpeed(s: number) {
    setSpeed(s); speedRef.current = s;
    if (audioRef.current) audioRef.current.playbackRate = s;
  }

  function switchMode(m: Mode) {
    if (playingRef.current) doStop();
    setMode(m); modeRef.current = m;
    setMatched(new Set());
  }

  // ===== Chế độ Nói (Web Speech API) =====
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript + " ";
      const spoken = new Set(transcript.toLowerCase().split(/\s+/).map(normalizeWord).filter(Boolean));
      const next = new Set<number>();
      tokens.forEach((t) => {
        if (t.isWord && spoken.has(normalizeWord(t.text))) next.add(t.wordIdx);
      });
      setMatched(next);
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recognitionRef.current = rec;
    return () => { try { rec.stop(); } catch { /* noop */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens]);

  function toggleRecording() {
    const rec = recognitionRef.current;
    if (!rec) {
      alert("Trình duyệt chưa hỗ trợ thu âm. Hãy dùng Chrome hoặc Edge.");
      return;
    }
    if (recording) { rec.stop(); setRecording(false); }
    else { setMatched(new Set()); try { rec.start(); setRecording(true); } catch { /* noop */ } }
  }

  // Dừng nhạc khi rời trang
  useEffect(() => () => { try { audioRef.current?.pause(); } catch { /* noop */ } }, []);

  const badge = `Đoạn ${idx + 1} / ${total}`;

  return (
    <div className="min-h-screen bg-background pb-[88px] md:pb-0">
      {/* ===== Header ===== */}
      <header className="glass sticky top-0 z-30 flex h-16 items-center gap-md px-margin-mobile md:px-lg">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-4 py-2 text-label-md text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        >
          <ArrowLeft size={16} /> Quay lại
        </Link>
        <span className="flex items-center gap-2 font-display text-headline-sm text-primary">
          <Headphones size={20} /> Listen &amp; Memorize
        </span>
        <button
          onClick={() => setSidebarOpen((s) => !s)}
          className="ml-auto hidden h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container md:flex"
          title="Ẩn/hiện danh sách chủ đề"
        >
          {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
        </button>
      </header>

      {/* ===== Layout ===== */}
      <div className={cn(
        "mx-auto grid max-w-6xl grid-cols-1 items-start gap-lg px-margin-mobile py-lg md:px-lg",
        sidebarOpen ? "md:grid-cols-[300px_1fr]" : "md:grid-cols-1",
      )}>
        {/* Sidebar chủ đề */}
        {sidebarOpen && (
          <aside className="hidden overflow-hidden rounded-lg bg-surface-container-lowest shadow-card md:flex md:flex-col md:sticky md:top-[88px] md:max-h-[calc(100vh-112px)]">
            <div className="bg-premium p-lg text-white">
              <p className="text-label-md uppercase opacity-80">Chủ đề</p>
              <p className="font-display text-headline-sm">{topics.length} bài luyện nghe</p>
            </div>
            <nav className="flex-1 overflow-y-auto p-sm">
              {topics.map((t, i) => {
                const active = t.id === topic.id;
                return (
                  <Link
                    key={t.id}
                    href={`${basePath}/${t.id}`}
                    className={cn(
                      "mb-1 flex items-center gap-sm rounded-md px-4 py-3 text-body-md transition-colors",
                      active ? "bg-primary text-on-primary shadow-card-hover font-semibold" : "text-on-surface-variant hover:bg-primary-fixed",
                    )}
                  >
                    <span className="text-xl">{t.emoji || "🎧"}</span>
                    <span className="flex-1 truncate">{t.name}</span>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-label-sm",
                      active ? "bg-white/20 text-white" : "bg-surface-container text-on-surface-variant",
                    )}>
                      {t.count}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        )}

        {/* Main */}
        <main className="flex min-w-0 flex-col gap-lg">
          {/* Player card */}
          <section className="overflow-hidden rounded-lg bg-surface-container-lowest shadow-card">
            {/* Player header */}
            <div className="flex flex-col gap-md border-b border-outline-variant bg-surface-container-low p-lg">
              <div className="flex items-start justify-between gap-md">
                <div className="min-w-0">
                  <span className="text-2xl">{topic.emoji}</span>
                  <h1 className="font-display text-headline-md leading-tight">{topic.name}</h1>
                </div>
                <span className="shrink-0 rounded-full bg-primary-fixed px-4 py-1.5 text-label-md text-on-primary-fixed">
                  {badge}
                </span>
              </div>

              {/* Mode tabs + translation */}
              <div className="flex flex-wrap items-center gap-sm">
                <div className="inline-flex rounded-full border border-outline-variant bg-surface-container p-1">
                  {([["listen", "🎧 Nghe"], ["dictation", "✍️ Chép"], ["shadow", "🗣️ Nói"]] as [Mode, string][]).map(
                    ([m, label]) => (
                      <button
                        key={m}
                        onClick={() => switchMode(m)}
                        className={cn(
                          "rounded-full px-4 py-1.5 text-label-md font-semibold transition-colors",
                          mode === m ? "bg-surface-container-lowest text-primary shadow-card" : "text-on-surface-variant",
                        )}
                      >
                        {label}
                      </button>
                    ),
                  )}
                </div>
                {mode !== "dictation" && (
                  <button
                    onClick={() => setShowTranslation((s) => !s)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-label-md font-semibold transition-colors",
                      showTranslation ? "border-primary bg-primary-fixed text-primary" : "border-outline-variant bg-surface-container text-on-surface-variant",
                    )}
                  >
                    <Languages size={16} /> {showTranslation ? "Ẩn bản dịch" : "Hiện bản dịch"}
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="px-lg pt-md">
              <div onClick={seek} className="group h-2 cursor-pointer overflow-hidden rounded-full bg-surface-container-high">
                <div className="h-full rounded-full bg-premium transition-[width] duration-100" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>

            {/* Error banner */}
            {audioError && (
              <div className="mx-lg mt-sm flex items-center gap-sm rounded-lg bg-error-container px-4 py-2.5">
                <AlertCircle size={16} className="shrink-0 text-on-error-container" />
                <p className="flex-1 text-label-md text-on-error-container">{audioError}</p>
                <button onClick={() => setAudioError(null)} className="text-on-error-container opacity-60 hover:opacity-100">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Text display */}
            <div className="p-lg">
              <div className={cn(
                "rounded-lg border p-lg transition-colors",
                isPlaying ? "border-primary/40 bg-primary-fixed/40" : "border-outline-variant bg-surface-container-low",
              )}>
                {mode === "dictation" ? (
                  <p className="text-[22px] leading-[2.4] text-on-surface">
                    {dicTokens.map((t, i) => {
                      if (!t.isInput) return <span key={i}>{t.text}</span>;
                      const val = dicValues[t.inputIdx] ?? "";
                      const ok = val !== "" && normalizeWord(val) === t.answer;
                      const wrong = val !== "" && !ok;
                      return (
                        <input
                          key={i}
                          value={val}
                          onChange={(e) => setDicValues((p) => { const n = [...p]; n[t.inputIdx] = e.target.value; return n; })}
                          className={cn(
                            "mx-1 my-1 box-border max-w-full rounded-md border-[1.5px] px-2 py-1 text-center align-middle text-[17px] font-semibold outline-none transition-colors",
                            ok ? "border-tertiary bg-tertiary-fixed text-on-tertiary-fixed"
                              : wrong ? "border-error bg-error-container text-on-error-container"
                              : "border-outline-variant bg-surface-container-lowest focus:border-primary",
                          )}
                          style={{ width: `${Math.max(t.answer.length, val.length, 2) + 3}ch` }}
                          aria-label="điền từ"
                        />
                      );
                    })}
                  </p>
                ) : (
                  <p className="text-[22px] font-medium leading-[2.3] text-on-surface md:text-[26px]">
                    {tokens.map((t, i) => {
                      if (!t.isWord) return <span key={i}>{t.text}</span>;
                      const b1 = isB1Word(t.text);
                      const isActive = t.wordIdx === activeWord;
                      const isMatched = mode === "shadow" && matched.has(t.wordIdx);
                      return (
                        <span
                          key={i}
                          className={cn(
                            "inline-block rounded px-0.5 transition-all",
                            isMatched && "bg-tertiary-fixed text-on-tertiary-fixed font-bold",
                            isActive && !isMatched && "bg-primary-fixed text-primary font-bold scale-105",
                            b1 && !isActive && !isMatched && "font-extrabold text-primary",
                          )}
                        >
                          {t.text}
                        </span>
                      );
                    })}
                  </p>
                )}

                {showTranslation && mode !== "dictation" && (
                  <p className="mt-md border-t border-dashed border-outline-variant pt-md text-body-lg text-on-surface-variant">
                    {vi || "— (Đoạn này chưa có bản dịch) —"}
                  </p>
                )}
              </div>

              {/* Hành động theo chế độ */}
              {mode === "dictation" && (
                <div className="mt-md flex flex-wrap gap-sm">
                  <button onClick={() => setDicOnlyB1((b) => !b)}
                    className="inline-flex items-center gap-2 rounded-full border border-primary-fixed bg-primary-fixed px-4 py-2 text-label-md font-semibold text-primary">
                    <Target size={16} /> {dicOnlyB1 ? "Điền B1" : "Điền tất cả"}
                  </button>
                  <button onClick={() => setDicValues(Array(dicCount).fill(""))}
                    className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container px-4 py-2 text-label-md font-semibold text-on-surface-variant">
                    <RotateCcw size={16} /> Làm lại
                  </button>
                  <button onClick={() => setDicValues(dicTokens.filter((t) => t.isInput).map((t) => t.text))}
                    className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container px-4 py-2 text-label-md font-semibold text-on-surface-variant">
                    <Eye size={16} /> Xem đáp án
                  </button>
                </div>
              )}
              {mode === "shadow" && (
                <div className="mt-md flex flex-wrap items-center gap-sm">
                  <button onClick={toggleRecording}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-6 py-3 text-body-md font-bold transition-colors",
                      recording ? "animate-pulse border-error bg-error text-on-error" : "border-outline-variant bg-surface-container-lowest text-error",
                    )}>
                    <Mic size={18} /> {recording ? "Đang thu âm… (bấm để dừng)" : "Bấm để nói theo"}
                  </button>
                  <span className="text-label-md text-on-surface-variant">
                    Đọc theo đoạn văn, hệ thống tô xanh từ bạn phát âm đúng.
                  </span>
                </div>
              )}
            </div>

            {/* Controls — hàng nút transport căn giữa */}
            <div className="border-t border-outline-variant px-lg py-lg">
              {/* Hàng 1: transport */}
              <div className="flex items-center justify-center gap-lg">
                {/* Skip back */}
                <button
                  onClick={() => goTo(idx - 1)}
                  disabled={idx === 0}
                  title="Đoạn trước"
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface-variant shadow-card transition-all hover:scale-105 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <SkipBack size={20} />
                </button>

                {/* Stop */}
                <button
                  onClick={doStop}
                  title="Dừng"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface-variant shadow-card transition-all hover:scale-105 hover:border-error/60 hover:text-error"
                >
                  <Square size={16} />
                </button>

                {/* Play / Pause — nút chính, lớn nhất */}
                <button
                  onClick={togglePlay}
                  title={audioLoading ? "Đang tải audio..." : isPlaying ? "Tạm dừng" : "Phát"}
                  className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-premium text-white shadow-card-hover transition-all hover:scale-110 active:scale-95"
                >
                  {audioLoading
                    ? <Loader2 size={28} className="animate-spin" />
                    : isPlaying
                      ? <Pause size={28} />
                      : <Play size={28} className="ml-1" />
                  }
                </button>

                {/* Skip forward */}
                <button
                  onClick={() => goTo(idx + 1)}
                  disabled={idx === total - 1}
                  title="Đoạn sau"
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface-variant shadow-card transition-all hover:scale-105 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <SkipForward size={20} />
                </button>

                {/* Loop control */}
                <div className="flex h-12 items-center gap-0.5 rounded-full border border-outline-variant bg-surface-container-low px-2">
                  <span className="px-1 text-label-sm font-medium text-on-surface-variant">Lặp</span>
                  <button
                    onClick={() => setLoopCnt((c) => Math.max(1, c - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant shadow-card hover:text-primary"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center text-label-md font-bold text-on-surface">
                    {loopInf ? "∞" : loopCnt}
                  </span>
                  <button
                    onClick={() => setLoopCnt((c) => Math.min(20, c + 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant shadow-card hover:text-primary"
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    onClick={() => setLoopInf((v) => !v)}
                    title="Lặp vô hạn"
                    className={cn(
                      "ml-0.5 flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                      loopInf ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-primary",
                    )}
                  >
                    <InfinityIcon size={13} />
                  </button>
                </div>
              </div>

              {/* Hàng 2: speed + voice + auto-play */}
              <div className="mt-md flex flex-wrap items-center justify-center gap-md">
                {/* Tốc độ */}
                <div className="flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-low px-3 py-1.5">
                  <span className="mr-1 text-label-sm font-medium uppercase text-on-surface-variant">Tốc độ</span>
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-label-sm font-semibold transition-colors",
                        s === speed ? "bg-primary text-on-primary shadow-card" : "text-on-surface-variant hover:text-on-surface",
                      )}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                {/* Giọng đọc */}
                <div className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-3 py-1.5">
                  <span className="text-label-sm font-medium uppercase text-on-surface-variant">Giọng</span>
                  <select
                    value={voice}
                    onChange={(e) => changeVoice(e.target.value as VoiceId | "random")}
                    className="rounded-md bg-transparent text-label-sm font-semibold text-on-surface outline-none"
                  >
                    {VOICE_OPTIONS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </select>
                </div>

                {/* Tự chuyển bài */}
                <button
                  onClick={() => setAutoPlayTopic((a) => !a)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-label-sm font-semibold transition-colors",
                    autoPlayTopic
                      ? "border-secondary bg-secondary text-on-secondary"
                      : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-secondary/60",
                  )}
                >
                  Tự chuyển bài
                </button>
              </div>
            </div>
          </section>

          {/* Danh sách đoạn */}
          <section className="overflow-hidden rounded-lg bg-surface-container-lowest shadow-card">
            <div className="border-b border-outline-variant bg-surface-container-low px-lg py-md">
              <h2 className="text-body-md font-bold">Danh sách đoạn ({total})</h2>
            </div>
            <div className="flex max-h-[420px] flex-col gap-1 overflow-y-auto p-sm">
              {topic.paras.map((p, i) => (
                <button key={i} onClick={() => goTo(i)}
                  className={cn(
                    "flex items-start gap-md rounded-md border p-md text-left transition-colors",
                    i === idx ? "border-primary/30 bg-primary-fixed" : "border-transparent hover:bg-surface-container",
                  )}>
                  <span className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-label-md font-bold",
                    i === idx ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant",
                  )}>{i + 1}</span>
                  <span className={cn("line-clamp-2 text-body-md", i === idx ? "font-semibold text-primary" : "text-on-surface-variant")}>
                    {p}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={cn(
          "fixed bottom-[96px] left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl px-5 py-3 shadow-card-hover md:bottom-6 md:left-auto md:right-6 md:translate-x-0",
          toast.type === "success" && "bg-tertiary text-on-tertiary",
          toast.type === "error" && "bg-error text-on-error",
          toast.type === "info" && "bg-primary text-on-primary",
        )}>
          {toast.type === "success" && <CheckCircle2 size={18} className="shrink-0" />}
          {toast.type === "error" && <AlertCircle size={18} className="shrink-0" />}
          {toast.type === "info" && <Headphones size={18} className="shrink-0" />}
          <span className="text-body-md font-medium">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-1 rounded-full p-0.5 opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Bottom nav (mobile) */}
      <nav className="glass fixed inset-x-0 bottom-0 z-30 flex items-center justify-around py-sm md:hidden">
        <Link href={basePath} className="flex flex-1 flex-col items-center gap-1 text-on-surface-variant">
          <GraduationCap size={22} /><span className="text-label-sm">Thư viện</span>
        </Link>
        <button onClick={togglePlay} className="flex flex-1 flex-col items-center gap-1 text-primary">
          {audioLoading ? <Loader2 size={22} className="animate-spin" /> : isPlaying ? <Pause size={22} /> : <Play size={22} />}
          <span className="text-label-sm">{audioLoading ? "Đang tải..." : isPlaying ? "Dừng" : "Phát"}</span>
        </button>
        <Link href={backHref} className="flex flex-1 flex-col items-center gap-1 text-on-surface-variant">
          <ArrowLeft size={22} /><span className="text-label-sm">Quay lại</span>
        </Link>
      </nav>

      <audio
        ref={audioRef}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onError={onAudioError}
        onCanPlay={onCanPlay}
        onLoadStart={() => setAudioLoading(true)}
        preload="auto"
      />
    </div>
  );
}
