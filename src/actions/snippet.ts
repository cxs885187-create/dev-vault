// src/actions/snippet.ts
'use server'

import { prisma } from '../lib/prisma'
import { generateCodeExplanation } from './ai'
import { revalidatePath } from 'next/cache'
import { auth } from "@clerk/nextjs/server" // <--- 引入

export async function processAndSaveSnippet(fileName: string, code: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("未授权访问");

  try {
    const explanation = await generateCodeExplanation(code)

    await prisma.snippet.create({
      data: {
        title: fileName,
        code: code,
        language: fileName.split('.').pop() || 'text',
        explanation: explanation,
        userId, // <--- 注入拥有者 ID
      }
    })

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error("代码保存失败:", error)
    return { error: '保存失败，请检查控制台' }
  }
}
// src/actions/snippet.ts (追加到文件末尾)

export async function renameSnippet(snippetId: string, newTitle: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("未授权访问");

  if (!newTitle || !newTitle.trim()) {
    return { error: "标题不能为空" };
  }

  try {
    // 架构级防御：必须同时匹配 snippetId 和 userId，防止越权修改别人的数据
    await prisma.snippet.update({
      where: { 
        id: snippetId,
        userId: userId 
      },
      data: { 
        title: newTitle.trim() 
      }
    });

    revalidatePath('/'); // 瞬间刷新首页缓存
    return { success: true };
  } catch (error) {
    console.error("重命名失败:", error);
    return { error: '重命名失败，请检查控制台' };
  }
}