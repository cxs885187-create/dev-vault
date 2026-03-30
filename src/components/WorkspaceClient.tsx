'use client'

import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from 'react'
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
    ) => Promise<{
      createWritable: () => Promise<{
        write: (content: string) => Promise<void>
        close: () => Promise<void>
      }>
    }>
  }>
}

interface Props {
  snapshot: WorkspaceSnapshot
  initialTab: TabId
  initialQuery: string
}

function formatDate(value: string | null) {
  if (!value) return '未知'
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

function buildPreview(value: string | null | undefined, fallback: string, length = 120) {
  const normalized = value?.replace(/\s+/g, ' ').trim()
  if (!normalized) return fallback
  if (normalized.length <= length) return normalized
  return `${normalized.slice(0, length)}...`
}

function targetTypeLabel(targetType: ClientNoteLink['targetType']) {
  switch (targetType) {
    case 'NOTE':
      return '笔记'
    case 'TERM':
      return '概念'
    case 'SNIPPET':
      return '代码'
    case 'PROJECT':
      return '项目'
    default:
      return '未解析'
  }
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-tile">
      <p className="text-xs uppercase tracking-[0.14em] text-stone-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-[var(--ink)]">{value}</p>
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

function CollapsibleCard({
  title,
  subtitle,
  badge,
  expanded,
  onToggle,
  children,
  actions,
}: {
  title: string
  subtitle: string
  badge?: string
  expanded: boolean
  onToggle: () => void
  children?: ReactNode
  actions?: ReactNode
}) {
  return (
    <article className="data-card overflow-hidden">
      <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-xl font-semibold text-[var(--ink)]">{title}</h3>
              {badge ? <span className="tag">{badge}</span> : null}
            </div>
            <p className="mt-3 text-sm leading-7 text-stone-600">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            <button type="button" onClick={onToggle} className="secondary-button" aria-expanded={expanded}>
              {expanded ? '收起' : '展开'}
            </button>
          </div>
        </div>
      </div>
      {expanded ? <div className="surface-divider px-5 py-5 sm:px-6">{children}</div> : null}
    </article>
  )
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const toneStyles =
    item.tone === 'error'
      ? 'border-rose-200 bg-[var(--rose-soft)] text-rose-800'
      : item.tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-stone-200 bg-white/95 text-stone-800'

  return (
    <div className={`app-panel w-full max-w-sm border ${toneStyles} px-4 py-4`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-6">{item.message}</p>
        <button type="button" onClick={() => onDismiss(item.id)} className="text-sm font-medium text-stone-500">
          关闭
        </button>
      </div>
      {item.actionLabel && item.onAction ? (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="secondary-button px-4 py-2 text-sm"
            onClick={async () => {
              await item.onAction?.()
              onDismiss(item.id)
            }}
          >
            {item.actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  )
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
  const [expandedPanels, setExpandedPanels] = useState<string[]>([])
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

  const currentTab = initialTab
  const activeQuery = initialQuery.trim().toLowerCase()
  const isSearching = Boolean(activeQuery)
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
    [isSearching, queryMatches, terms],
  )

  const filteredSnippets = useMemo(
    () =>
      !isSearching
        ? snippets
        : snippets.filter((item) => queryMatches(item.title) || queryMatches(item.explanation) || queryMatches(item.code)),
    [isSearching, queryMatches, snippets],
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

  const quickStats = [
    { label: '有效记录', value: formatCount(terms.length + snippets.length + projects.length + notes.length) },
    { label: 'Markdown 笔记', value: formatCount(notes.length) },
    { label: '回收站', value: formatCount(recycleItems.length) },
    { label: '当前模型', value: userConfig.modelName || '系统默认' },
  ]

  const showHome = !isSearching && currentTab === 'home'
  const showTerms = isSearching ? filteredTerms.length > 0 : currentTab === 'terms'
  const showSnippets = isSearching ? filteredSnippets.length > 0 : currentTab === 'snippets'
  const showProjects = isSearching ? filteredProjects.length > 0 : currentTab === 'projects'
  const showNotes = isSearching ? filteredNotes.length > 0 : currentTab === 'notes'
  const showRecycle = !isSearching && currentTab === 'recycle'
  const noResults = isSearching && !filteredTerms.length && !filteredSnippets.length && !filteredProjects.length && !filteredNotes.length

  const getTabHref = (tab: TabId) => {
    const params = new URLSearchParams()
    if (tab !== 'home') params.set('tab', tab)
    if (initialQuery.trim()) params.set('q', initialQuery.trim())
    const value = params.toString()
    return value ? `/?${value}` : '/'
  }

  const getOperationKey = (action: string, kind: EntityKind, id: string) => `${action}:${kind}:${id}`
  const getPanelKey = (kind: string, id: string) => `panel:${kind}:${id}`
  const isOperationPending = (key: string) => pendingOperations.includes(key)
  const isPanelExpanded = (key: string) => expandedPanels.includes(key)

  const dismissToast = (id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }

  const addToast = (toast: Omit<ToastItem, 'id'>, duration = 4000) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((current) => [...current, { id, ...toast }])
    window.setTimeout(() => {
      dismissToast(id)
    }, duration)
  }

  const setOperationPending = (key: string, next: boolean) => {
    setPendingOperations((current) => (next ? [...new Set([...current, key])] : current.filter((item) => item !== key)))
  }

  const togglePanel = (key: string) => {
    setExpandedPanels((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]))
  }

  const upsertEntity = <T extends { id: string }>(setter: Dispatch<SetStateAction<T[]>>, item: T) => {
    setter((current) => [item, ...current.filter((entry) => entry.id !== item.id)])
  }

  const removeEntity = <T extends { id: string }>(setter: Dispatch<SetStateAction<T[]>>, id: string) => {
    setter((current) => current.filter((entry) => entry.id !== id))
  }

  const replaceLinksForNote = (noteId: string, nextLinks: ClientNoteLink[]) => {
    setLinks((current) => [...current.filter((item) => item.sourceNoteId !== noteId), ...nextLinks])
  }

  const removeLinksForEntity = (kind: EntityKind, id: string) => {
    setLinks((current) =>
      current.filter((item) => {
        if (kind === 'note' && item.sourceNoteId === id) return false
        if (kind === 'note' && item.targetType === 'NOTE' && item.targetId === id) return false
        if (kind === 'term' && item.targetType === 'TERM' && item.targetId === id) return false
        if (kind === 'snippet' && item.targetType === 'SNIPPET' && item.targetId === id) return false
        if (kind === 'project' && item.targetType === 'PROJECT' && item.targetId === id) return false
        return true
      }),
    )
  }

  const getBacklinks = (kind: EntityKind, id: string) => {
    const targetType = kind === 'term' ? 'TERM' : kind === 'snippet' ? 'SNIPPET' : kind === 'project' ? 'PROJECT' : 'NOTE'
    const sourceIds = links.filter((item) => item.targetType === targetType && item.targetId === id).map((item) => item.sourceNoteId)
    return notes.filter((note) => sourceIds.includes(note.id))
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

    if (kind === 'term') {
      removeEntity(setTerms, id)
      upsertEntity(setDeletedTerms, result.item as ClientTerm)
    }
    if (kind === 'snippet') {
      removeEntity(setSnippets, id)
      upsertEntity(setDeletedSnippets, result.item as ClientSnippet)
    }
    if (kind === 'project') {
      removeEntity(setProjects, id)
      upsertEntity(setDeletedProjects, result.item as ClientProject)
    }
    if (kind === 'note') {
      removeEntity(setNotes, id)
      upsertEntity(setDeletedNotes, result.item as ClientNote)
      removeLinksForEntity(kind, id)
      if (noteDraft?.id === id) {
        setNoteDraft(null)
        setQueuedNoteDraft(null)
        setShowDiscardNotePrompt(false)
      }
    }

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

    if (kind === 'term') {
      removeEntity(setDeletedTerms, id)
      upsertEntity(setTerms, result.item as ClientTerm)
    }
    if (kind === 'snippet') {
      removeEntity(setDeletedSnippets, id)
      upsertEntity(setSnippets, result.item as ClientSnippet)
    }
    if (kind === 'project') {
      removeEntity(setDeletedProjects, id)
      upsertEntity(setProjects, result.item as ClientProject)
    }
    if (kind === 'note') {
      removeEntity(setDeletedNotes, id)
      upsertEntity(setNotes, result.item as ClientNote)
      if ('links' in result && result.links) {
        replaceLinksForNote(id, result.links)
      }
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

    if (kind === 'term') removeEntity(setDeletedTerms, id)
    if (kind === 'snippet') removeEntity(setDeletedSnippets, id)
    if (kind === 'project') removeEntity(setDeletedProjects, id)
    if (kind === 'note') removeEntity(setDeletedNotes, id)
    removeLinksForEntity(kind, id)
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

    upsertEntity(setTerms, result.term)
    setTermInput('')
    addToast({ tone: 'success', message: `概念“${result.term.name}”已保存。` })
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

  const requestCloseNoteDraft = () => {
    if (noteDraftIsDirty) {
      setQueuedNoteDraft(null)
      setShowDiscardNotePrompt(true)
      return
    }
    setNoteDraft(null)
    setNoteError(null)
  }

  const discardNoteDraftChanges = () => {
    setShowDiscardNotePrompt(false)
    setNoteError(null)
    if (queuedNoteDraft) {
      setNoteDraft(queuedNoteDraft)
      setQueuedNoteDraft(null)
      return
    }
    setNoteDraft(null)
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

    upsertEntity(setNotes, result.note)
    replaceLinksForNote(result.note.id, result.links)
    setNoteDraft(null)
    setQueuedNoteDraft(null)
    setShowDiscardNotePrompt(false)
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
      const handles = await picker.showOpenFilePicker({
        excludeAcceptAllOption: false,
        multiple: true,
        types: [{ description: 'Markdown 文件', accept: { 'text/markdown': ['.md', '.markdown'] } }],
      })
      const items = await Promise.all(
        handles.map(async (handle) => {
          const file = await handle.getFile()
          return { title: file.name.replace(/\.(md|markdown)$/i, ''), content: await file.text() }
        }),
      )
      const result = await importNotes(items)

      if (!result.success) {
        addToast({ tone: 'error', message: result.error ?? '导入 Markdown 失败，请稍后重试。' })
        return
      }

      setNotes((current) => [...result.notes, ...current.filter((item) => !result.notes.some((note) => note.id === item.id))])
      setLinks((current) => {
        const noteIds = new Set(result.notes.map((note) => note.id))
        return [...current.filter((item) => !noteIds.has(item.sourceNoteId)), ...result.links]
      })
      addToast({ tone: 'success', message: `已导入 ${result.notes.length} 条 Markdown 笔记。` })
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

      notes.forEach((note, index) => {
        window.setTimeout(() => downloadMarkdown(note), index * 120)
      })
      addToast({ tone: 'info', message: '当前浏览器不支持目录导出，已改为逐条下载。' })
    } finally {
      setIsExportingNotes(false)
    }
  }

  const currentTabMeta = appCopy.tabs[currentTab]
  const recentTerms = terms.slice(0, 3)
  const recentSnippets = snippets.slice(0, 3)
  const recentProjects = projects.slice(0, 3)
  const recentNotes = notes.slice(0, 3)

  return (
    <>
      <main className="min-h-screen text-stone-900">
        <div className="mx-auto flex w-full max-w-[1660px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <aside className="hidden w-[320px] shrink-0 xl:block">
            <div className="sticky top-4 space-y-5">
              <section className="app-panel overflow-hidden p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="section-kicker">{appCopy.brand.badge}</p>
                    <h1 className="mt-3 text-3xl font-semibold text-[var(--ink)]">{appCopy.brand.name}</h1>
                    <p className="mt-2 text-sm text-stone-500">{appCopy.brand.title}</p>
                  </div>
                  <span className="tag">稳定模式</span>
                </div>
                <p className="mt-5 text-sm leading-7 text-stone-600">{appCopy.brand.description}</p>
              </section>

              <section className="app-panel p-5">
                <SearchBar />
              </section>

              <nav className="app-panel p-4">
                <div className="space-y-2">
                  {navItems.map((item) => {
                    const active = !isSearching && currentTab === item.id
                    return (
                      <Link
                        key={item.id}
                        href={getTabHref(item.id)}
                        className={`block rounded-[24px] px-4 py-4 transition ${
                          active ? 'bg-[var(--teal-soft)] text-[var(--ink)]' : 'hover:bg-white/70'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold">{item.label}</p>
                          <span className="tag">{item.count}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-stone-600">{item.description}</p>
                      </Link>
                    )
                  })}
                </div>
              </nav>

              <section className="app-panel p-5">
                <p className="section-kicker">状态概览</p>
                <div className="mt-4 grid gap-3">
                  {quickStats.map((item) => (
                    <MetricCard key={item.label} label={item.label} value={item.value} />
                  ))}
                </div>
              </section>
            </div>
          </aside>

          <div className="min-w-0 flex-1 space-y-6">
            <section className="app-panel p-5 xl:hidden">
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="section-kicker">{appCopy.brand.badge}</p>
                    <h1 className="mt-3 text-2xl font-semibold text-[var(--ink)]">{appCopy.brand.name}</h1>
                    <p className="mt-2 text-sm text-stone-500">{appCopy.brand.title}</p>
                  </div>
                  <span className="tag">移动工作台</span>
                </div>

                <SearchBar />

                <div className="flex gap-3 overflow-x-auto pb-1">
                  {navItems.map((item) => {
                    const active = !isSearching && currentTab === item.id
                    return (
                      <Link
                        key={item.id}
                        href={getTabHref(item.id)}
                        className={`min-w-[180px] rounded-[24px] px-4 py-4 transition ${
                          active ? 'bg-[var(--teal-soft)] text-[var(--ink)]' : 'bg-white/70'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold">{item.label}</p>
                          <span className="tag">{item.count}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-stone-600">{item.description}</p>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </section>

            <section className="app-panel overflow-hidden">
              <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="section-kicker">{isSearching ? '搜索结果' : currentTabMeta.label}</p>
                    <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)] sm:text-4xl">
                      {isSearching ? `“${initialQuery.trim()}” 的结果总览` : currentTabMeta.label}
                    </h2>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600">
                      {isSearching
                        ? '结果会同时覆盖概念、代码、项目与 Markdown 笔记。现在所有内容都支持局部展开、撤回删除和局部恢复，不会再整页跳动。'
                        : currentTabMeta.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" className="primary-button" onClick={() => openDraft(createNoteDraft())}>
                      新建笔记
                    </button>
                    <SettingsModal
                      initialConfig={userConfig}
                      onSaved={(config) => {
                        setUserConfig(config)
                        addToast({ tone: 'success', message: '模型配置已更新。' })
                      }}
                    />
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200/70 bg-white/80">
                      <UserButton />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {quickStats.map((item) => (
                    <MetricCard key={item.label} label={item.label} value={item.value} />
                  ))}
                </div>
              </div>
            </section>

            {showHome ? (
              <>
                <section className="grid items-start gap-6 2xl:grid-cols-[1.15fr_1fr]">
                  <div className="space-y-6">
                    <section id="term-quick-form" className="app-panel p-6">
                      <SectionHeading
                        title="快速录入"
                        description="高频入口放在同一屏内，记录概念时不会打断当前工作流。"
                        badge="即时保存"
                      />

                      <form onSubmit={handleCreateTerm} className="mt-6 space-y-4">
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-stone-700">新概念</span>
                          <input
                            type="text"
                            value={termInput}
                            onChange={(event) => setTermInput(event.target.value)}
                            placeholder="例如：向量数据库、RAG、Server Action"
                            className="app-input text-sm"
                          />
                        </label>

                        {termError ? (
                          <div className="rounded-3xl border border-rose-200 bg-[var(--rose-soft)] px-4 py-3 text-sm text-rose-700">
                            {termError}
                          </div>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-3">
                          <button type="submit" disabled={isCreatingTerm} className="primary-button">
                            {isCreatingTerm ? '正在生成概念解释' : '保存概念'}
                          </button>
                          <p className="text-sm text-stone-500">保存后会自动生成 AI 总结，可直接进入搜索和回收站流程。</p>
                        </div>
                      </form>
                    </section>

                    <LocalFileReader
                      onCreated={(snippet) => {
                        upsertEntity(setSnippets, snippet)
                      }}
                      onMessage={(message) => addToast({ tone: message.tone, message: message.text })}
                    />
                  </div>

                  <div className="space-y-6">
                    <ProjectFolderReader
                      onCreated={(project) => {
                        upsertEntity(setProjects, project)
                        togglePanel(getPanelKey('project', project.id))
                      }}
                      onMessage={(message) => addToast({ tone: message.tone, message: message.text })}
                    />

                    <section className="app-panel p-6">
                      <SectionHeading
                        title="Markdown 笔记"
                        description="支持自由写作、标签、双向链接与导入导出，补齐知识管理基础能力。"
                        badge="可导入导出"
                        actions={
                          <>
                            <button type="button" onClick={() => openDraft(createNoteDraft())} className="secondary-button">
                              新建
                            </button>
                            <button type="button" onClick={handleImportMarkdown} disabled={isImportingNotes} className="secondary-button">
                              {isImportingNotes ? '导入中' : '导入'}
                            </button>
                            <button type="button" onClick={handleExportAllNotes} disabled={isExportingNotes} className="primary-button">
                              {isExportingNotes ? '导出中' : '导出全部'}
                            </button>
                          </>
                        }
                      />

                      <div className="mt-6 grid gap-4 md:grid-cols-3">
                        <MetricCard label="笔记总数" value={formatCount(notes.length)} />
                        <MetricCard label="已建立链接" value={formatCount(links.length)} />
                        <MetricCard label="最近更新" value={notes[0] ? formatDate(notes[0].updatedAt) : '暂无'} />
                      </div>

                      <div className="mt-5 rounded-[24px] border border-stone-200/70 bg-white/80 p-4 text-sm leading-7 text-stone-600">
                        使用 `[[双向链接]]` 可以把笔记、概念、代码片段和项目连接起来。展开具体卡片时会看到出链与反向链接面板。
                      </div>
                    </section>
                  </div>
                </section>

                <section className="grid items-start gap-6 2xl:grid-cols-2">
                  <section className="app-panel p-6">
                    <SectionHeading title="近期概念" description="最近沉淀的术语和 AI 解释。" badge={`${terms.length} 条`} />
                    <div className="mt-5 space-y-4">
                      {recentTerms.length ? (
                        recentTerms.map((term) => (
                          <div key={term.id} className="rounded-[24px] border border-stone-200/70 bg-white/80 px-4 py-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-[var(--ink)]">{term.name}</p>
                              <span className="tag">{formatDate(term.updatedAt)}</span>
                            </div>
                            <p className="mt-3 text-sm leading-7 text-stone-600">{buildPreview(term.aiSummary, '等待 AI 解释生成。', 90)}</p>
                          </div>
                        ))
                      ) : (
                        <EmptyState title="还没有概念记录" description="先录入一个高频术语，后续搜索和笔记引用都会更顺手。" />
                      )}
                    </div>
                  </section>

                  <section className="app-panel p-6">
                    <SectionHeading title="近期项目" description="最近分析过的项目结构和工作流。" badge={`${projects.length} 个`} />
                    <div className="mt-5 space-y-4">
                      {recentProjects.length ? (
                        recentProjects.map((project) => (
                          <div key={project.id} className="rounded-[24px] border border-stone-200/70 bg-white/80 px-4 py-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-[var(--ink)]">{project.projectName}</p>
                              <span className="tag">{formatDate(project.updatedAt)}</span>
                            </div>
                            <p className="mt-3 text-sm leading-7 text-stone-600">
                              {buildPreview(project.aiWorkflowSummary ?? project.workflowNotes ?? project.directoryTree, '已保存目录结构，待补充工作流复盘。', 90)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <EmptyState title="还没有项目结构记录" description="读取一次本地项目目录后，就能沉淀结构图和工作流诊断。" />
                      )}
                    </div>
                  </section>
                </section>

                <section className="grid items-start gap-6 2xl:grid-cols-2">
                  <section className="app-panel p-6">
                    <SectionHeading title="近期代码片段" description="最近导入或整理的关键代码。" badge={`${snippets.length} 条`} />
                    <div className="mt-5 space-y-4">
                      {recentSnippets.length ? (
                        recentSnippets.map((snippet) => (
                          <div key={snippet.id} className="rounded-[24px] border border-stone-200/70 bg-white/80 px-4 py-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-[var(--ink)]">{snippet.title}</p>
                              <span className="tag">{snippet.language}</span>
                            </div>
                            <p className="mt-3 text-sm leading-7 text-stone-600">
                              {buildPreview(snippet.explanation ?? snippet.code, '代码已保存，待补充 AI 解释。', 90)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <EmptyState title="还没有代码片段" description="从本地文件导入后，系统会自动生成解释并进入可搜索状态。" />
                      )}
                    </div>
                  </section>

                  <section className="app-panel p-6">
                    <SectionHeading
                      title="近期笔记"
                      description="你的 Markdown 记录、链接和摘要。"
                      badge={`${notes.length} 条`}
                      actions={
                        <button type="button" onClick={() => openDraft(createNoteDraft())} className="secondary-button">
                          新建笔记
                        </button>
                      }
                    />
                    <div className="mt-5 space-y-4">
                      {recentNotes.length ? (
                        recentNotes.map((note) => (
                          <div key={note.id} className="rounded-[24px] border border-stone-200/70 bg-white/80 px-4 py-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-[var(--ink)]">{note.title}</p>
                              <span className="tag">{formatDate(note.updatedAt)}</span>
                            </div>
                            <p className="mt-3 text-sm leading-7 text-stone-600">{buildPreview(note.summary, '一条新的 Markdown 笔记。', 90)}</p>
                          </div>
                        ))
                      ) : (
                        <EmptyState title="还没有 Markdown 笔记" description="新建一条笔记，试试 `[[双向链接]]` 把知识网连起来。" />
                      )}
                    </div>
                  </section>
                </section>
              </>
            ) : null}

            {showTerms ? (
              <section className="space-y-5">
                <SectionHeading
                  title="概念知识库"
                  description="概念卡片默认折叠，先看摘要，再按需展开详细解释。"
                  badge={`${filteredTerms.length} 条结果`}
                  actions={
                    !isSearching ? (
                      <button type="button" className="primary-button" onClick={() => document.getElementById('term-quick-form')?.scrollIntoView({ behavior: 'smooth' })}>
                        去快速录入
                      </button>
                    ) : null
                  }
                />

                {filteredTerms.length ? (
                  filteredTerms.map((term) => {
                    const panelKey = getPanelKey('term', term.id)
                    const pendingDelete = isOperationPending(getOperationKey('archive', 'term', term.id))
                    const expanded = isPanelExpanded(panelKey)
                    const termTags = splitTags(term.tags)

                    return (
                      <CollapsibleCard
                        key={term.id}
                        title={term.name}
                        subtitle={buildPreview(term.aiSummary ?? term.description, '这条概念已保存，等待补充更多解释。')}
                        badge={formatDate(term.updatedAt)}
                        expanded={expanded}
                        onToggle={() => togglePanel(panelKey)}
                        actions={
                          <button type="button" className="secondary-button" disabled={pendingDelete} onClick={() => handleArchive('term', term.id, term.name)}>
                            {pendingDelete ? '处理中' : '移入回收站'}
                          </button>
                        }
                      >
                        <div className="space-y-5">
                          <div className="rounded-[24px] border border-stone-200/70 bg-white/80 p-4">
                            <p className="text-sm font-semibold text-stone-800">AI 解释</p>
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-600">
                              {term.aiSummary ?? term.description ?? '当前还没有生成解释内容。'}
                            </p>
                          </div>

                          {term.sourceUrl ? (
                            <div className="rounded-[24px] border border-stone-200/70 bg-white/80 p-4">
                              <p className="text-sm font-semibold text-stone-800">来源链接</p>
                              <a href={term.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 block break-all text-sm text-[var(--teal)]">
                                {term.sourceUrl}
                              </a>
                            </div>
                          ) : null}

                          <div className="flex flex-wrap gap-2">
                            {termTags.length ? termTags.map((tag) => <span key={tag} className="tag">#{tag}</span>) : <span className="tag">暂无标签</span>}
                            <span className="tag">反向链接 {getBacklinks('term', term.id).length}</span>
                          </div>
                        </div>
                      </CollapsibleCard>
                    )
                  })
                ) : (
                  <EmptyState title="没有匹配到概念" description="可以换一个关键词，或者先在工作台中录入新的概念。" />
                )}
              </section>
            ) : null}

            {showSnippets ? (
              <section className="space-y-5">
                <SectionHeading
                  title="代码片段库"
                  description="默认只显示最关键的信息，展开后再查看解释和完整代码。"
                  badge={`${filteredSnippets.length} 条结果`}
                />

                {filteredSnippets.length ? (
                  filteredSnippets.map((snippet) => {
                    const panelKey = getPanelKey('snippet', snippet.id)
                    const pendingDelete = isOperationPending(getOperationKey('archive', 'snippet', snippet.id))
                    const expanded = isPanelExpanded(panelKey)

                    return (
                      <CollapsibleCard
                        key={snippet.id}
                        title={snippet.title}
                        subtitle={buildPreview(snippet.explanation ?? snippet.code, '代码已保存，可展开查看完整说明和源码。')}
                        badge={snippet.language || '代码'}
                        expanded={expanded}
                        onToggle={() => togglePanel(panelKey)}
                        actions={
                          <button type="button" className="secondary-button" disabled={pendingDelete} onClick={() => handleArchive('snippet', snippet.id, snippet.title)}>
                            {pendingDelete ? '处理中' : '移入回收站'}
                          </button>
                        }
                      >
                        <div className="space-y-5">
                          <EditableSnippetTitle
                            snippetId={snippet.id}
                            initialTitle={snippet.title}
                            onSaved={(updated) => upsertEntity(setSnippets, updated)}
                          />

                          <div className="rounded-[24px] border border-stone-200/70 bg-white/80 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="tag">{snippet.language || '未识别语言'}</span>
                              <span className="tag">更新时间 {formatDate(snippet.updatedAt)}</span>
                            </div>
                            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-600">
                              {snippet.explanation ?? '当前还没有生成代码解释。'}
                            </p>
                          </div>

                          <pre className="code-surface overflow-auto rounded-[24px] p-5 text-xs leading-6">
                            <code>{snippet.code}</code>
                          </pre>
                        </div>
                      </CollapsibleCard>
                    )
                  })
                ) : (
                  <EmptyState title="没有匹配到代码片段" description="你可以导入新的本地文件，或者换一个关键词继续搜索。" />
                )}
              </section>
            ) : null}

            {showProjects ? (
              <section className="space-y-5">
                <SectionHeading
                  title="项目结构库"
                  description="项目卡片改为默认折叠，避免结构图和目录树一上来就撑满页面。"
                  badge={`${filteredProjects.length} 条结果`}
                />

                {filteredProjects.length ? (
                  filteredProjects.map((project) => {
                    const panelKey = getPanelKey('project', project.id)
                    const pendingDelete = isOperationPending(getOperationKey('archive', 'project', project.id))
                    const expanded = isPanelExpanded(panelKey)

                    return (
                      <CollapsibleCard
                        key={project.id}
                        title={project.projectName}
                        subtitle={buildPreview(project.aiWorkflowSummary ?? project.workflowNotes ?? project.directoryTree, '目录结构已保存，可展开查看结构图与工作流诊断。', 150)}
                        badge={formatDate(project.updatedAt)}
                        expanded={expanded}
                        onToggle={() => togglePanel(panelKey)}
                        actions={
                          <button type="button" className="secondary-button" disabled={pendingDelete} onClick={() => handleArchive('project', project.id, project.projectName)}>
                            {pendingDelete ? '处理中' : '移入回收站'}
                          </button>
                        }
                      >
                        <div className="space-y-5">
                          <EditableProjectTitle
                            projectId={project.id}
                            initialName={project.projectName}
                            onSaved={(updated) => upsertEntity(setProjects, updated)}
                          />

                          {project.aiWorkflowSummary ? (
                            <div className="rounded-[24px] border border-stone-200/70 bg-white/80 p-4">
                              <p className="text-sm font-semibold text-stone-800">AI 工作流总结</p>
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-600">{project.aiWorkflowSummary}</p>
                            </div>
                          ) : null}

                          {project.mermaidCode ? <MermaidRenderer chartCode={project.mermaidCode} /> : null}

                          <div className="rounded-[28px] border border-stone-200/70 bg-white/80 p-5">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="section-kicker">目录树</p>
                                <p className="mt-2 text-sm text-stone-600">保留原始结构文本，方便人工复核。</p>
                              </div>
                              <span className="tag">可滚动</span>
                            </div>
                            <pre className="code-surface mt-5 overflow-auto rounded-[24px] p-5 text-xs leading-6">
                              <code>{project.directoryTree}</code>
                            </pre>
                          </div>

                          <WorkflowDiagnostic
                            projectId={project.id}
                            existingNotes={project.workflowNotes}
                            existingSummary={project.aiWorkflowSummary}
                            onSaved={(updated) => upsertEntity(setProjects, updated)}
                          />
                        </div>
                      </CollapsibleCard>
                    )
                  })
                ) : (
                  <EmptyState title="没有匹配到项目记录" description="可以重新导入本地项目目录，或者换一个关键词继续搜索。" />
                )}
              </section>
            ) : null}

            {showNotes ? (
              <section className="space-y-5">
                <SectionHeading
                  title="笔记"
                  description="笔记支持 Markdown、标签、双向链接和导入导出，展开后再查看正文与链接网络。"
                  badge={`${filteredNotes.length} 条结果`}
                  actions={
                    <>
                      <button type="button" onClick={handleImportMarkdown} disabled={isImportingNotes} className="secondary-button">
                        {isImportingNotes ? '导入中' : '导入 Markdown'}
                      </button>
                      <button type="button" onClick={handleExportAllNotes} disabled={isExportingNotes} className="secondary-button">
                        {isExportingNotes ? '导出中' : '导出全部'}
                      </button>
                      <button type="button" onClick={() => openDraft(createNoteDraft())} className="primary-button">
                        新建笔记
                      </button>
                    </>
                  }
                />

                {filteredNotes.length ? (
                  filteredNotes.map((note) => {
                    const panelKey = getPanelKey('note', note.id)
                    const pendingDelete = isOperationPending(getOperationKey('archive', 'note', note.id))
                    const expanded = isPanelExpanded(panelKey)
                    const noteTags = splitTags(note.tags)
                    const outgoingLinks = getOutgoingLinks(note.id)
                    const backlinks = getBacklinks('note', note.id)

                    return (
                      <CollapsibleCard
                        key={note.id}
                        title={note.title}
                        subtitle={buildPreview(note.summary || note.content, '一条新的 Markdown 笔记。', 150)}
                        badge={formatDate(note.updatedAt)}
                        expanded={expanded}
                        onToggle={() => togglePanel(panelKey)}
                        actions={
                          <>
                            <button type="button" className="secondary-button" onClick={() => openDraft(createNoteDraft(note))}>
                              编辑
                            </button>
                            <button type="button" className="secondary-button" onClick={() => downloadMarkdown(note)}>
                              导出
                            </button>
                            <button type="button" className="secondary-button" disabled={pendingDelete} onClick={() => handleArchive('note', note.id, note.title)}>
                              {pendingDelete ? '处理中' : '移入回收站'}
                            </button>
                          </>
                        }
                      >
                        <div className="space-y-5">
                          <div className="flex flex-wrap gap-2">
                            {noteTags.length ? noteTags.map((tag) => <span key={tag} className="tag">#{tag}</span>) : <span className="tag">暂无标签</span>}
                            <span className="tag">出链 {outgoingLinks.length}</span>
                            <span className="tag">反向链接 {backlinks.length}</span>
                          </div>

                          <div className="rounded-[24px] border border-stone-200/70 bg-white/80 p-4">
                            <p className="text-sm font-semibold text-stone-800">Markdown 正文</p>
                            <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-stone-600">{note.content || '当前正文为空。'}</div>
                          </div>

                          <div className="grid gap-4 xl:grid-cols-2">
                            <div className="rounded-[24px] border border-stone-200/70 bg-white/80 p-4">
                              <p className="text-sm font-semibold text-stone-800">出链</p>
                              <div className="mt-4 flex flex-wrap gap-2">
                                {outgoingLinks.length ? (
                                  outgoingLinks.map((link) => (
                                    <span key={link.id} className="tag">
                                      {targetTypeLabel(link.targetType)}: {link.label}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-sm text-stone-500">当前没有解析到双向链接。</span>
                                )}
                              </div>
                            </div>

                            <div className="rounded-[24px] border border-stone-200/70 bg-white/80 p-4">
                              <p className="text-sm font-semibold text-stone-800">反向链接</p>
                              <div className="mt-4 flex flex-wrap gap-2">
                                {backlinks.length ? (
                                  backlinks.map((item) => (
                                    <button key={item.id} type="button" className="tag" onClick={() => openDraft(createNoteDraft(item))}>
                                      {item.title}
                                    </button>
                                  ))
                                ) : (
                                  <span className="text-sm text-stone-500">当前还没有其他笔记引用它。</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CollapsibleCard>
                    )
                  })
                ) : (
                  <EmptyState title="没有匹配到笔记" description="可以新建一条 Markdown 笔记，或导入已有的 `.md` 文件。" />
                )}
              </section>
            ) : null}

            {showRecycle ? (
              <section className="space-y-5">
                <SectionHeading
                  title="回收站"
                  description="所有删除默认进入回收站。这里可以恢复，或者彻底删除。"
                  badge={`${recycleItems.length} 条待处理`}
                />

                {recycleItems.length ? (
                  recycleItems.map(({ kind, item, title }) => {
                    const restoreKey = getOperationKey('restore', kind, item.id)
                    const purgeKey = getOperationKey('purge', kind, item.id)

                    return (
                      <article key={`${kind}-${item.id}`} className="data-card px-5 py-5 sm:px-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-xl font-semibold text-[var(--ink)]">{title}</h3>
                              <span className="tag">{appCopy.entityNames[kind]}</span>
                            </div>
                            <p className="mt-3 text-sm leading-7 text-stone-600">删除时间：{formatDate(item.deletedAt)}</p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="secondary-button"
                              disabled={isOperationPending(restoreKey)}
                              onClick={() => handleRestore(kind, item.id, title)}
                            >
                              {isOperationPending(restoreKey) ? '恢复中' : '恢复'}
                            </button>
                            <button
                              type="button"
                              className="primary-button"
                              disabled={isOperationPending(purgeKey)}
                              onClick={() => handlePurge(kind, item.id, title)}
                            >
                              {isOperationPending(purgeKey) ? '删除中' : '彻底删除'}
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  })
                ) : (
                  <EmptyState title="回收站是空的" description="误删的内容会先来到这里，8 秒内还可以直接从提示条撤回。" />
                )}
              </section>
            ) : null}

            {noResults ? (
              <EmptyState title="没有找到匹配内容" description="换一个关键词试试，或者先创建新的概念、笔记、代码片段和项目记录。" />
            ) : null}
          </div>
        </div>
      </main>

      {noteDraft ? (
        <div className="fixed inset-0 z-[210] bg-black/40 p-3 backdrop-blur-sm sm:p-6" onMouseDown={requestCloseNoteDraft}>
          <div className="flex min-h-full items-center justify-center">
            <section
              className="app-panel flex max-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden sm:max-h-[calc(100vh-3rem)]"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-stone-200/70 px-5 py-5 sm:px-8">
                <div>
                  <p className="section-kicker">{noteDraft.id ? '编辑笔记' : '新建笔记'}</p>
                  <h2 className="mt-3 text-2xl font-semibold text-[var(--ink)] sm:text-3xl">
                    {noteDraft.id ? '更新你的 Markdown 笔记' : '创建一条新的 Markdown 笔记'}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={requestCloseNoteDraft}
                  className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-stone-200/80 bg-white/80 text-xl text-stone-500 transition hover:border-stone-300 hover:text-stone-900"
                  aria-label="关闭笔记编辑器"
                >
                  ×
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
                <form onSubmit={handleSaveNote} className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-stone-700">标题</span>
                    <input
                      type="text"
                      value={noteDraft.title}
                      onChange={(event) => setNoteDraft((current) => (current ? { ...current, title: event.target.value } : current))}
                      placeholder="例如：RAG 方案迭代记录"
                      className="app-input text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-stone-700">标签</span>
                    <input
                      type="text"
                      value={noteDraft.tags}
                      onChange={(event) => setNoteDraft((current) => (current ? { ...current, tags: event.target.value } : current))}
                      placeholder="用逗号分隔，例如：AI, 知识库, Obsidian"
                      className="app-input text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-stone-700">Markdown 正文</span>
                    <textarea
                      value={noteDraft.content}
                      onChange={(event) => setNoteDraft((current) => (current ? { ...current, content: event.target.value } : current))}
                      rows={18}
                      placeholder="支持 Markdown 与 [[双向链接]]，例如：[[向量数据库]] 或 [[我的项目复盘]]"
                      className="app-input min-h-[360px] resize-y text-sm leading-7"
                    />
                  </label>

                  <div className="rounded-[24px] border border-stone-200/70 bg-white/85 px-4 py-4 text-sm leading-7 text-stone-600">
                    提示：保存时会自动解析 `[[双向链接]]`，并建立笔记、概念、代码片段、项目之间的引用关系。
                  </div>

                  {noteError ? (
                    <div className="rounded-3xl border border-rose-200 bg-[var(--rose-soft)] px-4 py-3 text-sm text-rose-700">
                      {noteError}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={requestCloseNoteDraft} className="secondary-button">
                      取消
                    </button>
                    <button type="submit" disabled={isSavingNote} className="primary-button sm:min-w-36">
                      {isSavingNote ? '保存中' : noteDraft.id ? '保存更新' : '创建笔记'}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {showDiscardNotePrompt ? (
        <div className="fixed inset-0 z-[215] bg-black/45 p-3 backdrop-blur-sm sm:p-6">
          <div className="flex min-h-full items-center justify-center">
            <section className="app-panel w-full max-w-lg p-6 sm:p-8">
              <p className="section-kicker">未保存更改</p>
              <h3 className="mt-3 text-2xl font-semibold text-[var(--ink)]">要放弃这次编辑吗？</h3>
              <p className="mt-4 text-sm leading-7 text-stone-600">
                你当前有尚未保存的笔记内容。继续切换或关闭会丢失这次修改。
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button type="button" className="secondary-button" onClick={() => setShowDiscardNotePrompt(false)}>
                  继续编辑
                </button>
                <button type="button" className="primary-button" onClick={discardNoteDraftChanges}>
                  放弃修改
                </button>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none fixed bottom-4 right-4 z-[230] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:bottom-6 sm:right-6">
        {toasts.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <ToastView item={item} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </>
  )
}
