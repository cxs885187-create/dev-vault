'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { analyzeProjectArchitecture } from '@/actions/project'
import { MermaidRenderer } from './MermaidRenderer'

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'out',
  'coverage',
  '.vscode',
  '.idea',
])

const IGNORE_FILE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.mp4', '.zip', '.lock']

type DirectoryEntry = {
  kind: 'file' | 'directory'
  name: string
  values?: () => AsyncIterable<DirectoryEntry>
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: () => Promise<DirectoryEntry>
}

export function ProjectFolderReader() {
  const router = useRouter()
  const [isReading, setIsReading] = useState(false)
  const [projectTree, setProjectTree] = useState<string | null>(null)
  const [mermaidCode, setMermaidCode] = useState<string | null>(null)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const buildTreeString = async (dirHandle: DirectoryEntry, prefix = ''): Promise<string> => {
    const tree: string[] = []
    const entries: DirectoryEntry[] = []

    if (!dirHandle.values) {
      return ''
    }

    for await (const entry of dirHandle.values()) {
      entries.push(entry)
    }

    entries.sort((left, right) => {
      if (left.kind === right.kind) {
        return left.name.localeCompare(right.name)
      }

      return left.kind === 'directory' ? -1 : 1
    })

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index]
      const isLast = index === entries.length - 1
      const pointer = isLast ? '└── ' : '├── '
      const childPrefix = `${prefix}${isLast ? '    ' : '│   '}`

      if (entry.kind === 'directory') {
        if (IGNORE_DIRS.has(entry.name)) {
          continue
        }

        tree.push(`${prefix}${pointer}${entry.name}/`)
        tree.push(await buildTreeString(entry, childPrefix))
        continue
      }

      if (IGNORE_FILE_EXTS.some((extension) => entry.name.endsWith(extension))) {
        continue
      }

      tree.push(`${prefix}${pointer}${entry.name}`)
    }

    return tree.filter(Boolean).join('\n')
  }

  const handleOpenFolder = async () => {
    const picker = window as DirectoryPickerWindow

    if (!picker.showDirectoryPicker) {
      setMessage({
        tone: 'error',
        text: '当前浏览器不支持目录选择器，建议使用新版 Chrome 或 Edge。',
      })
      return
    }

    try {
      const dirHandle = await picker.showDirectoryPicker()

      setIsReading(true)
      setProjectTree(null)
      setMermaidCode(null)
      setMessage(null)

      const treeString = await buildTreeString(dirHandle)
      const fullTree = `${dirHandle.name}/\n${treeString}`.trim()
      setProjectTree(fullTree)

      const result = await analyzeProjectArchitecture(dirHandle.name, fullTree)

      if (result?.error) {
        setMessage({ tone: 'error', text: result.error })
        return
      }

      setMermaidCode(result.mermaidCode ?? null)
      setMessage({
        tone: 'success',
        text: `${dirHandle.name} 已加入项目结构库，新的结构图和分析已保存。`,
      })
      router.refresh()
    } catch (error) {
      const pickerError = error as { name?: string }

      if (pickerError.name !== 'AbortError') {
        console.error('读取项目目录失败', error)
        setMessage({
          tone: 'error',
          text: '项目分析失败，请确认目录可访问，并检查 AI 服务配置是否可用。',
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
          <p className="section-kicker">Architecture View</p>
          <h3 className="mt-3 text-2xl font-semibold text-[var(--ink)]">逆向梳理项目结构</h3>
        </div>
        <span className="tag">Mermaid 图谱</span>
      </div>

      <p className="mt-4 text-sm leading-7 text-stone-600">
        读取项目目录树，过滤冗余依赖与静态资源，让 AI 自动生成结构图和后续工作流诊断所需的上下文。
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="tag">目录树清洗</span>
        <span className="tag">结构图生成</span>
        <span className="tag">工作流复盘</span>
      </div>

      <button
        type="button"
        onClick={handleOpenFolder}
        disabled={isReading}
        className="primary-button mt-8 w-full"
      >
        {isReading ? '正在读取目录并生成结构图' : '选择本地项目目录'}
      </button>

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

      {projectTree && !mermaidCode ? (
        <div className="mt-5 rounded-3xl border border-dashed border-stone-300 bg-white/60 px-4 py-3 text-sm text-stone-600">
          目录树已读取完成，正在等待 AI 返回结构图结果。
        </div>
      ) : null}

      {mermaidCode ? (
        <div className="mt-6 rise-in">
          <MermaidRenderer chartCode={mermaidCode} />
        </div>
      ) : null}
    </section>
  )
}
