import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "サンプル工業 日報・給与明細",
  description: "日報入力・給与明細システム（サンプル）",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
