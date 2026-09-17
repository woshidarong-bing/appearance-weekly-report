import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "外观小组周报",
  description: "将明道云任务池整理为项目级周工作汇报",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
