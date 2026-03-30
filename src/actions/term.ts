'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { generateTermSummary } from '@/actions/ai'
import { serializeTerm } from '@/lib/serializers'

async function requireUserId() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('未授权访问。')
  }

  return userId
}

export async function createTerm(name: string) {
  const userId = await requireUserId()
  const normalizedName = name.trim()

  if (!normalizedName) {
    return { success: false as const, error: '概念名称不能为空。' }
  }

  try {
    const existing = await prisma.term.findFirst({
      where: { userId, name: normalizedName, deletedAt: null },
      select: { id: true },
    })

    if (existing) {
      return { success: false as const, error: '这个概念已经存在。' }
    }

    const aiSummary = await generateTermSummary(normalizedName)
    const term = await prisma.term.create({
      data: {
        userId,
        name: normalizedName,
        aiSummary,
      },
    })

    revalidatePath('/')
    return { success: true as const, term: serializeTerm(term) }
  } catch (error) {
    console.error('创建概念失败:', error)
    return { success: false as const, error: '创建概念失败，请稍后重试。' }
  }
}

export async function createTermAction(formData: FormData) {
  const name = formData.get('name')
  return createTerm(typeof name === 'string' ? name : '')
}
