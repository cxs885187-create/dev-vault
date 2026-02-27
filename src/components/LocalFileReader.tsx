// src/components/LocalFileReader.tsx
'use client' // 声明这是一个在浏览器端运行的组件

import { useState } from 'react'
import { processAndSaveSnippet } from '@/actions/snippet'

export function LocalFileReader() {
  const [isReading, setIsReading] = useState(false)

  const handleOpenFile = async () => {
    try {
      // 1. 唤起浏览器原生的文件选择器（现代浏览器的黑科技）
      // @ts-ignore - 忽略 TS 对现代实验性 API 的报错
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{ description: 'Code Files', accept: { 'text/plain': ['.js', '.ts', '.tsx', '.py', '.go', '.json'] } }],
      });
      
      setIsReading(true)
      
      // 2. 读取文件内容 (纯本地操作，极其快速)
      const file = await fileHandle.getFile();
      const text = await file.text();
      
      // 3. 将文件名和代码内容发给 Server Action 进行 AI 分析和保存
      await processAndSaveSnippet(file.name, text);
      
      alert(`文件 ${file.name} 已成功导入并让 AI 分析完毕！`);
    } catch (error: any) {
      if (error.name !== 'AbortError') { // 忽略用户主动取消选文件
        console.error("读取文件失败", error);
        alert("读取文件失败，请确保使用的是新版 Chrome/Edge 浏览器。");
      }
    } finally {
      setIsReading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 bg-blue-50/30">
      <h2 className="text-xl font-semibold mb-2">代码审查与收录</h2>
      <p className="text-gray-500 text-sm mb-4">无需上传，直接在本地读取项目代码文件，让 AI 帮你解析其中的包用途和逻辑。</p>
      
      <button 
        onClick={handleOpenFile}
        disabled={isReading}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
      >
        {isReading ? 'AI 正在拼命阅读分析中...' : '打开本地代码文件'}
      </button>
    </div>
  )
}