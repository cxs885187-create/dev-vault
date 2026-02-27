// src/components/EditableProjectTitle.tsx
'use client'

import { useState } from 'react'
import { renameProject } from '@/actions/project'

interface Props {
  projectId: string
  initialName: string
}

export function EditableProjectTitle({ projectId, initialName }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(initialName)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (name.trim() === initialName || !name.trim()) {
      setName(initialName)
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    const result = await renameProject(projectId, name)
    
    if (result?.error) {
      alert(result.error)
      setName(initialName)
    }
    
    setIsSaving(false)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl font-bold text-gray-800 border-l-4 border-purple-500 pl-2">项目：</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') {
              setName(initialName)
              setIsEditing(false)
            }
          }}
          autoFocus
          disabled={isSaving}
          className="px-2 py-1 border-b-2 border-purple-500 bg-purple-50 focus:outline-none text-xl font-bold text-gray-800 w-1/2 rounded-t-sm"
        />
        {isSaving && <span className="text-xs text-purple-500 animate-pulse">保存中...</span>}
      </div>
    )
  }

  return (
    <h3 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-purple-500 pl-2 group flex items-center gap-2">
      项目：{name}
      <button
        onClick={() => setIsEditing(true)}
        // 同样使用了 group-hover，悬浮时才显示铅笔
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-purple-600 transition-opacity text-sm p-1 rounded hover:bg-gray-100"
        title="重命名该项目"
      >
        ✏️
      </button>
    </h3>
  )
}