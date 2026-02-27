// src/components/WorkflowDiagnostic.tsx
'use client'

import { useState } from 'react'
import { diagnoseWorkflow } from '@/actions/project'

interface Props {
  projectId: string;
  existingNotes: string | null;
  existingSummary: string | null;
}

export function WorkflowDiagnostic({ projectId, existingNotes, existingSummary }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 架构务实主义：直接使用原生 form 的 onSubmit 拦截，极致轻量
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const notes = formData.get('notes') as string
    if (!notes) return

    setIsSubmitting(true)
    await diagnoseWorkflow(projectId, notes)
    setIsSubmitting(false)
  }

  // 如果已经有 AI 的诊断报告了，就直接优雅地展示出来
  if (existingSummary) {
    return (
      <div className="mt-6 border-t border-purple-100 pt-4">
        <h4 className="text-lg font-bold text-purple-800 mb-2">🧑‍💻 我的工作流复盘与 AI 诊断</h4>
        <div className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200 text-sm text-gray-600">
          <p className="font-semibold mb-1">我的原始记录：</p>
          {existingNotes}
        </div>
        <div className="bg-purple-50 p-5 rounded-xl border border-purple-200">
          <div className="prose prose-sm text-purple-900 whitespace-pre-wrap max-w-none">
            {existingSummary}
          </div>
        </div>
      </div>
    )
  }

  // 如果还没有报告，就展示一个输入框让用户“倾诉”
  return (
    <div className="mt-6 border-t border-gray-100 pt-6">
      <h4 className="text-md font-semibold text-gray-700 mb-2">🤔 专家级工作流复盘</h4>
      <p className="text-xs text-gray-500 mb-3">
        用口语描述你是怎么开发这个项目的（例如：“我先用 create-next-app 建了项目，然后配了 Prisma，最后写了两个组件”）。AI 将结合上方的架构图为你做专业诊断。
      </p>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea 
          name="notes"
          rows={3}
          placeholder="尽情倾诉你的开发过程..."
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm resize-none"
        ></textarea>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="self-end bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-purple-300 text-sm font-medium"
        >
          {isSubmitting ? '🧠 首席架构师正在深度诊断中...' : '提交并生成诊断报告'}
        </button>
      </form>
    </div>
  )
}