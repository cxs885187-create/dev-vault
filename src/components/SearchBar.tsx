// src/components/SearchBar.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')

  // 当 URL 变化时同步输入框状态
  useEffect(() => {
    setQuery(searchParams.get('q') || '')
  }, [searchParams])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/?q=${encodeURIComponent(query.trim())}`)
    } else {
      router.push('/') // 清除搜索，回首页
    }
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-col gap-2">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-400 text-sm">🔍</span>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="全库搜索..."
          className="w-full pl-9 pr-8 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition-all"
        />
        {/* 小小的清除按钮 X */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              router.push('/')
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>
      {/* 隐藏了原来那个巨大的“全库检索”按钮，改为敲击回车直接搜索，符合侧边栏习惯 */}
    </form>
  )
}