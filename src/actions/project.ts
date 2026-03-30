'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { generateProjectDiagram, generateWorkflowDiagnosis } from '@/lib/ai/service'
import { serializeProject } from '@/lib/serializers'

async function requireUserId() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('未授权访问。')
  }

  return userId
}

export async function analyzeProjectArchitecture(projectName: string, directoryTree: string) {
  const userId = await requireUserId()

  try {
    const mermaidCode = await generateProjectDiagram(userId, projectName, directoryTree)
    const project = await prisma.projectAnalysis.create({
      data: {
        userId,
        projectName,
        directoryTree,
        mermaidCode,
      },
    })

    revalidatePath('/')
    return { success: true as const, project: serializeProject(project) }
  } catch (error) {
    console.error('分析项目结构失败:', error)
    return { success: false as const, error: '分析项目结构失败，请检查模型配置后重试。' }
  }
}

export async function diagnoseWorkflow(projectId: string, workflowNotes: string) {
  const userId = await requireUserId()
  const notes = workflowNotes.trim()

  if (!notes) {
    return { success: false as const, error: '请先填写你的开发记录。' }
  }

  try {
    const project = await prisma.projectAnalysis.findFirst({
      where: { id: projectId, userId, deletedAt: null },
    })

    if (!project) {
      return { success: false as const, error: '项目不存在或已被删除。' }
    }

    const aiWorkflowSummary = await generateWorkflowDiagnosis(userId, project.directoryTree, notes)
    const updatedProject = await prisma.projectAnalysis.update({
      where: { id: projectId },
      data: {
        workflowNotes: notes,
        aiWorkflowSummary,
      },
    })

    revalidatePath('/')
    return { success: true as const, project: serializeProject(updatedProject) }
  } catch (error) {
    console.error('生成工作流诊断失败:', error)
    return { success: false as const, error: '生成工作流诊断失败，请稍后重试。' }
  }
}

export async function renameProject(projectId: string, newName: string) {
  const userId = await requireUserId()
  const projectName = newName.trim()

  if (!projectName) {
    return { success: false as const, error: '项目名称不能为空。' }
  }

  try {
    const result = await prisma.projectAnalysis.updateMany({
      where: { id: projectId, userId, deletedAt: null },
      data: { projectName },
    })

    if (!result.count) {
      return { success: false as const, error: '没有找到可重命名的项目。' }
    }

    const project = await prisma.projectAnalysis.findUnique({ where: { id: projectId } })

    if (!project) {
      return { success: false as const, error: '项目不存在。' }
    }

    revalidatePath('/')
    return { success: true as const, project: serializeProject(project) }
  } catch (error) {
    console.error('重命名项目失败:', error)
    return { success: false as const, error: '重命名项目失败，请稍后重试。' }
  }
}
