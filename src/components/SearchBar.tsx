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
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-stone-400">
          搜索
        </span>
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="按概念、代码说明或项目名全文检索"
          className="app-input pl-[4.5rem] pr-24 text-sm"
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
            {isPending ? '检索中' : '回车'}
          </button>
        )}
      </div>
      <p className="text-xs leading-5 text-stone-500">
        搜索会跨概念库、代码片段库和项目结构库一起执行。
      </p>
    </form>
  )
}
