'use client'

import { useState } from 'react'
import { processAndSaveSnippet } from '@/actions/snippet'
import type { ClientSnippet } from '@/lib/entities'

type FilePickerWindow = Window & {
  showOpenFilePicker?: (options?: {
    types?: Array<{
      description?: string
      accept: Record<string, string[]>
    }>
    excludeAcceptAllOption?: boolean
    multiple?: boolean
  }) => Promise<Array<{ getFile: () => Promise<File> }>>
}

interface Props {
  onCreated?: (snippet: ClientSnippet) => void
  onMessage?: (message: { tone: 'success' | 'error' | 'info'; text: string }) => void
}

export function LocalFileReader({ onCreated, onMessage }: Props) {
  const [isReading, setIsReading] = useState(false)

  const handleOpenFile = async () => {
    const picker = window as FilePickerWindow

    if (!picker.showOpenFilePicker) {
      onMessage?.({
        tone: 'error',
        text: '当前浏览器不支持本地文件选择器，建议使用新版 Chrome 或 Edge。',
      })
      return
    }

    try {
      const [fileHandle] = await picker.showOpenFilePicker({
        excludeAcceptAllOption: false,
        types: [
          {
            description: '代码文件',
            accept: {
              'text/plain': ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.json', '.md'],
            },
          },
        ],
      })

      setIsReading(true)
      const file = await fileHandle.getFile()
      const content = await file.text()
      const result = await processAndSaveSnippet(file.name, content)

      if (!result.success || !result.snippet) {
        onMessage?.({ tone: 'error', text: result.error })
        return
      }

      onCreated?.(result.snippet)
      onMessage?.({
        tone: 'success',
        text: `${file.name} 已加入代码片段库，并生成了 AI 说明。`,
      })
    } catch (error) {
      const pickerError = error as { name?: string }

      if (pickerError.name !== 'AbortError') {
        console.error('读取本地代码文件失败:', error)
        onMessage?.({
          tone: 'error',
          text: '读取文件失败，请确认文件可访问且内容为文本格式。',
        })
      }
    } finally {
      setIsReading(false)
    }
  }

  return (
    <section className="app-panel h-full p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-kicker">代码片段库</p>
          <h3 className="mt-3 text-2xl font-semibold text-[var(--ink)]">快速收录本地代码文件</h3>
        </div>
        <span className="tag">文件直读</span>
      </div>

      <p className="mt-4 text-sm leading-7 text-stone-600">
        直接从浏览器读取本地代码文件，系统会保存代码内容、语言类型和 AI 解释，不需要额外上传。
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="tag">TypeScript</span>
        <span className="tag">JavaScript</span>
        <span className="tag">Python</span>
        <span className="tag">JSON</span>
      </div>

      <button type="button" onClick={handleOpenFile} disabled={isReading} className="primary-button mt-8 w-full">
        {isReading ? '正在读取并生成说明' : '选择本地代码文件'}
      </button>

      <p className="mt-3 text-xs leading-5 text-stone-500">
        导入后会立即进入搜索、回收站和链接体系，无需刷新整个页面。
      </p>
    </section>
  )
}
