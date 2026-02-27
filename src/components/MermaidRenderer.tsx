// src/components/MermaidRenderer.tsx
'use client'

import React, { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'inherit'
})

interface MermaidRendererProps {
  chartCode: string
}

export function MermaidRenderer({ chartCode }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current && chartCode) {
      const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`
      
      // 架构防御：使用完整的 Promise 链捕获异步渲染错误
      mermaid.render(id, chartCode)
        .then((result) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = result.svg
          }
        })
        .catch((error) => {
          console.error('Mermaid 渲染失败:', error)
          // 如果 AI 写的代码画不出图，我们就在页面上优雅地把源码打印出来，不让页面崩溃
          if (containerRef.current) {
            containerRef.current.innerHTML = `
              <div class="p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                <p class="font-bold mb-2">⚠️ AI 生成的图表语法有误，无法渲染成图片。原始代码如下：</p>
                <pre class="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto max-h-64">${chartCode}</pre>
              </div>
            `
          }
        })
    }
  }, [chartCode])

  if (!chartCode) return null

  return (
    // 1. 去掉之前的 flex 居中，改为 w-full 占满全宽，并允许横向滚动
    <div className="w-full overflow-x-auto p-6 bg-white rounded-xl border border-gray-200 shadow-inner">
      
      {/* 2. 架构级 UI 修复：强制穿透并放大 Mermaid 生成的动态 SVG */}
      <style dangerouslySetInnerHTML={{ __html: `
        .mermaid-container svg {
          width: 100% !important;
          min-width: 800px !important;  /* 保证图表最小宽度，字不会挤在一起 */
          height: auto !important;
          min-height: 500px !important; /* 保证图表最小高度，彻底拉开 */
        }
      `}} />
      
      {/* 图表将被渲染在这个 div 里 */}
      <div ref={containerRef} className="mermaid-container mx-auto" />
    </div>
  )
}