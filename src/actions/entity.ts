'use server'

import { NoteLinkTargetType } from '@prisma/client'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import type { EntityKind } from '@/lib/entities'
import { serializeNote, serializeNoteLink, serializeProject, serializeSnippet, serializeTerm } from '@/lib/serializers'

async function requireUserId() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('未授权访问。')
  }

  return userId
}

function mapTargetType(kind: EntityKind) {
  switch (kind) {
    case 'term':
      return NoteLinkTargetType.TERM
    case 'snippet':
      return NoteLinkTargetType.SNIPPET
    case 'project':
      return NoteLinkTargetType.PROJECT
    case 'note':
      return NoteLinkTargetType.NOTE
  }
}

export async function archiveEntity(kind: EntityKind, id: string) {
  const userId = await requireUserId()
  const deletedAt = new Date()

  try {
    switch (kind) {
      case 'term': {
        const result = await prisma.term.updateMany({
          where: { id, userId, deletedAt: null },
          data: { deletedAt },
        })

        if (!result.count) {
          return { success: false as const, error: '概念不存在或已被删除。' }
        }

        const term = await prisma.term.findUnique({ where: { id } })
        revalidatePath('/')
        return { success: true as const, item: term ? serializeTerm(term) : null }
      }
      case 'snippet': {
        const result = await prisma.snippet.updateMany({
          where: { id, userId, deletedAt: null },
          data: { deletedAt },
        })

        if (!result.count) {
          return { success: false as const, error: '代码片段不存在或已被删除。' }
        }

        const snippet = await prisma.snippet.findUnique({ where: { id } })
        revalidatePath('/')
        return { success: true as const, item: snippet ? serializeSnippet(snippet) : null }
      }
      case 'project': {
        const result = await prisma.projectAnalysis.updateMany({
          where: { id, userId, deletedAt: null },
          data: { deletedAt },
        })

        if (!result.count) {
          return { success: false as const, error: '项目不存在或已被删除。' }
        }

        const project = await prisma.projectAnalysis.findUnique({ where: { id } })
        revalidatePath('/')
        return { success: true as const, item: project ? serializeProject(project) : null }
      }
      case 'note': {
        const result = await prisma.note.updateMany({
          where: { id, userId, deletedAt: null },
          data: { deletedAt },
        })

        if (!result.count) {
          return { success: false as const, error: '笔记不存在或已被删除。' }
        }

        const note = await prisma.note.findUnique({ where: { id } })
        revalidatePath('/')
        return { success: true as const, item: note ? serializeNote(note) : null }
      }
    }
  } catch (error) {
    console.error('移入回收站失败:', error)
    return { success: false as const, error: '操作失败，请稍后重试。' }
  }
}

export async function restoreEntity(kind: EntityKind, id: string) {
  const userId = await requireUserId()

  try {
    switch (kind) {
      case 'term': {
        const result = await prisma.term.updateMany({
          where: { id, userId, NOT: { deletedAt: null } },
          data: { deletedAt: null },
        })

        if (!result.count) {
          return { success: false as const, error: '概念不存在或已恢复。' }
        }

        const term = await prisma.term.findUnique({ where: { id } })
        revalidatePath('/')
        return { success: true as const, item: term ? serializeTerm(term) : null }
      }
      case 'snippet': {
        const result = await prisma.snippet.updateMany({
          where: { id, userId, NOT: { deletedAt: null } },
          data: { deletedAt: null },
        })

        if (!result.count) {
          return { success: false as const, error: '代码片段不存在或已恢复。' }
        }

        const snippet = await prisma.snippet.findUnique({ where: { id } })
        revalidatePath('/')
        return { success: true as const, item: snippet ? serializeSnippet(snippet) : null }
      }
      case 'project': {
        const result = await prisma.projectAnalysis.updateMany({
          where: { id, userId, NOT: { deletedAt: null } },
          data: { deletedAt: null },
        })

        if (!result.count) {
          return { success: false as const, error: '项目不存在或已恢复。' }
        }

        const project = await prisma.projectAnalysis.findUnique({ where: { id } })
        revalidatePath('/')
        return { success: true as const, item: project ? serializeProject(project) : null }
      }
      case 'note': {
        const result = await prisma.note.updateMany({
          where: { id, userId, NOT: { deletedAt: null } },
          data: { deletedAt: null },
        })

        if (!result.count) {
          return { success: false as const, error: '笔记不存在或已恢复。' }
        }

        const [note, noteLinks] = await Promise.all([
          prisma.note.findUnique({ where: { id } }),
          prisma.noteLink.findMany({
            where: { sourceNoteId: id },
            orderBy: { createdAt: 'asc' },
          }),
        ])

        revalidatePath('/')
        return {
          success: true as const,
          item: note ? serializeNote(note) : null,
          links: noteLinks.map(serializeNoteLink),
        }
      }
    }
  } catch (error) {
    console.error('恢复实体失败:', error)
    return { success: false as const, error: '恢复失败，请稍后重试。' }
  }
}

export async function purgeEntity(kind: EntityKind, id: string) {
  const userId = await requireUserId()

  try {
    await prisma.noteLink.deleteMany({
      where: {
        OR: [{ targetType: mapTargetType(kind), targetId: id }],
      },
    })

    switch (kind) {
      case 'term': {
        const result = await prisma.term.deleteMany({ where: { id, userId } })

        if (!result.count) {
          return { success: false as const, error: '概念不存在。' }
        }
        break
      }
      case 'snippet': {
        const result = await prisma.snippet.deleteMany({ where: { id, userId } })

        if (!result.count) {
          return { success: false as const, error: '代码片段不存在。' }
        }
        break
      }
      case 'project': {
        const result = await prisma.projectAnalysis.deleteMany({ where: { id, userId } })

        if (!result.count) {
          return { success: false as const, error: '项目不存在。' }
        }
        break
      }
      case 'note': {
        await prisma.noteLink.deleteMany({
          where: { targetType: NoteLinkTargetType.NOTE, targetId: id },
        })

        const result = await prisma.note.deleteMany({ where: { id, userId } })

        if (!result.count) {
          return { success: false as const, error: '笔记不存在。' }
        }
        break
      }
    }

    revalidatePath('/')
    return { success: true as const }
  } catch (error) {
    console.error('彻底删除失败:', error)
    return { success: false as const, error: '彻底删除失败，请稍后重试。' }
  }
}
