'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { saveUserConfig } from '@/actions/config'
import { appCopy } from '@/lib/copy'
import type { ClientUserConfig } from '@/lib/entities'

interface Props {
  initialConfig: ClientUserConfig
  onSaved?: (config: ClientUserConfig) => void
}

export function SettingsModal({ initialConfig, onSaved }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [baseURL, setBaseURL] = useState(initialConfig.baseURL)
  const [apiKey, setApiKey] = useState(initialConfig.apiKey)
  const [modelName, setModelName] = useState(initialConfig.modelName)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false)

  const isDirty = useMemo(
    () =>
      baseURL !== initialConfig.baseURL ||
      apiKey !== initialConfig.apiKey ||
      modelName !== initialConfig.modelName,
    [apiKey, baseURL, initialConfig.apiKey, initialConfig.baseURL, initialConfig.modelName, modelName],
  )

  const resetForm = useCallback(() => {
    setBaseURL(initialConfig.baseURL)
    setApiKey(initialConfig.apiKey)
    setModelName(initialConfig.modelName)
    setFeedback(null)
    setShowDiscardPrompt(false)
  }, [initialConfig.apiKey, initialConfig.baseURL, initialConfig.modelName])

  const forceClose = useCallback(() => {
    resetForm()
    setIsOpen(false)
  }, [resetForm])

  const requestClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardPrompt(true)
      return
    }

    forceClose()
  }, [forceClose, isDirty])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        requestClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, requestClose])

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setFeedback(null)

    const result = await saveUserConfig(baseURL.trim(), apiKey.trim(), modelName.trim())
    setIsSaving(false)

    if (!result.success) {
      setFeedback(result.error)
      return
    }

    onSaved?.({
      provider: initialConfig.provider,
      baseURL: baseURL.trim(),
      apiKey: apiKey.trim(),
      modelName: modelName.trim(),
    })

    forceClose()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          resetForm()
          setIsOpen(true)
        }}
        className="secondary-button"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--teal)]" />
        模型设置
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[120] overflow-y-auto bg-black/35 p-4 backdrop-blur-sm sm:p-6"
          onMouseDown={requestClose}
        >
          <div className="flex min-h-full items-start justify-center py-2 sm:items-center sm:py-8">
            <div
              className="app-panel relative z-[121] max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto p-6 sm:max-h-[calc(100vh-4rem)] sm:p-8"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="section-kicker">模型配置</p>
                  <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)]">配置你的专属 AI 模型</h2>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-stone-600">
                    自定义 Base URL、API Key 和模型名称后，系统会优先使用你的配置。留空保存则恢复为系统默认模型。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={requestClose}
                  className="rounded-full p-3 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                  aria-label="关闭模型设置"
                >
                  {appCopy.common.close}
                </button>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="tag">
                  {initialConfig.apiKey || initialConfig.baseURL || initialConfig.modelName
                    ? '当前已配置自定义模型'
                    : '当前使用系统默认模型'}
                </span>
                <span className="tag">兼容 OpenAI Chat Completions</span>
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
                  <span className="mb-2 block text-sm font-semibold text-stone-700">模型名称</span>
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

                {showDiscardPrompt ? (
                  <div className="rounded-3xl border border-amber-200 bg-[var(--amber-soft)] px-4 py-4 text-sm text-amber-900">
                    <p>你有未保存的修改。确定要放弃这次编辑吗？</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" className="secondary-button" onClick={() => setShowDiscardPrompt(false)}>
                        继续编辑
                      </button>
                      <button type="button" className="primary-button" onClick={forceClose}>
                        放弃修改
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={requestClose} className="secondary-button">
                    {appCopy.common.cancel}
                  </button>
                  <button type="submit" disabled={isSaving} className="primary-button sm:min-w-36">
                    {isSaving ? appCopy.common.saving : '保存配置'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
