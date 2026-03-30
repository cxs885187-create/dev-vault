'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { encryptApiKey } from '@/lib/encryption'

export async function saveUserConfig(baseURL: string, apiKey: string, modelName: string) {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('未授权访问。')
  }

  try {
    await prisma.userConfig.upsert({
      where: { userId },
      update: {
        baseURL,
        apiKey: apiKey ? encryptApiKey(apiKey) : '',
        modelName,
      },
      create: {
        userId,
        baseURL,
        apiKey: apiKey ? encryptApiKey(apiKey) : '',
        modelName,
      },
    })

    revalidatePath('/')
    return { success: true as const }
  } catch (error) {
    console.error('保存模型配置失败:', error)
    return { success: false as const, error: '保存模型配置失败，请稍后重试。' }
  }
}
