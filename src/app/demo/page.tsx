import Link from "next/link";
import { Headphones } from "lucide-react";
import { listeningTopics } from "@/lib/listening-data";
import { Card, Chip } from "@/components/ui/Card";

export default function DemoListeningPage() {
  const totalParas = listeningTopics.reduce((a, t) => a + t.paras.length, 0);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-lg px-margin-mobile py-lg md:px-lg">
      <div className="flex items-center gap-md">
        <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary-fixed text-primary">
          <Headphones size={28} />
        </span>
        <div>
          <h1 className="text-display-lg">Học từ kết nối</h1>
          <p className="mt-xs text-body-lg text-on-surface-variant">
            {listeningTopics.length} chủ đề · {totalParas} đoạn luyện nghe
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
        {listeningTopics.map((t, i) => (
          <Link key={t.id} href={`/demo/${t.id}`}>
            <Card interactive className="flex h-full flex-col gap-md">
              <div className="flex items-start justify-between">
                <span className="text-4xl">{t.emoji || "🎧"}</span>
                <Chip color="neutral">Bài {i + 1}</Chip>
              </div>
              <div className="flex-1">
                <h3 className="text-headline-sm leading-snug">{t.name}</h3>
              </div>
              <div className="flex items-center justify-between text-label-md text-on-surface-variant">
                <span>{t.paras.length} đoạn</span>
                <span className="font-semibold text-primary">Luyện nghe →</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
