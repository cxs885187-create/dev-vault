// src/actions/term.ts
'use server'

import { prisma } from '../lib/prisma'
import { generateTermSummary } from './ai'
import { revalidatePath } from 'next/cache'
import { auth } from "@clerk/nextjs/server" // <--- 引入

export async function createTermAction(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("未授权访问"); // 安全左移：防黑客越权调用 API

  const name = formData.get('name') as string
  if (!name) return;

  try {
    const aiSummary = await generateTermSummary(name)

    await prisma.term.create({
      data: {
        name,
        aiSummary,
        userId, // <--- 核心：数据打上当前用户的思想钢印
      }
    })

    revalidatePath('/')
  } catch (error) {
    console.error("保存失败:", error)
  }
}