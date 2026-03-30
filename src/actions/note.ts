'use server'

import { NoteLinkTargetType } from '@prisma/client'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { normalizeTags, parseWikiLinks, summarizeMarkdown } from '@/lib/notes'
import { serializeNote, serializeNoteLink } from '@/lib/serializers'

async function requireUserId() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('未授权访问。')
  }

  return userId
}

async function resolveLinks(userId: string, sourceNoteId: string, content: string) {
  const labels = parseWikiLinks(content)

  if (!labels.length) {
    return []
  }

  const [notes, terms, snippets, projects] = await Promise.all([
    prisma.note.findMany({
      where: { userId, deletedAt: null, NOT: { id: sourceNoteId } },
      select: { id: true, title: true },
    }),
    prisma.term.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, name: true },
    }),
    prisma.snippet.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, title: true },
    }),
    prisma.projectAnalysis.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, projectName: true },
    }),
  ])

  const noteMap = new Map(notes.map((item) => [item.title.toLowerCase(), item.id]))
  const termMap = new Map(terms.map((item) => [item.name.toLowerCase(), item.id]))
  const snippetMap = new Map(snippets.map((item) => [item.title.toLowerCase(), item.id]))
  const projectMap = new Map(projects.map((item) => [item.projectName.toLowerCase(), item.id]))

  return labels.map((item) => {
    const key = item.label.toLowerCase()

    if (noteMap.has(key)) {
      return {
        sourceNoteId,
        label: item.label,
        targetType: NoteLinkTargetType.NOTE,
        targetId: noteMap.get(key)!,
      }
    }

    if (termMap.has(key)) {
      return {
        sourceNoteId,
        label: item.label,
        targetType: NoteLinkTargetType.TERM,
        targetId: termMap.get(key)!,
      }
    }

    if (snippetMap.has(key)) {
      return {
        sourceNoteId,
        label: item.label,
        targetType: NoteLinkTargetType.SNIPPET,
        targetId: snippetMap.get(key)!,
      }
    }

    if (projectMap.has(key)) {
      return {
        sourceNoteId,
        label: item.label,
        targetType: NoteLinkTargetType.PROJECT,
        targetId: projectMap.get(key)!,
      }
    }

    return {
      sourceNoteId,
      label: item.label,
      targetType: NoteLinkTargetType.UNKNOWN,
      targetId: null,
    }
  })
}

async function syncLinks(userId: string, sourceNoteId: string, content: string) {
  await prisma.noteLink.deleteMany({ where: { sourceNoteId } })

  const resolvedLinks = await resolveLinks(userId, sourceNoteId, content)

  if (!resolvedLinks.length) {
    return []
  }

  await prisma.noteLink.createMany({ data: resolvedLinks })
  const links = await prisma.noteLink.findMany({
    where: { sourceNoteId },
    orderBy: { createdAt: 'asc' },
  })

  return links.map(serializeNoteLink)
}

export async function createNote(title: string, content: string, tags: string) {
  const userId = await requireUserId()
  const normalizedTitle = title.trim()
  const normalizedContent = content.trim()

  if (!normalizedTitle) {
    return { success: false as const, error: '笔记标题不能为空。' }
  }

  try {
    const note = await prisma.note.create({
      data: {
        userId,
        title: normalizedTitle,
        content: normalizedContent,
        summary: summarizeMarkdown(normalizedContent),
        tags: normalizeTags(tags),
      },
    })

    const links = await syncLinks(userId, note.id, note.content)
    revalidatePath('/')
    return {
      success: true as const,
      note: serializeNote(note),
      links,
    }
  } catch (error) {
    console.error('创建笔记失败:', error)
    return { success: false as const, error: '创建笔记失败，请稍后重试。' }
  }
}

export async function updateNote(noteId: string, title: string, content: string, tags: string) {
  const userId = await requireUserId()
  const normalizedTitle = title.trim()
  const normalizedContent = content.trim()

  if (!normalizedTitle) {
    return { success: false as const, error: '笔记标题不能为空。' }
  }

  try {
    const result = await prisma.note.updateMany({
      where: { id: noteId, userId, deletedAt: null },
      data: {
        title: normalizedTitle,
        content: normalizedContent,
        summary: summarizeMarkdown(normalizedContent),
        tags: normalizeTags(tags),
      },
    })

    if (!result.count) {
      return { success: false as const, error: '笔记不存在或已被删除。' }
    }

    const note = await prisma.note.findUnique({ where: { id: noteId } })

    if (!note) {
      return { success: false as const, error: '笔记不存在。' }
    }

    const links = await syncLinks(userId, note.id, note.content)
    revalidatePath('/')
    return {
      success: true as const,
      note: serializeNote(note),
      links,
    }
  } catch (error) {
    console.error('更新笔记失败:', error)
    return { success: false as const, error: '更新笔记失败，请稍后重试。' }
  }
}

export async function importNotes(items: Array<{ title: string; content: string; tags?: string }>) {
  const userId = await requireUserId()

  if (!items.length) {
    return { success: false as const, error: '没有可导入的 Markdown 文件。' }
  }

  try {
    const createdNotes = []

    for (const item of items) {
      const title = item.title.trim()

      if (!title) {
        continue
      }

      const note = await prisma.note.create({
        data: {
          userId,
          title,
          content: item.content.trim(),
          summary: summarizeMarkdown(item.content),
          tags: normalizeTags(item.tags ?? ''),
        },
      })

      createdNotes.push(note)
    }

    const allLinks = []

    for (const note of createdNotes) {
      const links = await syncLinks(userId, note.id, note.content)
      allLinks.push(...links)
    }

    revalidatePath('/')
    return {
      success: true as const,
      notes: createdNotes.map(serializeNote),
      links: allLinks,
    }
  } catch (error) {
    console.error('导入 Markdown 失败:', error)
    return { success: false as const, error: '导入 Markdown 失败，请稍后重试。' }
  }
}
