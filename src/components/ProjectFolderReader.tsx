'use client'

import { useState } from 'react'
import { analyzeProjectArchitecture } from '@/actions/project'
import type { ClientProject } from '@/lib/entities'
import { MermaidRenderer } from './MermaidRenderer'

const ignoredDirectories = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'out', 'coverage', '.vscode', '.idea'])
const ignoredFileExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.mp4', '.zip', '.lock']

type DirectoryEntry = {
  kind: 'file' | 'directory'
  name: string
  values?: () => AsyncIterable<DirectoryEntry>
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: () => Promise<DirectoryEntry>
}

interface Props {
  onCreated?: (project: ClientProject) => void
  onMessage?: (message: { tone: 'success' | 'error' | 'info'; text: string }) => void
}

export function ProjectFolderReader({ onCreated, onMessage }: Props) {
  const [isReading, setIsReading] = useState(false)
  const [previewCode, setPreviewCode] = useState<string | null>(null)

  const buildTreeString = async (dirHandle: DirectoryEntry, prefix = ''): Promise<string> => {
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

    const rows: string[] = []

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index]
      const isLast = index === entries.length - 1
      const pointer = isLast ? '└── ' : '├── '
      const childPrefix = `${prefix}${isLast ? '    ' : '│   '}`

      if (entry.kind === 'directory') {
        if (ignoredDirectories.has(entry.name)) {
          continue
        }

        rows.push(`${prefix}${pointer}${entry.name}/`)
        rows.push(await buildTreeString(entry, childPrefix))
        continue
      }

      if (ignoredFileExtensions.some((extension) => entry.name.endsWith(extension))) {
        continue
      }

      rows.push(`${prefix}${pointer}${entry.name}`)
    }

    return rows.filter(Boolean).join('\n')
  }

  const handleOpenFolder = async () => {
    const picker = window as DirectoryPickerWindow

    if (!picker.showDirectoryPicker) {
      onMessage?.({
        tone: 'error',
        text: '当前浏览器不支持目录选择器，建议使用新版 Chrome 或 Edge。',
      })
      return
    }

    try {
      const dirHandle = await picker.showDirectoryPicker()
      setIsReading(true)
      setPreviewCode(null)

      const treeString = await buildTreeString(dirHandle)
      const directoryTree = `${dirHandle.name}/\n${treeString}`.trim()
      const result = await analyzeProjectArchitecture(dirHandle.name, directoryTree)

      if (!result.success || !result.project) {
        onMessage?.({ tone: 'error', text: result.error })
        return
      }

      setPreviewCode(result.project.mermaidCode)
      onCreated?.(result.project)
      onMessage?.({
        tone: 'success',
        text: `${dirHandle.name} 已加入项目结构库，并生成了新的结构图。`,
      })
    } catch (error) {
      const pickerError = error as { name?: string }

      if (pickerError.name !== 'AbortError') {
        console.error('读取项目目录失败:', error)
        onMessage?.({
          tone: 'error',
          text: '项目分析失败，请确认目录可访问，并检查模型配置。',
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
          <p className="section-kicker">项目结构库</p>
          <h3 className="mt-3 text-2xl font-semibold text-[var(--ink)]">读取目录并生成结构图</h3>
        </div>
        <span className="tag">Mermaid</span>
      </div>

      <p className="mt-4 text-sm leading-7 text-stone-600">
        导入本地项目目录后，系统会清理噪音文件、生成 Mermaid 结构图，并作为后续工作流诊断的上下文。
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="tag">目录清洗</span>
        <span className="tag">结构图生成</span>
        <span className="tag">工作流复盘</span>
      </div>

      <button type="button" onClick={handleOpenFolder} disabled={isReading} className="primary-button mt-8 w-full">
        {isReading ? '正在生成结构图' : '选择本地项目目录'}
      </button>

      {previewCode ? (
        <div className="mt-6 rise-in">
          <MermaidRenderer chartCode={previewCode} />
        </div>
      ) : null}
    </section>
  )
}
