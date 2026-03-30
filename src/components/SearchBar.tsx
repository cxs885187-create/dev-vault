'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const query = searchParams.get('q') ?? ''

  const buildTarget = (nextQuery: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (nextQuery) {
      params.set('q', nextQuery)
    } else {
      params.delete('q')
    }

    const nextUrl = params.toString()
    return nextUrl ? `/?${nextUrl}` : '/'
  }

  const submitSearch = (nextQuery: string) => {
    startTransition(() => {
      router.push(buildTarget(nextQuery))
    })
  }

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const nextQuery = (formData.get('q') as string | null)?.trim() ?? ''
    submitSearch(nextQuery)
  }

  return (
    <form key={query} onSubmit={handleSearch} className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">全局搜索</p>
        {query ? <span className="tag">已筛选</span> : null}
      </div>

      <div className="relative">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="搜索概念、代码片段、项目或笔记"
          className="app-input pr-24 text-sm"
          aria-label="全局搜索"
        />

        {query ? (
          <button
            type="button"
            onClick={() => submitSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-2 text-xs font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
          >
            清除
          </button>
        ) : (
          <button
            type="submit"
            disabled={isPending}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-[var(--ink)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#101826] disabled:opacity-60"
          >
            {isPending ? '搜索中' : '回车'}
          </button>
        )}
      </div>

      <p className="text-xs leading-5 text-stone-500">
        搜索会同时扫描概念库、代码片段库、项目结构库和 Markdown 笔记。
      </p>
    </form>
  )
}
