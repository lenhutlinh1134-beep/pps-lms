import Link from "next/link";
import {
  Headphones,
  BookOpen,
  ListChecks,
  LineChart,
  GraduationCap,
  ArrowRight,
  Play,
  SkipBack,
  SkipForward,
  Users,
  UserCog,
  HeartHandshake,
  AlarmClock,
  Sparkles,
  CheckCircle2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/* ---------------------------------------------------------------- *
 * Landing page PPS LMS — design system "Lumina Learning" (dign.md)
 * Glassmorphism + gradient tím→hồng, mobile-first, dùng design token.
 * ---------------------------------------------------------------- */

const stats = [
  { value: "10.000+", label: "Học sinh" },
  { value: "379", label: "Đoạn luyện nghe" },
  { value: "11", label: "Chủ đề từ vựng" },
  { value: "1.500+", label: "File âm thanh bản ngữ" },
];

const features = [
  {
    icon: Headphones,
    title: "Học từ kết nối",
    desc: "Luyện nghe – ghi nhớ từ vựng theo chủ đề với hàng nghìn file âm thanh chuẩn bản ngữ, kèm chế độ Chép & Nói.",
    color: "text-primary",
    bg: "bg-primary-fixed",
  },
  {
    icon: BookOpen,
    title: "Học lý thuyết",
    desc: "Bài giảng do giáo viên đăng trực tiếp, kèm video và hỏi đáp (Q&A) ngay dưới mỗi bài học.",
    color: "text-secondary",
    bg: "bg-secondary-fixed",
  },
  {
    icon: ListChecks,
    title: "Làm bài tập",
    desc: "Trắc nghiệm và bài luyện tập giúp củng cố kiến thức sau mỗi buổi học.",
    color: "text-tertiary",
    bg: "bg-tertiary-fixed",
  },
  {
    icon: LineChart,
    title: "Theo dõi tiến trình",
    desc: "Giáo viên & phụ huynh nắm rõ thời lượng học, điểm danh và nhận xét của từng học sinh.",
    color: "text-primary",
    bg: "bg-primary-fixed",
  },
];

const roles = [
  {
    icon: Users,
    title: "Học sinh",
    color: "text-primary",
    bg: "bg-primary-fixed",
    points: ["Luyện nghe theo chủ đề", "Xem bài giảng & đặt câu hỏi", "Làm bài tập, theo dõi điểm"],
  },
  {
    icon: UserCog,
    title: "Giáo viên",
    color: "text-secondary",
    bg: "bg-secondary-fixed",
    points: ["Mở lớp, đăng bài giảng", "Điểm danh & nhận xét", "Báo cáo cho phụ huynh"],
  },
  {
    icon: HeartHandshake,
    title: "Phụ huynh",
    color: "text-tertiary",
    bg: "bg-tertiary-fixed",
    points: ["Theo dõi tiến trình của con", "Đọc nhận xét của giáo viên", "Nhận lưu ý quan trọng"],
  },
];

const flags = [
  { emoji: "🔴", title: "Thời lượng không đạt", desc: "Học dưới 30% yêu cầu → cảnh báo đỏ." },
  { emoji: "🎧", title: "Luyện nghe chưa đủ", desc: "Dưới 3 bài nghe mỗi tuần → nhắc nhở." },
  { emoji: "💤", title: "Không hoạt động", desc: "Không đăng nhập quá 7 ngày → cờ đỏ." },
  { emoji: "⚠️", title: "Tiến độ thấp", desc: "Điểm trung bình dưới 50% → cảnh báo." },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Khối gradient mờ tạo chiều sâu (glassmorphism background) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-blob absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-primary-fixed-dim opacity-50 blur-3xl" />
        <div className="animate-blob absolute -right-24 top-40 h-[360px] w-[360px] rounded-full bg-secondary-fixed-dim opacity-40 blur-3xl [animation-delay:3s]" />
        <div className="animate-blob absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-tertiary-fixed opacity-30 blur-3xl [animation-delay:6s]" />
      </div>

      {/* ---------------- Thanh điều hướng ---------------- */}
      <header className="glass sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-margin-mobile py-md md:px-lg">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-premium text-white shadow-card-hover">
              <GraduationCap size={22} />
            </span>
            <span className="font-display text-headline-sm text-on-surface">PPS LMS</span>
          </Link>
          <nav className="hidden items-center gap-lg text-body-md text-on-surface-variant md:flex">
            <a href="#tinh-nang" className="transition-colors hover:text-primary">Tính năng</a>
            <a href="#vai-tro" className="transition-colors hover:text-primary">Vai trò</a>
            <a href="#canh-bao" className="transition-colors hover:text-primary">Cảnh báo thông minh</a>
          </nav>
          <div className="flex items-center gap-sm">
            <Link href="/test" className="hidden sm:block">
              <Button variant="ghost" size="sm">🧪 Test Drive</Button>
            </Link>
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm">Đăng nhập</Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm">Đăng ký</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-xl px-margin-mobile pt-xl pb-lg md:grid-cols-2 md:px-lg md:pt-[72px] md:pb-xl">
        {/* Cột chữ */}
        <div className="animate-fade-up text-center md:text-left">
          <span className="mb-md inline-flex items-center gap-2 rounded-full bg-secondary-fixed px-4 py-1 text-label-md text-on-secondary-fixed">
            <Sparkles size={14} /> Trung tâm Anh ngữ PPS Vietnam
          </span>
          <h1 className="text-display-lg text-on-surface md:text-[46px] md:leading-[54px]">
            Học tiếng Anh online{" "}
            <span className="bg-premium bg-clip-text text-transparent">vui hơn, hiệu quả hơn</span>
          </h1>
          <p className="mx-auto mt-md max-w-xl text-body-lg text-on-surface-variant md:mx-0">
            Nền tảng kết nối học sinh – giáo viên – phụ huynh: luyện nghe, học lý thuyết, làm bài tập
            và theo dõi tiến trình học tập, mọi lúc mọi nơi.
          </p>
          <div className="mt-lg flex flex-col items-center justify-center gap-sm sm:flex-row md:justify-start">
            <Link href="/register">
              <Button variant="premium" size="lg" fullWidth>
                Bắt đầu học ngay <ArrowRight size={20} />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="ghost" size="lg" fullWidth>
                <Headphones size={18} /> Nghe thử miễn phí
              </Button>
            </Link>
          </div>
          <p className="mt-md flex items-center justify-center gap-2 text-label-md text-on-surface-variant md:justify-start">
            <span className="flex -space-x-2">
              {["#8455ef", "#fd56a7", "#4cd7f6"].map((c) => (
                <span key={c} className="h-6 w-6 rounded-full border-2 border-white" style={{ background: c }} />
              ))}
            </span>
            <span className="flex items-center gap-0.5 text-secondary">
              <Star size={13} fill="currentColor" /><Star size={13} fill="currentColor" />
              <Star size={13} fill="currentColor" /><Star size={13} fill="currentColor" />
              <Star size={13} fill="currentColor" />
            </span>
            Được hàng nghìn học sinh tin dùng
          </p>
        </div>

        {/* Cột minh hoạ: mô phỏng trình "Học từ kết nối" (glassmorphism) */}
        <div className="animate-fade-up relative mx-auto w-full max-w-md [animation-delay:0.15s]">
          <div className="glass animate-float rounded-xl p-lg shadow-popover">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-fixed px-3 py-1 text-label-md text-on-primary-fixed">
                <Headphones size={14} /> Học từ kết nối
              </span>
              <span className="text-label-md text-on-surface-variant">Chủ đề: City</span>
            </div>

            {/* Câu đang phát — highlight từ */}
            <div className="mt-lg rounded-lg bg-surface-container-lowest p-lg shadow-card">
              <p className="text-headline-sm leading-relaxed text-on-surface">
                The{" "}
                <span className="rounded bg-primary-fixed px-1 text-on-primary-fixed">city</span> has many{" "}
                <span className="rounded bg-secondary-fixed px-1 text-on-secondary-fixed">buildings</span> and busy{" "}
                <span className="text-outline">streets.</span>
              </p>
              <p className="mt-sm text-body-md text-on-surface-variant">
                Thành phố có nhiều toà nhà và những con phố nhộn nhịp.
              </p>
            </div>

            {/* Thanh điều khiển */}
            <div className="mt-lg flex items-center justify-center gap-lg">
              <button className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container" aria-label="Đoạn trước">
                <SkipBack size={20} />
              </button>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-premium text-white shadow-card-hover">
                <Play size={26} fill="currentColor" />
              </span>
              <button className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container" aria-label="Đoạn sau">
                <SkipForward size={20} />
              </button>
            </div>

            {/* Tiến trình */}
            <div className="mt-lg">
              <div className="h-2 w-full rounded-full bg-surface-container-high">
                <div className="h-2 w-2/3 rounded-full bg-premium" />
              </div>
              <div className="mt-xs flex justify-between text-label-sm text-on-surface-variant">
                <span>Đoạn 8 / 12</span>
                <span>Tốc độ 1.0x · Giọng Aria</span>
              </div>
            </div>
          </div>

          {/* Thẻ thành tích nổi */}
          <div className="animate-float-slow absolute -bottom-6 -left-4 hidden rounded-lg bg-surface-container-lowest p-md shadow-popover sm:block [animation-delay:1s]">
            <div className="flex items-center gap-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-tertiary-fixed text-tertiary">
                <CheckCircle2 size={20} />
              </span>
              <div>
                <p className="text-label-md text-on-surface-variant">Hôm nay</p>
                <p className="font-display text-headline-sm text-on-surface">+45 phút</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Dải số liệu ---------------- */}
      <section className="relative z-10 mx-auto max-w-6xl px-margin-mobile md:px-lg">
        <div className="glass grid grid-cols-2 gap-md rounded-xl p-lg md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="bg-premium bg-clip-text font-display text-headline-md text-transparent md:text-display-lg">
                {s.value}
              </p>
              <p className="mt-xs text-body-md text-on-surface-variant">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Tính năng cốt lõi ---------------- */}
      <section id="tinh-nang" className="relative z-10 mx-auto max-w-6xl px-margin-mobile py-xl md:px-lg md:py-[72px]">
        <div className="mx-auto mb-xl max-w-2xl text-center">
          <span className="text-label-md uppercase text-primary">Tính năng</span>
          <h2 className="mt-xs text-headline-md text-on-surface md:text-display-lg">
            Mọi thứ cần cho một buổi học online trọn vẹn
          </h2>
          <p className="mt-sm text-body-lg text-on-surface-variant">
            Từ luyện nghe, học lý thuyết tới làm bài tập và báo cáo — tất cả trong một nền tảng.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title} interactive className="flex flex-col gap-md">
              <span className={`flex h-12 w-12 items-center justify-center rounded-md ${f.bg} ${f.color}`}>
                <f.icon size={24} />
              </span>
              <div>
                <h3 className="text-headline-sm">{f.title}</h3>
                <p className="mt-xs text-body-md text-on-surface-variant">{f.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------------- Ba vai trò ---------------- */}
      <section id="vai-tro" className="relative z-10 mx-auto max-w-6xl px-margin-mobile py-xl md:px-lg md:py-[72px]">
        <div className="mx-auto mb-xl max-w-2xl text-center">
          <span className="text-label-md uppercase text-secondary">Vai trò</span>
          <h2 className="mt-xs text-headline-md text-on-surface md:text-display-lg">
            Một nền tảng, kết nối ba bên
          </h2>
          <p className="mt-sm text-body-lg text-on-surface-variant">
            Học sinh học, giáo viên dạy và giám sát, phụ huynh theo dõi — liền mạch trong cùng một hệ thống.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-md md:grid-cols-3">
          {roles.map((r) => (
            <Card key={r.title} interactive className="flex flex-col gap-md">
              <span className={`flex h-12 w-12 items-center justify-center rounded-md ${r.bg} ${r.color}`}>
                <r.icon size={24} />
              </span>
              <h3 className="text-headline-sm">{r.title}</h3>
              <ul className="flex flex-col gap-sm">
                {r.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-body-md text-on-surface-variant">
                    <CheckCircle2 size={18} className={`mt-0.5 shrink-0 ${r.color}`} />
                    {p}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------------- Cảnh báo thông minh ---------------- */}
      <section id="canh-bao" className="relative z-10 mx-auto max-w-6xl px-margin-mobile py-xl md:px-lg md:py-[72px]">
        <div className="grid items-center gap-xl md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary-fixed px-3 py-1 text-label-md text-on-secondary-fixed">
              <AlarmClock size={14} /> Flag Engine
            </span>
            <h2 className="mt-md text-headline-md text-on-surface md:text-display-lg">
              Cảnh báo thông minh, không bỏ sót học sinh nào
            </h2>
            <p className="mt-sm text-body-lg text-on-surface-variant">
              Hệ thống tự động phân tích hành vi học và gắn &ldquo;cờ&rdquo; cảnh báo, giúp giáo viên
              can thiệp kịp thời và phụ huynh luôn yên tâm.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            {flags.map((f) => (
              <Card key={f.title} padding="md" className="flex items-start gap-sm">
                <span className="text-2xl leading-none">{f.emoji}</span>
                <div>
                  <p className="font-display text-body-lg font-semibold text-on-surface">{f.title}</p>
                  <p className="mt-xs text-body-md text-on-surface-variant">{f.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA cuối ---------------- */}
      <section className="relative z-10 mx-auto max-w-6xl px-margin-mobile pb-xl md:px-lg">
        <div className="relative overflow-hidden rounded-xl bg-premium p-xl text-center shadow-card-hover md:p-[56px]">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          </div>
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-headline-md text-white md:text-display-lg">
              Sẵn sàng cho hành trình tiếng Anh của bạn?
            </h2>
            <p className="mx-auto mt-sm max-w-xl text-body-lg text-white/85">
              Tạo tài khoản miễn phí và bắt đầu luyện nghe ngay hôm nay.
            </p>
            <div className="mt-lg flex flex-col items-center justify-center gap-sm sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                  Đăng ký miễn phí <ArrowRight size={20} />
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" className="border border-white/40 bg-white/10 text-white hover:bg-white/20">
                  Nghe thử trước
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="relative z-10 border-t border-outline-variant">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-md px-margin-mobile py-lg text-center md:flex-row md:px-lg md:text-left">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-premium text-white">
              <GraduationCap size={18} />
            </span>
            <span className="font-display text-body-lg font-semibold text-on-surface">PPS LMS</span>
          </div>
          <p className="text-label-md text-on-surface-variant">
            © {new Date().getFullYear()} PPS Vietnam · Hệ thống học online
          </p>
          <div className="flex items-center gap-md text-body-md text-on-surface-variant">
            <Link href="/login" className="transition-colors hover:text-primary">Đăng nhập</Link>
            <Link href="/register" className="transition-colors hover:text-primary">Đăng ký</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
