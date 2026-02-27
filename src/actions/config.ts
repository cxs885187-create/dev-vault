// src/actions/config.ts
'use server'

import { prisma } from '../lib/prisma'
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from 'next/cache'
import { encryptApiKey } from '../lib/encryption' // <--- 1. 引入加密引擎

export async function saveUserConfig(baseURL: string, apiKey: string, modelName: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("未授权访问");

  try {
    // 2. 核心防御：只有当用户填了 key 的时候，才进行加密！
    const safeApiKey = apiKey ? encryptApiKey(apiKey) : '';

    await prisma.userConfig.upsert({
      where: { userId },
      update: { baseURL, apiKey: safeApiKey, modelName },
      create: { userId, baseURL, apiKey: safeApiKey, modelName }
    });
    
    revalidatePath('/'); 
    return { success: true };
  } catch (error) {
    console.error("保存配置失败:", error);
    return { error: '保存配置失败，请检查控制台' };
  }
}