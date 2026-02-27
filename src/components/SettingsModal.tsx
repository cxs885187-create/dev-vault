// src/components/SettingsModal.tsx
'use client'

import { useState } from 'react'
import { saveUserConfig } from '@/actions/config'

interface Props {
  initialBaseURL: string;
  initialApiKey: string;
  initialModelName: string;
}

export function SettingsModal({ initialBaseURL, initialApiKey, initialModelName }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [baseURL, setBaseURL] = useState(initialBaseURL)
  const [apiKey, setApiKey] = useState(initialApiKey)
  const [modelName, setModelName] = useState(initialModelName)
  const [isSaving, setIsSaving] = useState(false)

  // 优雅的 UX 还原机制：如果用户没点保存而是点了取消，我们要把输入框恢复成初始值
  const handleClose = () => {
    setBaseURL(initialBaseURL)
    setApiKey(initialApiKey)
    setModelName(initialModelName)
    setIsOpen(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    const result = await saveUserConfig(baseURL, apiKey, modelName)
    setIsSaving(false)
    
    if (result.success) {
      // 架构师的交互细节：判断用户是“配了新 Key”还是“清空了 Key”
      if (!baseURL && !apiKey && !modelName) {
        alert('🔄 已清除自定义配置，系统已恢复使用默认的免费模型。')
      } else {
        alert('✅ 配置保存成功！从现在起系统将使用你的专属模型。')
      }
      setIsOpen(false)
    } else {
      alert('❌ 保存失败，请重试')
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="p-2 text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center w-8 h-8" 
        title="模型设置 (BYOK)"
      >
        ⚙️
      </button>

      {isOpen && (
        // 1. 新增：onMouseDown={handleClose}，点击黑色半透明背景即可关闭弹窗
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onMouseDown={handleClose} 
        >
          {/* 2. 新增：e.stopPropagation() 阻止事件冒泡，防止点击白板区域也被关闭 */}
          <div 
            className="bg-white p-6 rounded-2xl shadow-xl w-[400px] relative animate-in fade-in zoom-in duration-200"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-xl font-bold p-1">
              ✕
            </button>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">⚙️ 专属 AI 配置</h2>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              填入你自己的大模型 Key。<strong>若将下方三个框全部清空并保存，即可恢复使用系统的默认免费额度。</strong>
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">接口地址 (Base URL)</label>
                <input 
                  type="text" value={baseURL} onChange={e => setBaseURL(e.target.value)} 
                  placeholder="如: https://api.deepseek.com/v1/chat/completions" 
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">API 密钥 (API Key)</label>
                <input 
                  type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} 
                  placeholder="sk-..." 
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">模型名称 (Model Name)</label>
                <input 
                  type="text" value={modelName} onChange={e => setModelName(e.target.value)} 
                  placeholder="如: deepseek-chat" 
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                />
              </div>
              
              {/* 3. 新增：底部双按钮设计 (取消 vs 保存) */}
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={handleClose}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  取消
                </button>
                <button 
                  type="submit" disabled={isSaving} 
                  className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:bg-gray-400"
                >
                  {isSaving ? '保存中...' : '保存并生效'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  )
}