// src/components/EditableSnippetTitle.tsx
'use client'

import { useState } from 'react'
import { renameSnippet } from '@/actions/snippet'

interface Props {
  snippetId: string
  initialTitle: string
}

export function EditableSnippetTitle({ snippetId, initialTitle }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    // 如果没改或者清空了，就恢复原状
    if (title.trim() === initialTitle || !title.trim()) {
      setTitle(initialTitle)
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    const result = await renameSnippet(snippetId, title)
    
    if (result?.error) {
      alert(result.error)
      setTitle(initialTitle) // 失败则回滚
    }
    
    setIsSaving(false)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSave} // 鼠标点到外面自动保存
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave() // 回车保存
            if (e.key === 'Escape') {
              setTitle(initialTitle) // Esc 取消
              setIsEditing(false)
            }
          }}
          autoFocus
          disabled={isSaving}
          className="px-2 py-1 border-b-2 border-blue-500 bg-blue-50 focus:outline-none text-lg font-bold text-gray-800 w-1/2 rounded-t-sm"
        />
        {isSaving && <span className="text-xs text-blue-500 animate-pulse">保存中...</span>}
      </div>
    )
  }

  return (
    // group 魔法：只有鼠标悬浮在这一行时，铅笔才会显示
    <h3 className="text-lg font-bold text-gray-800 mb-2 border-l-4 border-blue-500 pl-2 group flex items-center gap-2">
      {title}
      <button
        onClick={() => setIsEditing(true)}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity text-sm p-1 rounded hover:bg-gray-100"
        title="重命名这段代码"
      >
        ✏️
      </button>
    </h3>
  )
}