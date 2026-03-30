'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { processAndSaveSnippet } from '@/actions/snippet'

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

export function LocalFileReader() {
  const router = useRouter()
  const [isReading, setIsReading] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const handleOpenFile = async () => {
    const picker = window as FilePickerWindow

    if (!picker.showOpenFilePicker) {
      setMessage({
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
            description: 'Code Files',
            accept: {
              'text/plain': ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.json', '.md'],
            },
          },
        ],
      })

      setIsReading(true)
      setMessage(null)

      const file = await fileHandle.getFile()
      const content = await file.text()
      const result = await processAndSaveSnippet(file.name, content)

      if (result?.error) {
        setMessage({ tone: 'error', text: result.error })
        return
      }

      setMessage({
        tone: 'success',
        text: `${file.name} 已导入代码片段库，AI 解析结果会出现在下方列表中。`,
      })
      router.refresh()
    } catch (error) {
      const pickerError = error as { name?: string }

      if (pickerError.name !== 'AbortError') {
        console.error('读取文件失败', error)
        setMessage({
          tone: 'error',
          text: '读取文件失败，请确认文件可访问且内容是文本格式。',
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
          <p className="section-kicker">Snippet Vault</p>
          <h3 className="mt-3 text-2xl font-semibold text-[var(--ink)]">快速收录本地代码片段</h3>
        </div>
        <span className="tag">文件直读</span>
      </div>

      <p className="mt-4 text-sm leading-7 text-stone-600">
        直接从浏览器读取本地代码文件，自动生成可检索的标题、语言标签和 AI 说明，不需要额外上传到第三方服务。
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="tag">TypeScript</span>
        <span className="tag">JavaScript</span>
        <span className="tag">Python</span>
        <span className="tag">JSON</span>
      </div>

      <button
        type="button"
        onClick={handleOpenFile}
        disabled={isReading}
        className="primary-button mt-8 w-full"
      >
        {isReading ? '正在读取并生成 AI 说明' : '选择本地代码文件'}
      </button>

      <p className="mt-3 text-xs leading-5 text-stone-500">
        支持常见文本代码文件，导入后会自动进入代码片段库并参与全局搜索。
      </p>

      {message ? (
        <div
          className={`mt-5 rounded-3xl border px-4 py-3 text-sm leading-6 ${
            message.tone === 'success'
              ? 'border-teal-200 bg-[var(--teal-soft)] text-teal-900'
              : 'border-rose-200 bg-[var(--rose-soft)] text-rose-700'
          }`}
        >
          {message.text}
        </div>
      ) : null}
    </section>
  )
}
