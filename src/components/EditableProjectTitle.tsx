'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { renameProject } from '@/actions/project'

interface Props {
  projectId: string
  initialName: string
}

export function EditableProjectTitle({ projectId, initialName }: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(initialName)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    setName(initialName)
  }, [initialName])

  const handleCancel = () => {
    setName(initialName)
    setFeedback(null)
    setIsEditing(false)
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextName = name.trim()

    if (!nextName) {
      setFeedback('项目名称不能为空。')
      return
    }

    if (nextName === initialName) {
      handleCancel()
      return
    }

    setIsSaving(true)
    setFeedback(null)

    const result = await renameProject(projectId, nextName)

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
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            disabled={isSaving}
            className="app-input flex-1 text-xl font-semibold"
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
        <h3 className="text-3xl font-semibold text-[var(--ink)]">{name}</h3>
        <p className="mt-2 text-sm text-stone-500">保留项目级结构图、目录树和工作流复盘。</p>
      </div>
      <button type="button" onClick={() => setIsEditing(true)} className="secondary-button">
        重命名
      </button>
    </div>
  )
}
