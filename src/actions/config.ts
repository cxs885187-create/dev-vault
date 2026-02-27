// src/actions/config.ts
'use server'

import { prisma } from '../lib/prisma'
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from 'next/cache'

export async function saveUserConfig(baseURL: string, apiKey: string, modelName: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("未授权访问");

  try {
    // 架构师最爱的 upsert 操作：有则更新，无则创建！
    await prisma.userConfig.upsert({
      where: { userId },
      update: { baseURL, apiKey, modelName },
      create: { userId, baseURL, apiKey, modelName }
    });
    
    revalidatePath('/'); // 刷新当前页面状态
    return { success: true };
  } catch (error) {
    console.error("保存配置失败:", error);
    return { error: '保存配置失败，请检查控制台' };
  }
}