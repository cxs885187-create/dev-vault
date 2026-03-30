'use client'

import { useState } from 'react'
import { diagnoseWorkflow } from '@/actions/project'
import type { ClientProject } from '@/lib/entities'

interface Props {
  projectId: string
  existingNotes: string | null
  existingSummary: string | null
  onSaved?: (project: ClientProject) => void
}

export function WorkflowDiagnostic({ projectId, existingNotes, existingSummary, onSaved }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const notes = (formData.get('notes') as string | null)?.trim()

    if (!notes) {
      setFeedback('请先补充这次开发的关键步骤。')
      return
    }

    setIsSubmitting(true)
    setFeedback(null)

    const result = await diagnoseWorkflow(projectId, notes)
    setIsSubmitting(false)

    if (!result.success || !result.project) {
      setFeedback(result.error)
      return
    }

    onSaved?.(result.project)
    event.currentTarget.reset()
  }

  if (existingSummary) {
    return (
      <section className="mt-6 rounded-[28px] border border-stone-200/70 bg-stone-50/90 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="section-kicker">工作流复盘</p>
            <h4 className="mt-3 text-xl font-semibold text-[var(--ink)]">开发流程与优化建议</h4>
          </div>
          <span className="tag">已生成诊断</span>
        </div>

        {existingNotes ? (
          <div className="mt-5 rounded-[24px] border border-stone-200/70 bg-white/85 p-4">
            <p className="text-sm font-semibold text-stone-800">你的开发记录</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-stone-600">{existingNotes}</p>
          </div>
        ) : null}

        <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-stone-700">{existingSummary}</div>
      </section>
    )
  }

  return (
    <section className="mt-6 rounded-[28px] border border-stone-200/70 bg-stone-50/90 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-kicker">工作流复盘</p>
          <h4 className="mt-3 text-xl font-semibold text-[var(--ink)]">补充开发过程，让 AI 生成复盘建议</h4>
        </div>
        <span className="tag">工程视角</span>
      </div>

      <p className="mt-4 text-sm leading-7 text-stone-600">
        描述你是如何搭建这个项目的，例如先起项目、再接数据库、最后整理 UI。系统会结合目录结构给出更具体的优化建议。
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <textarea
          name="notes"
          rows={5}
          required
          defaultValue={existingNotes ?? ''}
          placeholder="例如：我先创建 Next.js 项目，再接入 Prisma 和 Clerk，最后补齐页面、搜索与设置流程。"
          className="app-input min-h-36 resize-y text-sm leading-7"
        />

        {feedback ? (
          <div className="rounded-3xl border border-rose-200 bg-[var(--rose-soft)] px-4 py-3 text-sm text-rose-700">
            {feedback}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button type="submit" disabled={isSubmitting} className="primary-button">
            {isSubmitting ? '正在生成诊断' : '生成工作流诊断'}
          </button>
        </div>
      </form>
    </section>
  )
}
