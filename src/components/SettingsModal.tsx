'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveUserConfig } from '@/actions/config'

interface Props {
  initialBaseURL: string
  initialApiKey: string
  initialModelName: string
}

export function SettingsModal({ initialBaseURL, initialApiKey, initialModelName }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [baseURL, setBaseURL] = useState(initialBaseURL)
  const [apiKey, setApiKey] = useState(initialApiKey)
  const [modelName, setModelName] = useState(initialModelName)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const resetForm = () => {
    setBaseURL(initialBaseURL)
    setApiKey(initialApiKey)
    setModelName(initialModelName)
    setFeedback(null)
  }

  const handleClose = () => {
    resetForm()
    setIsOpen(false)
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setFeedback(null)

    const result = await saveUserConfig(baseURL.trim(), apiKey.trim(), modelName.trim())

    setIsSaving(false)

    if (result.success) {
      router.refresh()
      setIsOpen(false)
      return
    }

    setFeedback(result.error ?? '保存失败，请稍后重试。')
  }

  const hasCustomConfig = Boolean(initialBaseURL || initialApiKey || initialModelName)

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setBaseURL(initialBaseURL)
          setApiKey(initialApiKey)
          setModelName(initialModelName)
          setFeedback(null)
          setIsOpen(true)
        }}
        className="secondary-button"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--teal)]" />
        模型设置
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm"
          onMouseDown={handleClose}
        >
          <div
            className="app-panel w-full max-w-2xl p-6 sm:p-8"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">BYOK</p>
                <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)]">配置你的专属 AI 模型</h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-stone-600">
                  填入自定义 Base URL、API Key 和模型名后，系统会优先使用你的配置。留空并保存则恢复为系统默认模型。
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="rounded-full p-3 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                aria-label="关闭模型设置"
              >
                关闭
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="tag">{hasCustomConfig ? '当前已配置专属模型' : '当前使用系统默认模型'}</span>
              <span className="tag">OpenAI 格式兼容</span>
            </div>

            <form onSubmit={handleSave} className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-stone-700">Base URL</span>
                <input
                  type="text"
                  value={baseURL}
                  onChange={(event) => setBaseURL(event.target.value)}
                  placeholder="例如 https://api.openai.com/v1"
                  className="app-input text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-stone-700">API Key</span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="sk-..."
                  className="app-input text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-stone-700">Model Name</span>
                <input
                  type="text"
                  value={modelName}
                  onChange={(event) => setModelName(event.target.value)}
                  placeholder="例如 gpt-4.1-mini 或 deepseek-chat"
                  className="app-input text-sm"
                />
              </label>

              {feedback ? (
                <div className="rounded-3xl border border-rose-200 bg-[var(--rose-soft)] px-4 py-3 text-sm text-rose-700">
                  {feedback}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={handleClose} className="secondary-button">
                  取消
                </button>
                <button type="submit" disabled={isSaving} className="primary-button sm:min-w-36">
                  {isSaving ? '保存中' : '保存配置'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
