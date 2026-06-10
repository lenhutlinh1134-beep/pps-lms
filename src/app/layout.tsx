import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Font theo dign.md: Inter (body) + Plus Jakarta Sans (heading)
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PPS LMS — Học tiếng Anh online",
  description:
    "Hệ thống học online của Trung tâm Anh ngữ PPS Vietnam: luyện nghe, học lý thuyết, làm bài tập và theo dõi tiến trình.",
};

export const viewport: Viewport = {
  themeColor: "#6b38d4",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${inter.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
