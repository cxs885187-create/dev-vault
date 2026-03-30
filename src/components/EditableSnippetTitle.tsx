'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { renameSnippet } from '@/actions/snippet'

interface Props {
  snippetId: string
  initialTitle: string
}

export function EditableSnippetTitle({ snippetId, initialTitle }: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    setTitle(initialTitle)
  }, [initialTitle])

  const handleCancel = () => {
    setTitle(initialTitle)
    setFeedback(null)
    setIsEditing(false)
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextTitle = title.trim()

    if (!nextTitle) {
      setFeedback('标题不能为空。')
      return
    }

    if (nextTitle === initialTitle) {
      handleCancel()
      return
    }

    setIsSaving(true)
    setFeedback(null)

    const result = await renameSnippet(snippetId, nextTitle)

    setIsSaving(false)

    if (result?.error) {
      setFeedback(result.error)
      return
    }

    router.refresh()
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <form onSubmit={handleSave} className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
            disabled={isSaving}
            className="app-input flex-1 text-lg font-semibold"
          />
          <div className="flex gap-2">
            <button type="button" onClick={handleCancel} className="secondary-button" disabled={isSaving}>
              取消
            </button>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? '保存中' : '保存'}
            </button>
          </div>
        </div>
        {feedback ? <p className="text-sm text-rose-700">{feedback}</p> : null}
      </form>
    )
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-2xl font-semibold text-[var(--ink)]">{title}</h3>
        <p className="mt-2 text-sm text-stone-500">保留这段代码的上下文说明，方便下次快速回忆。</p>
      </div>
      <button type="button" onClick={() => setIsEditing(true)} className="secondary-button">
        重命名
      </button>
    </div>
  )
}
