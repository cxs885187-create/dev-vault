'use client'

import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { archiveEntity, purgeEntity, restoreEntity } from '@/actions/entity'
import { createNote, importNotes, updateNote } from '@/actions/note'
import { createTerm } from '@/actions/term'
import { appCopy, getArchiveSuccessMessage, getPurgeSuccessMessage, getRestoreSuccessMessage } from '@/lib/copy'
import type {
  ClientNote,
  ClientNoteLink,
  ClientProject,
  ClientSnippet,
  ClientTerm,
  EntityKind,
  TabId,
  ToastTone,
  WorkspaceSnapshot,
} from '@/lib/entities'
import { sanitizeMarkdownFileName, splitTags, toMarkdownDocument } from '@/lib/notes'
import { EditableProjectTitle } from './EditableProjectTitle'
import { EditableSnippetTitle } from './EditableSnippetTitle'
import { LocalFileReader } from './LocalFileReader'
import { MermaidRenderer } from './MermaidRenderer'
import { ProjectFolderReader } from './ProjectFolderReader'
import { SearchBar } from './SearchBar'
import { SettingsModal } from './SettingsModal'
import { WorkflowDiagnostic } from './WorkflowDiagnostic'

type ToastItem = {
  id: number
  tone: ToastTone
  message: string
  actionLabel?: string
  onAction?: () => void | Promise<void>
}

type NoteDraft = {
  id: string | null
  title: string
  tags: string
  content: string
  initialTitle: string
  initialTags: string
  initialContent: string
}

type FilePickerWindow = Window & {
  showOpenFilePicker?: (options?: {
    excludeAcceptAllOption?: boolean
    multiple?: boolean
    types?: Array<{
      description?: string
      accept: Record<string, string[]>
    }>
  }) => Promise<Array<{ getFile: () => Promise<File> }>>
  showDirectoryPicker?: () => Promise<{
    getFileHandle: (
      name: string,
      options?: { create?: boolean },
    ) => Promise<{ createWritable: () => Promise<{ write: (content: string) => Promise<void>; close: () => Promise<void> }> }>
  }>
}

interface Props {
  snapshot: WorkspaceSnapshot
  initialTab: TabId
  initialQuery: string
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatCount(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-panel px-6 py-10 text-center">
      <p className="text-lg font-semibold text-[var(--ink)]">{title}</p>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-stone-600">{description}</p>
    </div>
  )
}

function SectionHeading({
  title,
  description,
  badge,
  actions,
}: {
  title: string
  description: string
  badge?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="section-kicker">{title}</p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {badge ? <span className="tag">{badge}</span> : null}
        {actions}
      </div>
    </div>
  )
}

function createNoteDraft(note?: ClientNote): NoteDraft {
  return {
    id: note?.id ?? null,
    title: note?.title ?? '',
    tags: note?.tags ?? '',
    content: note?.content ?? '',
    initialTitle: note?.title ?? '',
    initialTags: note?.tags ?? '',
    initialContent: note?.content ?? '',
  }
}

export function WorkspaceClient({ snapshot, initialTab, initialQuery }: Props) {
  const [terms, setTerms] = useState(snapshot.terms)
  const [snippets, setSnippets] = useState(snapshot.snippets)
  const [projects, setProjects] = useState(snapshot.projects)
  const [notes, setNotes] = useState(snapshot.notes)
  const [links, setLinks] = useState(snapshot.links)
  const [deletedTerms, setDeletedTerms] = useState(snapshot.deletedTerms)
  const [deletedSnippets, setDeletedSnippets] = useState(snapshot.deletedSnippets)
  const [deletedProjects, setDeletedProjects] = useState(snapshot.deletedProjects)
  const [deletedNotes, setDeletedNotes] = useState(snapshot.deletedNotes)
  const [userConfig, setUserConfig] = useState(snapshot.userConfig)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [pendingOperations, setPendingOperations] = useState<string[]>([])
  const [termInput, setTermInput] = useState('')
  const [termError, setTermError] = useState<string | null>(null)
  const [isCreatingTerm, setIsCreatingTerm] = useState(false)
  const [noteDraft, setNoteDraft] = useState<NoteDraft | null>(null)
  const [queuedNoteDraft, setQueuedNoteDraft] = useState<NoteDraft | null>(null)
  const [showDiscardNotePrompt, setShowDiscardNotePrompt] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [isImportingNotes, setIsImportingNotes] = useState(false)
  const [isExportingNotes, setIsExportingNotes] = useState(false)

  const activeQuery = initialQuery.trim().toLowerCase()
  const isSearching = Boolean(activeQuery)
  const currentTab = initialTab
  const noteDraftIsDirty =
    !!noteDraft &&
    (noteDraft.title !== noteDraft.initialTitle ||
      noteDraft.tags !== noteDraft.initialTags ||
      noteDraft.content !== noteDraft.initialContent)

  const queryMatches = useCallback(
    (value: string | null | undefined) => value?.toLowerCase().includes(activeQuery),
    [activeQuery],
  )

  const filteredTerms = useMemo(
    () => (!isSearching ? terms : terms.filter((item) => queryMatches(item.name) || queryMatches(item.aiSummary))),
    [isSearching, terms, queryMatches],
  )

  const filteredSnippets = useMemo(
    () =>
      !isSearching
        ? snippets
        : snippets.filter((item) => queryMatches(item.title) || queryMatches(item.explanation) || queryMatches(item.code)),
    [isSearching, snippets, queryMatches],
  )

  const filteredProjects = useMemo(
    () =>
      !isSearching
        ? projects
        : projects.filter(
            (item) =>
              queryMatches(item.projectName) ||
              queryMatches(item.directoryTree) ||
              queryMatches(item.workflowNotes) ||
              queryMatches(item.aiWorkflowSummary),
          ),
    [isSearching, projects, queryMatches],
  )

  const filteredNotes = useMemo(
    () =>
      !isSearching
        ? notes
        : notes.filter((item) => queryMatches(item.title) || queryMatches(item.content) || queryMatches(item.summary) || queryMatches(item.tags)),
    [isSearching, notes, queryMatches],
  )

  const recycleItems = useMemo(
    () => [
      ...deletedTerms.map((item) => ({ kind: 'term' as const, item, title: item.name })),
      ...deletedSnippets.map((item) => ({ kind: 'snippet' as const, item, title: item.title })),
      ...deletedProjects.map((item) => ({ kind: 'project' as const, item, title: item.projectName })),
      ...deletedNotes.map((item) => ({ kind: 'note' as const, item, title: item.title })),
    ],
    [deletedNotes, deletedProjects, deletedSnippets, deletedTerms],
  )

  const quickStats = [
    { label: '有效记录', value: terms.length + snippets.length + projects.length + notes.length },
    { label: 'Markdown 笔记', value: notes.length },
    { label: '回收站', value: recycleItems.length },
    { label: '当前模型', value: userConfig.modelName || '系统默认' },
  ]

  const navItems = (['home', 'terms', 'snippets', 'projects', 'notes', 'recycle'] as TabId[]).map((tab) => ({
    id: tab,
    label: appCopy.tabs[tab].label,
    description: appCopy.tabs[tab].description,
    count:
      tab === 'home'
        ? terms.length + snippets.length + projects.length + notes.length
        : tab === 'terms'
          ? terms.length
          : tab === 'snippets'
            ? snippets.length
            : tab === 'projects'
              ? projects.length
              : tab === 'notes'
                ? notes.length
                : recycleItems.length,
  }))

  const addToast = (toast: Omit<ToastItem, 'id'>, duration = 4000) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((current) => [...current, { id, ...toast }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id))
    }, duration)
  }

  const getTabHref = (tab: TabId) => {
    const params = new URLSearchParams()
    if (tab !== 'home') {
      params.set('tab', tab)
    }
    if (initialQuery.trim()) {
      params.set('q', initialQuery.trim())
    }
    const value = params.toString()
    return value ? `/?${value}` : '/'
  }

  const getOperationKey = (action: string, kind: EntityKind, id: string) => `${action}:${kind}:${id}`
  const isOperationPending = (key: string) => pendingOperations.includes(key)
  const setOperationPending = (key: string, isPending: boolean) => {
    setPendingOperations((current) =>
      isPending ? [...new Set([...current, key])] : current.filter((item) => item !== key),
    )
  }

  const replaceLinksForNote = (noteId: string, nextLinks: ClientNoteLink[]) => {
    setLinks((current) => [...current.filter((item) => item.sourceNoteId !== noteId), ...nextLinks])
  }

  const removeLinksForEntity = (kind: EntityKind, id: string) => {
    setLinks((current) =>
      current.filter((item) => {
        if (item.sourceNoteId === id && kind === 'note') return false
        if (kind === 'note' && item.targetType === 'NOTE' && item.targetId === id) return false
        if (kind === 'term' && item.targetType === 'TERM' && item.targetId === id) return false
        if (kind === 'snippet' && item.targetType === 'SNIPPET' && item.targetId === id) return false
        if (kind === 'project' && item.targetType === 'PROJECT' && item.targetId === id) return false
        return true
      }),
    )
  }

  const removeActiveItem = (kind: EntityKind, id: string) => {
    if (kind === 'term') setTerms((current) => current.filter((item) => item.id !== id))
    if (kind === 'snippet') setSnippets((current) => current.filter((item) => item.id !== id))
    if (kind === 'project') setProjects((current) => current.filter((item) => item.id !== id))
    if (kind === 'note') setNotes((current) => current.filter((item) => item.id !== id))
  }

  const addDeletedItem = (kind: EntityKind, item: ClientTerm | ClientSnippet | ClientProject | ClientNote) => {
    if (kind === 'term') setDeletedTerms((current) => [item as ClientTerm, ...current.filter((entry) => entry.id !== item.id)])
    if (kind === 'snippet') setDeletedSnippets((current) => [item as ClientSnippet, ...current.filter((entry) => entry.id !== item.id)])
    if (kind === 'project') setDeletedProjects((current) => [item as ClientProject, ...current.filter((entry) => entry.id !== item.id)])
    if (kind === 'note') setDeletedNotes((current) => [item as ClientNote, ...current.filter((entry) => entry.id !== item.id)])
  }

  const removeDeletedItem = (kind: EntityKind, id: string) => {
    if (kind === 'term') setDeletedTerms((current) => current.filter((item) => item.id !== id))
    if (kind === 'snippet') setDeletedSnippets((current) => current.filter((item) => item.id !== id))
    if (kind === 'project') setDeletedProjects((current) => current.filter((item) => item.id !== id))
    if (kind === 'note') setDeletedNotes((current) => current.filter((item) => item.id !== id))
  }

  const upsertActiveItem = (kind: EntityKind, item: ClientTerm | ClientSnippet | ClientProject | ClientNote) => {
    if (kind === 'term') return setTerms((current) => [item as ClientTerm, ...current.filter((entry) => entry.id !== item.id)])
    if (kind === 'snippet') return setSnippets((current) => [item as ClientSnippet, ...current.filter((entry) => entry.id !== item.id)])
    if (kind === 'project') return setProjects((current) => [item as ClientProject, ...current.filter((entry) => entry.id !== item.id)])
    setNotes((current) => [item as ClientNote, ...current.filter((entry) => entry.id !== item.id)])
  }

  const handleToastMessage = (message: { tone: ToastTone; text: string }) => {
    addToast({ tone: message.tone, message: message.text })
  }

  const openDraft = (draft: NoteDraft) => {
    if (noteDraftIsDirty) {
      setQueuedNoteDraft(draft)
      setShowDiscardNotePrompt(true)
      return
    }
    setQueuedNoteDraft(null)
    setShowDiscardNotePrompt(false)
    setNoteError(null)
    setNoteDraft(draft)
  }

  const openNewNote = () => openDraft(createNoteDraft())
  const openEditNote = (note: ClientNote) => openDraft(createNoteDraft(note))

  const closeNoteDraftImmediately = () => {
    setQueuedNoteDraft(null)
    setShowDiscardNotePrompt(false)
    setNoteError(null)
    setNoteDraft(null)
  }

  const requestCloseNoteDraft = () => {
    if (noteDraftIsDirty) {
      setQueuedNoteDraft(null)
      setShowDiscardNotePrompt(true)
      return
    }
    closeNoteDraftImmediately()
  }

  const discardNoteDraftChanges = () => {
    setNoteError(null)
    setShowDiscardNotePrompt(false)
    if (queuedNoteDraft) {
      setNoteDraft(queuedNoteDraft)
      setQueuedNoteDraft(null)
      return
    }
    setNoteDraft(null)
  }

  const getBacklinkNotes = (kind: EntityKind, id: string) => {
    const targetType = kind === 'term' ? 'TERM' : kind === 'snippet' ? 'SNIPPET' : kind === 'project' ? 'PROJECT' : 'NOTE'
    const sourceNoteIds = links
      .filter((link) => link.targetType === targetType && link.targetId === id)
      .map((link) => link.sourceNoteId)
    return notes.filter((note) => sourceNoteIds.includes(note.id))
  }

  const getOutgoingLinks = (noteId: string) => links.filter((item) => item.sourceNoteId === noteId)

  const handleArchive = async (kind: EntityKind, id: string, title: string) => {
    const key = getOperationKey('archive', kind, id)
    if (isOperationPending(key)) return

    setOperationPending(key, true)
    const result = await archiveEntity(kind, id)
    setOperationPending(key, false)

    if (!result.success || !result.item) {
      addToast({ tone: 'error', message: result.error ?? '操作失败，请稍后重试。' })
      return
    }

    if (kind === 'note' && noteDraft?.id === id) {
      closeNoteDraftImmediately()
    }

    removeActiveItem(kind, id)
    addDeletedItem(kind, result.item)
    addToast(
      {
        tone: 'info',
        message: getArchiveSuccessMessage(kind, title),
        actionLabel: appCopy.common.undo,
        onAction: async () => handleRestore(kind, id, title),
      },
      8000,
    )
  }

  const handleRestore = async (kind: EntityKind, id: string, title: string) => {
    const key = getOperationKey('restore', kind, id)
    if (isOperationPending(key)) return

    setOperationPending(key, true)
    const result = await restoreEntity(kind, id)
    setOperationPending(key, false)

    if (!result.success || !result.item) {
      addToast({ tone: 'error', message: result.error ?? '恢复失败，请稍后重试。' })
      return
    }

    removeDeletedItem(kind, id)
    upsertActiveItem(kind, result.item)
    if (kind === 'note' && 'links' in result && result.links) {
      replaceLinksForNote(id, result.links)
    }
    addToast({ tone: 'success', message: getRestoreSuccessMessage(kind, title) })
  }

  const handlePurge = async (kind: EntityKind, id: string, title: string) => {
    const key = getOperationKey('purge', kind, id)
    if (isOperationPending(key)) return

    setOperationPending(key, true)
    const result = await purgeEntity(kind, id)
    setOperationPending(key, false)

    if (!result.success) {
      addToast({ tone: 'error', message: result.error ?? '彻底删除失败，请稍后重试。' })
      return
    }

    removeDeletedItem(kind, id)
    removeLinksForEntity(kind, id)
    if (kind === 'note' && noteDraft?.id === id) {
      closeNoteDraftImmediately()
    }
    addToast({ tone: 'success', message: getPurgeSuccessMessage(kind, title) })
  }

  const handleCreateTerm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsCreatingTerm(true)
    setTermError(null)

    const result = await createTerm(termInput)
    setIsCreatingTerm(false)

    if (!result.success || !result.term) {
      setTermError(result.error ?? '创建概念失败，请稍后重试。')
      return
    }

    upsertActiveItem('term', result.term)
    setTermInput('')
    addToast({ tone: 'success', message: `概念“${result.term.name}”已保存。` })
  }

  const handleSaveNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!noteDraft) return

    const title = noteDraft.title.trim()
    const content = noteDraft.content.trim()
    if (!title) {
      setNoteError('笔记标题不能为空。')
      return
    }

    setIsSavingNote(true)
    setNoteError(null)
    const result = noteDraft.id ? await updateNote(noteDraft.id, title, content, noteDraft.tags) : await createNote(title, content, noteDraft.tags)
    setIsSavingNote(false)

    if (!result.success || !result.note) {
      setNoteError(result.error ?? '保存笔记失败，请稍后重试。')
      return
    }

    upsertActiveItem('note', result.note)
    replaceLinksForNote(result.note.id, result.links)
    closeNoteDraftImmediately()
    addToast({ tone: 'success', message: noteDraft.id ? `笔记“${title}”已更新。` : `笔记“${title}”已创建。` })
  }

  const handleImportMarkdown = async () => {
    const picker = window as FilePickerWindow
    if (!picker.showOpenFilePicker) {
      addToast({ tone: 'error', message: '当前浏览器不支持批量导入 Markdown 文件。' })
      return
    }

    try {
      setIsImportingNotes(true)
      const fileHandles = await picker.showOpenFilePicker({
        excludeAcceptAllOption: false,
        multiple: true,
        types: [{ description: 'Markdown 文件', accept: { 'text/markdown': ['.md', '.markdown'] } }],
      })
      const entries = await Promise.all(
        fileHandles.map(async (handle) => {
          const file = await handle.getFile()
          return { title: file.name.replace(/\.(md|markdown)$/i, ''), content: await file.text() }
        }),
      )
      const result = await importNotes(entries)

      if (!result.success) {
        addToast({ tone: 'error', message: result.error ?? '导入 Markdown 失败，请稍后重试。' })
        return
      }

      setNotes((current) => [...result.notes, ...current.filter((item) => !result.notes.some((note) => note.id === item.id))])
      setLinks((current) => {
        const sourceIds = new Set(result.notes.map((note) => note.id))
        return [...current.filter((item) => !sourceIds.has(item.sourceNoteId)), ...result.links]
      })
      addToast({ tone: 'success', message: `已导入 ${result.notes.length} 条 Markdown 笔记。` })
    } catch (error) {
      const pickerError = error as { name?: string }
      if (pickerError.name !== 'AbortError') {
        console.error('导入 Markdown 失败:', error)
        addToast({ tone: 'error', message: '导入 Markdown 失败，请稍后重试。' })
      }
    } finally {
      setIsImportingNotes(false)
    }
  }

  const downloadMarkdown = (note: ClientNote) => {
    const blob = new Blob([toMarkdownDocument(note.title, note.content, note.tags)], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${sanitizeMarkdownFileName(note.title)}.md`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleExportAllNotes = async () => {
    if (!notes.length) {
      addToast({ tone: 'info', message: '当前没有可导出的 Markdown 笔记。' })
      return
    }

    const picker = window as FilePickerWindow

    try {
      setIsExportingNotes(true)
      if (picker.showDirectoryPicker) {
        const directoryHandle = await picker.showDirectoryPicker()
        for (const note of notes) {
          const fileHandle = await directoryHandle.getFileHandle(`${sanitizeMarkdownFileName(note.title)}.md`, { create: true })
          const writable = await fileHandle.createWritable()
          await writable.write(toMarkdownDocument(note.title, note.content, note.tags))
          await writable.close()
        }
        addToast({ tone: 'success', message: `已导出 ${notes.length} 条 Markdown 笔记。` })
        return
      }

      const bundle = notes.map((note) => `# ${note.title}\n\n${toMarkdownDocument(note.title, note.content, note.tags)}`).join('\n\n---\n\n')
      const blob = new Blob([bundle], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'devvault-notes.md'
      anchor.click()
      URL.revokeObjectURL(url)
      addToast({ tone: 'success', message: '已导出 Markdown 笔记合集。' })
    } catch (error) {
      const pickerError = error as { name?: string }
      if (pickerError.name !== 'AbortError') {
        console.error('导出 Markdown 失败:', error)
        addToast({ tone: 'error', message: '导出 Markdown 失败，请稍后重试。' })
      }
    } finally {
      setIsExportingNotes(false)
    }
  }

  const shouldShowTerms = isSearching ? filteredTerms.length > 0 : currentTab === 'terms'
  const shouldShowSnippets = isSearching ? filteredSnippets.length > 0 : currentTab === 'snippets'
  const shouldShowProjects = isSearching ? filteredProjects.length > 0 : currentTab === 'projects'
  const shouldShowNotes = isSearching ? filteredNotes.length > 0 : currentTab === 'notes'
  const showNoResults = isSearching && !filteredTerms.length && !filteredSnippets.length && !filteredProjects.length && !filteredNotes.length

  return (
    <main className="min-h-screen text-stone-900">
      <div className="mx-auto flex max-w-[1760px] flex-col gap-6 px-4 py-4 lg:h-screen lg:flex-row lg:overflow-hidden lg:px-6 lg:py-6">
        <aside className="w-full lg:w-[330px] lg:flex-shrink-0">
          <div className="app-panel flex h-full flex-col p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="section-kicker">{appCopy.brand.name}</p>
                <h1 className="mt-3 text-3xl font-semibold text-[var(--ink)]">{appCopy.brand.title}</h1>
                <p className="mt-4 text-sm leading-7 text-stone-600">{appCopy.brand.description}</p>
              </div>
              <span className="tag">{appCopy.brand.badge}</span>
            </div>

            <div className="mt-6">
              <SearchBar />
            </div>

            <nav className="mt-8 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  href={getTabHref(item.id)}
                  className={`block rounded-[24px] border px-4 py-4 transition ${
                    currentTab === item.id
                      ? 'border-teal-200 bg-[var(--teal-soft)] shadow-[0_16px_40px_rgba(15,118,110,0.12)]'
                      : 'border-transparent bg-white/45 hover:border-stone-200 hover:bg-white/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--ink)]">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-stone-500">{item.description}</p>
                    </div>
                    <span className="tag">{formatCount(item.count)}</span>
                  </div>
                </Link>
              ))}
            </nav>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {quickStats.map((stat) => (
                <div key={stat.label} className="metric-tile">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">
                    {typeof stat.value === 'number' ? formatCount(stat.value) : stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col gap-6">
          <header className="app-panel flex flex-col gap-5 px-6 py-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="section-kicker">{isSearching ? '搜索结果' : appCopy.tabs[currentTab].label}</p>
              <h2 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight text-[var(--ink)] sm:text-4xl">
                {isSearching ? `围绕“${initialQuery.trim()}”找到的知识结果` : '把理解成本高的内容，整理成可回看、可恢复的工作台。'}
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600">
                {isSearching ? '搜索默认排除回收站内容，并同时扫描概念、代码、项目与笔记。' : appCopy.tabs[currentTab].description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isSearching ? (
                <Link href={currentTab === 'home' ? '/' : `/?tab=${currentTab}`} className="secondary-button">
                  清除搜索
                </Link>
              ) : null}
              <SettingsModal initialConfig={userConfig} onSaved={setUserConfig} />
              <div className="rounded-full border border-white/70 bg-white/75 p-1 shadow-sm">
                <UserButton />
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-8 pb-10">
              {!isSearching && currentTab === 'home' ? (
                <>
                  <section className="app-panel px-6 py-6">
                    <p className="section-kicker">Workspace Overview</p>
                    <h3 className="mt-3 text-3xl font-semibold text-[var(--ink)]">稳定、统一、可回退的 AI 知识工作台</h3>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600">
                      DevVault 现在围绕概念、代码、项目和 Markdown 笔记组织内容，并用回收站、撤回和双向链接增强用户体验。
                    </p>
                  </section>

                  <div className="grid gap-6 xl:grid-cols-3">
                    <section className="app-panel p-6">
                      <p className="section-kicker">概念知识库</p>
                      <h3 className="mt-3 text-2xl font-semibold text-[var(--ink)]">记录一个新概念</h3>
                      <form onSubmit={handleCreateTerm} className="mt-6 space-y-4">
                        <input
                          type="text"
                          value={termInput}
                          onChange={(event) => setTermInput(event.target.value)}
                          placeholder="例如 Zustand、事件循环、gRPC"
                          className="app-input text-sm"
                        />
                        {termError ? <div className="rounded-3xl border border-rose-200 bg-[var(--rose-soft)] px-4 py-3 text-sm text-rose-700">{termError}</div> : null}
                        <div className="flex justify-end">
                          <button type="submit" disabled={isCreatingTerm} className="primary-button">
                            {isCreatingTerm ? '生成中' : '解释并保存'}
                          </button>
                        </div>
                      </form>
                    </section>
                    <LocalFileReader onCreated={(item) => upsertActiveItem('snippet', item)} onMessage={handleToastMessage} />
                    <ProjectFolderReader onCreated={(item) => upsertActiveItem('project', item)} onMessage={handleToastMessage} />
                  </div>
                </>
              ) : null}

              {shouldShowTerms ? (
                <section className="space-y-5">
                  <SectionHeading title="概念知识库" description="把复杂名词沉淀成结构化解释卡片。" badge={`${formatCount(filteredTerms.length)} 条概念`} />
                  {!isSearching ? (
                    <section className="app-panel p-6">
                      <form onSubmit={handleCreateTerm} className="space-y-4">
                        <input type="text" value={termInput} onChange={(event) => setTermInput(event.target.value)} placeholder="输入你刚碰到的新概念" className="app-input text-sm" />
                        {termError ? <div className="rounded-3xl border border-rose-200 bg-[var(--rose-soft)] px-4 py-3 text-sm text-rose-700">{termError}</div> : null}
                        <div className="flex justify-end">
                          <button type="submit" disabled={isCreatingTerm} className="primary-button">{isCreatingTerm ? '生成中' : '解释并保存'}</button>
                        </div>
                      </form>
                    </section>
                  ) : null}
                  {filteredTerms.length ? (
                    <div className="grid gap-5">
                      {filteredTerms.map((term) => (
                        <article key={term.id} className="data-card p-6">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="section-kicker">概念卡片</p>
                              <h3 className="mt-3 text-2xl font-semibold text-[var(--ink)]">{term.name}</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="tag">{formatDate(term.createdAt)}</span>
                              <button type="button" onClick={() => handleArchive('term', term.id, term.name)} disabled={isOperationPending(getOperationKey('archive', 'term', term.id))} className="secondary-button">移入回收站</button>
                            </div>
                          </div>
                          <p className="mt-5 whitespace-pre-wrap text-sm leading-8 text-stone-700">{term.aiSummary || '暂未生成解释。'}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="还没有概念卡片" description="从最近刚查过的技术词开始，把解释沉淀成自己的知识资产。" />
                  )}
                </section>
              ) : null}

              {shouldShowSnippets ? (
                <section className="space-y-5">
                  <SectionHeading title="代码片段库" description="保留代码本身，也保留 AI 说明。" badge={`${formatCount(filteredSnippets.length)} 条片段`} />
                  {!isSearching ? <LocalFileReader onCreated={(item) => upsertActiveItem('snippet', item)} onMessage={handleToastMessage} /> : null}
                  {filteredSnippets.length ? (
                    <div className="grid gap-6">
                      {filteredSnippets.map((snippet) => (
                        <article key={snippet.id} className="data-card overflow-hidden">
                          <div className="px-6 py-6">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <EditableSnippetTitle snippetId={snippet.id} initialTitle={snippet.title} onSaved={(item) => upsertActiveItem('snippet', item)} />
                              <div className="flex flex-wrap gap-2">
                                <span className="tag">{snippet.language}</span>
                                <span className="tag">{formatDate(snippet.createdAt)}</span>
                                <button type="button" onClick={() => handleArchive('snippet', snippet.id, snippet.title)} disabled={isOperationPending(getOperationKey('archive', 'snippet', snippet.id))} className="secondary-button">移入回收站</button>
                              </div>
                            </div>
                          </div>
                          <div className="surface-divider grid gap-5 px-6 py-6 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)]">
                            <div className="rounded-[28px] border border-teal-100 bg-[var(--teal-soft)]/80 p-5">
                              <p className="section-kicker">AI 解释</p>
                              <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-stone-700">{snippet.explanation || '暂未生成说明。'}</p>
                            </div>
                            <pre className="code-surface max-h-[460px] overflow-auto rounded-[28px] p-5 text-sm leading-7"><code>{snippet.code}</code></pre>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="还没有代码片段" description="导入一段以后会反复参考的实现，开始建立自己的代码资产库。" />
                  )}
                </section>
              ) : null}

              {shouldShowProjects ? (
                <section className="space-y-5">
                  <SectionHeading title="项目结构库" description="先看懂结构，再做维护和重构。" badge={`${formatCount(filteredProjects.length)} 个项目`} />
                  {!isSearching ? <ProjectFolderReader onCreated={(item) => upsertActiveItem('project', item)} onMessage={handleToastMessage} /> : null}
                  {filteredProjects.length ? (
                    <div className="grid gap-6">
                      {filteredProjects.map((project) => (
                        <article key={project.id} className="data-card p-6">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <EditableProjectTitle projectId={project.id} initialName={project.projectName} onSaved={(item) => upsertActiveItem('project', item)} />
                            <div className="flex flex-wrap gap-2">
                              <span className="tag">{formatDate(project.createdAt)}</span>
                              <button type="button" onClick={() => handleArchive('project', project.id, project.projectName)} disabled={isOperationPending(getOperationKey('archive', 'project', project.id))} className="secondary-button">移入回收站</button>
                            </div>
                          </div>
                          {project.mermaidCode ? <div className="mt-6"><MermaidRenderer chartCode={project.mermaidCode} /></div> : null}
                          <details className="mt-6 overflow-hidden rounded-[28px] border border-stone-200/70 bg-stone-50/90">
                            <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-stone-700">查看原始目录树</summary>
                            <div className="surface-divider px-5 py-5">
                              <pre className="overflow-auto text-xs leading-6 text-stone-700"><code>{project.directoryTree}</code></pre>
                            </div>
                          </details>
                          <WorkflowDiagnostic projectId={project.id} existingNotes={project.workflowNotes} existingSummary={project.aiWorkflowSummary} onSaved={(item) => upsertActiveItem('project', item)} />
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="还没有项目分析" description="导入一个仓库目录，先把结构图与上下文建立起来。" />
                  )}
                </section>
              ) : null}

              {shouldShowNotes ? (
                <section className="space-y-5">
                  <SectionHeading
                    title="笔记"
                    description="自由编辑 Markdown，建立标签和双向链接。"
                    badge={`${formatCount(filteredNotes.length)} 条笔记`}
                    actions={
                      <>
                        <button type="button" onClick={handleImportMarkdown} disabled={isImportingNotes} className="secondary-button">{isImportingNotes ? '导入中' : '导入 Markdown'}</button>
                        <button type="button" onClick={handleExportAllNotes} disabled={isExportingNotes} className="secondary-button">{isExportingNotes ? '导出中' : '批量导出'}</button>
                        <button type="button" onClick={openNewNote} className="primary-button">新建笔记</button>
                      </>
                    }
                  />
                  {noteDraft ? (
                    <section className="app-panel p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="section-kicker">{noteDraft.id ? '编辑笔记' : '新建笔记'}</p>
                          <h3 className="mt-3 text-2xl font-semibold text-[var(--ink)]">{noteDraft.id ? '更新这条 Markdown 笔记' : '创建一条新的 Markdown 笔记'}</h3>
                        </div>
                        <span className="tag">支持 [[双向链接]]</span>
                      </div>
                      <form onSubmit={handleSaveNote} className="mt-6 space-y-4">
                        <input type="text" value={noteDraft.title} onChange={(event) => { setNoteError(null); setNoteDraft((current) => (current ? { ...current, title: event.target.value } : current)) }} placeholder="笔记标题" className="app-input text-sm" />
                        <input type="text" value={noteDraft.tags} onChange={(event) => { setNoteError(null); setNoteDraft((current) => (current ? { ...current, tags: event.target.value } : current)) }} placeholder="标签，使用英文逗号分隔" className="app-input text-sm" />
                        <textarea value={noteDraft.content} onChange={(event) => { setNoteError(null); setNoteDraft((current) => (current ? { ...current, content: event.target.value } : current)) }} placeholder="可以使用 [[概念名称]]、[[笔记标题]]、[[代码片段名]]、[[项目名]] 进行链接。" className="app-input min-h-64 resize-y text-sm leading-7" />
                        {noteError ? <div className="rounded-3xl border border-rose-200 bg-[var(--rose-soft)] px-4 py-3 text-sm text-rose-700">{noteError}</div> : null}
                        {showDiscardNotePrompt ? (
                          <div className="rounded-3xl border border-amber-200 bg-[var(--amber-soft)] px-4 py-4 text-sm text-amber-900">
                            <p>你有未保存的笔记修改。确定要放弃吗？</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button type="button" className="secondary-button" onClick={() => setShowDiscardNotePrompt(false)}>继续编辑</button>
                              <button type="button" className="primary-button" onClick={discardNoteDraftChanges}>放弃修改</button>
                            </div>
                          </div>
                        ) : null}
                        <div className="flex flex-wrap justify-end gap-3">
                          <button type="button" onClick={requestCloseNoteDraft} className="secondary-button">取消</button>
                          <button type="submit" disabled={isSavingNote} className="primary-button">{isSavingNote ? '保存中' : noteDraft.id ? '保存更新' : '创建笔记'}</button>
                        </div>
                      </form>
                    </section>
                  ) : null}
                  {filteredNotes.length ? (
                    <div className="grid gap-5">
                      {filteredNotes.map((note) => {
                        const outgoingLinks = getOutgoingLinks(note.id)
                        const backlinks = getBacklinkNotes('note', note.id)
                        return (
                          <article key={note.id} className="data-card p-6">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="section-kicker">Markdown 笔记</p>
                                <h3 className="mt-3 text-2xl font-semibold text-[var(--ink)]">{note.title}</h3>
                                <p className="mt-2 text-sm text-stone-500">{note.summary}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className="tag">{formatDate(note.updatedAt)}</span>
                                <button type="button" onClick={() => downloadMarkdown(note)} className="secondary-button">导出</button>
                                <button type="button" onClick={() => openEditNote(note)} className="secondary-button">编辑</button>
                                <button type="button" onClick={() => handleArchive('note', note.id, note.title)} disabled={isOperationPending(getOperationKey('archive', 'note', note.id))} className="secondary-button">移入回收站</button>
                              </div>
                            </div>
                            {splitTags(note.tags).length ? <div className="mt-4 flex flex-wrap gap-2">{splitTags(note.tags).map((tag) => <span key={tag} className="tag">#{tag}</span>)}</div> : null}
                            <pre className="mt-5 overflow-auto rounded-[28px] border border-stone-200/70 bg-stone-50/90 p-5 text-sm leading-7 text-stone-700"><code>{note.content}</code></pre>
                            {outgoingLinks.length ? <div className="mt-5 flex flex-wrap gap-2"><span className="tag">出链</span>{outgoingLinks.map((link) => <span key={link.id} className="tag">{link.label}{link.targetType === 'UNKNOWN' ? '（未解析）' : ''}</span>)}</div> : null}
                            {backlinks.length ? <div className="mt-5 flex flex-wrap gap-2"><span className="tag">反向链接</span>{backlinks.map((backlink) => <button key={backlink.id} type="button" onClick={() => openEditNote(backlink)} className="secondary-button">{backlink.title}</button>)}</div> : null}
                          </article>
                        )
                      })}
                    </div>
                  ) : (
                    <EmptyState title="还没有 Markdown 笔记" description="创建一条笔记，或者从本地导入 Markdown 文件。" />
                  )}
                </section>
              ) : null}

              {!isSearching && currentTab === 'recycle' ? (
                <section className="space-y-5">
                  <SectionHeading title="回收站" description="所有删除操作会先进入回收站，你可以恢复或彻底删除。" badge={`${formatCount(recycleItems.length)} 条记录`} />
                  {recycleItems.length ? (
                    <div className="grid gap-5">
                      {recycleItems.map(({ kind, item, title }) => (
                        <article key={`${kind}-${item.id}`} className="data-card p-6">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="section-kicker">{appCopy.entityNames[kind]}</p>
                              <h3 className="mt-3 text-2xl font-semibold text-[var(--ink)]">{title}</h3>
                              <p className="mt-2 text-sm text-stone-500">删除时间：{item.deletedAt ? formatDate(item.deletedAt) : '未知'}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button type="button" onClick={() => handleRestore(kind, item.id, title)} disabled={isOperationPending(getOperationKey('restore', kind, item.id))} className="secondary-button">恢复</button>
                              <button type="button" onClick={() => handlePurge(kind, item.id, title)} disabled={isOperationPending(getOperationKey('purge', kind, item.id))} className="primary-button">彻底删除</button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="回收站是空的" description="删除的内容会先进入这里，你可以在此恢复或彻底清理。" />
                  )}
                </section>
              ) : null}

              {showNoResults ? <EmptyState title="没有找到匹配内容" description="可以换一个更短或更宽泛的关键词试试。" /> : null}
            </div>
          </div>
        </section>
      </div>

      <div className="pointer-events-none fixed bottom-4 right-4 z-[140] flex w-full max-w-sm flex-col gap-3 px-4">
        {toasts.map((toast) => (
          <div key={toast.id} className={`pointer-events-auto rounded-[24px] border px-4 py-4 shadow-lg ${toast.tone === 'success' ? 'border-teal-200 bg-[var(--teal-soft)] text-teal-950' : toast.tone === 'error' ? 'border-rose-200 bg-[var(--rose-soft)] text-rose-700' : 'border-stone-200 bg-white text-stone-800'}`}>
            <p className="text-sm leading-6">{toast.message}</p>
            {toast.actionLabel && toast.onAction ? <button type="button" onClick={() => { void toast.onAction?.(); setToasts((current) => current.filter((item) => item.id !== toast.id)) }} className="mt-3 text-sm font-semibold underline underline-offset-4">{toast.actionLabel}</button> : null}
          </div>
        ))}
      </div>
    </main>
  )
}
