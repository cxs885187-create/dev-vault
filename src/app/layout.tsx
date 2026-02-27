// 1. 新增：引入 ClerkProvider
import { ClerkProvider } from '@clerk/nextjs' 
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Next.js 默认的字体配置（保留它们）
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 顺便把你的网页标题改得专业一点
export const metadata: Metadata = {
  title: "DevVault | 开发者第二大脑", 
  description: "卸载认知负荷，AI 增强的代码架构与知识管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 2. 新增：用 ClerkProvider 包裹整个 html
    <ClerkProvider>
      <html lang="zh-CN">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}