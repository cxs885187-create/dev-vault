'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { generateCodeExplanation } from '@/actions/ai'
import { serializeSnippet } from '@/lib/serializers'

async function requireUserId() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('未授权访问。')
  }

  return userId
}

export async function processAndSaveSnippet(fileName: string, code: string) {
  const userId = await requireUserId()

  try {
    const explanation = await generateCodeExplanation(code)
    const snippet = await prisma.snippet.create({
      data: {
        userId,
        title: fileName,
        code,
        language: fileName.split('.').pop() || 'text',
        explanation,
      },
    })

    revalidatePath('/')
    return { success: true as const, snippet: serializeSnippet(snippet) }
  } catch (error) {
    console.error('保存代码片段失败:', error)
    return { success: false as const, error: '保存代码片段失败，请稍后重试。' }
  }
}

export async function renameSnippet(snippetId: string, newTitle: string) {
  const userId = await requireUserId()
  const title = newTitle.trim()

  if (!title) {
    return { success: false as const, error: '标题不能为空。' }
  }

  try {
    const result = await prisma.snippet.updateMany({
      where: { id: snippetId, userId, deletedAt: null },
      data: { title },
    })

    if (!result.count) {
      return { success: false as const, error: '没有找到可重命名的代码片段。' }
    }

    const snippet = await prisma.snippet.findUnique({ where: { id: snippetId } })

    if (!snippet) {
      return { success: false as const, error: '代码片段不存在。' }
    }

    revalidatePath('/')
    return { success: true as const, snippet: serializeSnippet(snippet) }
  } catch (error) {
    console.error('重命名代码片段失败:', error)
    return { success: false as const, error: '重命名代码片段失败，请稍后重试。' }
  }
}
