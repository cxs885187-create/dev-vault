import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import { JetBrains_Mono, Manrope } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})

const jetBrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'DevVault | 开发者第二大脑',
  description: '用更清晰的界面整理概念、代码片段和项目结构，让 AI 成为你的开发知识工作台。',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="zh-CN">
        <body className={`${manrope.variable} ${jetBrainsMono.variable}`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
