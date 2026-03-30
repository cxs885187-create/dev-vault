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
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">全局搜索</p>
        {query ? <span className="tag">已筛选</span> : null}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="搜索概念、代码片段、项目或笔记"
          className="app-input min-w-0 flex-1 text-sm md:text-base"
          aria-label="全局搜索"
        />

        {query ? (
          <button type="button" onClick={() => submitSearch('')} className="secondary-button w-full md:w-auto md:flex-shrink-0">
            清除
          </button>
        ) : (
          <button type="submit" disabled={isPending} className="primary-button w-full md:w-auto md:flex-shrink-0">
            {isPending ? '搜索中' : '搜索'}
          </button>
        )}
      </div>

      <p className="text-xs leading-5 text-stone-500">
        搜索会同时扫描概念库、代码片段库、项目结构库和 Markdown 笔记。
      </p>
    </form>
  )
}
