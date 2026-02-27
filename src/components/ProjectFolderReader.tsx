// src/components/ProjectFolderReader.tsx
'use client'

import { useState } from 'react'
import { analyzeProjectArchitecture } from '@/actions/project'
import { MermaidRenderer } from './MermaidRenderer'

const IGNORE_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'out', 'coverage', '.vscode', '.idea'])
const IGNORE_FILE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.mp4', '.zip', '.lock']

export function ProjectFolderReader() {
  const [isReading, setIsReading] = useState(false)
  const [projectTree, setProjectTree] = useState<string | null>(null)
  const [mermaidCode, setMermaidCode] = useState<string | null>(null) // 新增：保存 AI 生成的图表代码

  const buildTreeString = async (dirHandle: any, prefix = ''): Promise<string> => {
    let tree = ''
    const entries = []
    
    for await (const entry of dirHandle.values()) {
      entries.push(entry)
    }

    entries.sort((a, b) => {
      if (a.kind === b.kind) return a.name.localeCompare(b.name)
      return a.kind === 'directory' ? -1 : 1
    })

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const isLast = i === entries.length - 1
      const pointer = isLast ? '└── ' : '├── '
      const childPrefix = prefix + (isLast ? '    ' : '│   ')

      if (entry.kind === 'directory') {
        if (IGNORE_DIRS.has(entry.name)) continue
        tree += `${prefix}${pointer}📁 ${entry.name}\n`
        tree += await buildTreeString(entry, childPrefix)
      } else {
        const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase()
        if (IGNORE_FILE_EXTS.some(e => entry.name.endsWith(e))) continue
        tree += `${prefix}${pointer}📄 ${entry.name}\n`
      }
    }
    return tree
  }

  const handleOpenFolder = async () => {
    try {
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker()
      
      setIsReading(true)
      setProjectTree(null)
      setMermaidCode(null)
      
      // 1. 读取本地目录树
      const treeString = await buildTreeString(dirHandle)
      const fullTree = `📁 ${dirHandle.name}\n${treeString}`
      setProjectTree(fullTree)
      
      // 2. 将目录树发送给大模型，生成架构图
      const result = await analyzeProjectArchitecture(dirHandle.name, fullTree)
      
      if (result.success && result.mermaidCode) {
        setMermaidCode(result.mermaidCode)
      } else {
        alert("AI 架构图生成失败，可能树太庞大或超时了。")
      }
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("读取失败", error)
      }
    } finally {
      setIsReading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100 bg-purple-50/30 mt-8">
      <h2 className="text-xl font-semibold mb-2 text-purple-900">项目架构逆向工程 (AI)</h2>
      <p className="text-gray-500 text-sm mb-4">
        导入整个项目，让 AI 分析其目录结构，并自动绘制出数据流与模块架构图。
      </p>
      
      <button 
        onClick={handleOpenFolder}
        disabled={isReading}
        className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-purple-300 shadow-md"
      >
        {isReading ? 'AI 正在深度解析项目架构中...' : '📂 选择本地项目并生成架构图'}
      </button>

      {/* 动态渲染生成的 Mermaid 架构图 */}
      {mermaidCode && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h3 className="text-lg font-bold text-gray-800 mb-4 border-l-4 border-purple-500 pl-2">
            ✨ AI 架构图生成完毕
          </h3>
          <MermaidRenderer chartCode={mermaidCode} />
        </div>
      )}

      {/* 隐藏之前的长串文字树，或者折叠起来降低认知负荷 */}
      {projectTree && !mermaidCode && (
        <div className="mt-6">
           <p className="text-sm text-purple-600 animate-pulse">成功读取目录树！正在将上下文发送给大模型画图中，请稍候...</p>
        </div>
      )}
    </div>
  )
}