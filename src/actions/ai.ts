'use server'

import { auth } from '@clerk/nextjs/server'
import { generateStructuredCodeExplanation, generateStructuredTermSummary } from '@/lib/ai/service'

async function requireUserId() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('未授权访问。')
  }

  return userId
}

export async function generateTermSummary(query: string): Promise<string> {
  try {
    const userId = await requireUserId()
    return await generateStructuredTermSummary(userId, query)
  } catch (error) {
    console.error('生成术语解释失败:', error)
    return '抱歉，术语解释生成失败，请检查模型配置后重试。'
  }
}

export async function generateCodeExplanation(code: string): Promise<string> {
  try {
    const userId = await requireUserId()
    return await generateStructuredCodeExplanation(userId, code)
  } catch (error) {
    console.error('生成代码解释失败:', error)
    return '抱歉，代码解释生成失败，请检查模型配置后重试。'
  }
}
