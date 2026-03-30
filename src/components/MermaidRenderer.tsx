'use client'

import { useEffect, useId, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'var(--font-sans)',
})

interface MermaidRendererProps {
  chartCode: string
}

export function MermaidRenderer({ chartCode }: MermaidRendererProps) {
  const baseId = useId().replace(/:/g, '')
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const renderChart = async () => {
      setSvg(null)
      setError(null)

      try {
        const result = await mermaid.render(`mermaid-${baseId}-${Date.now()}`, chartCode)

        if (isActive) {
          setSvg(result.svg)
        }
      } catch (renderError) {
        console.error('渲染 Mermaid 图表失败:', renderError)

        if (isActive) {
          setError('结构图渲染失败，已保留原始 Mermaid 代码供排查。')
        }
      }
    }

    if (chartCode) {
      void renderChart()
    }

    return () => {
      isActive = false
    }
  }, [baseId, chartCode])

  if (!chartCode) {
    return null
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-stone-200/70 bg-white/80">
      <div className="surface-divider flex items-center justify-between px-5 py-4 first:border-t-0">
        <div>
          <p className="section-kicker">结构图</p>
          <p className="mt-2 text-sm font-medium text-stone-700">Mermaid 架构图</p>
        </div>
        <span className="tag">Mermaid</span>
      </div>

      {svg ? (
        <div className="overflow-x-auto p-6">
          <div className="mermaid-output min-w-[720px]" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      ) : null}

      {!svg && !error ? <div className="px-6 py-8 text-sm text-stone-500">正在渲染结构图...</div> : null}

      {error ? (
        <div className="space-y-3 px-6 py-6">
          <div className="rounded-3xl border border-rose-200 bg-[var(--rose-soft)] px-4 py-3 text-sm text-rose-700">{error}</div>
          <pre className="code-surface overflow-auto rounded-[24px] p-5 text-xs leading-6">
            <code>{chartCode}</code>
          </pre>
        </div>
      ) : null}

      <style jsx>{`
        .mermaid-output :global(svg) {
          width: 100%;
          height: auto;
          min-height: 420px;
        }
      `}</style>
    </div>
  )
}
