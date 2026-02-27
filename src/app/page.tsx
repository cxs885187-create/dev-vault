// src/app/page.tsx
import { prisma } from '@/lib/prisma'
import { createTermAction } from '@/actions/term'
import { LocalFileReader } from '@/components/LocalFileReader'
import { ProjectFolderReader } from '@/components/ProjectFolderReader'
import { MermaidRenderer } from '@/components/MermaidRenderer'
import { SearchBar } from '@/components/SearchBar'
import { UserButton } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { EditableSnippetTitle } from '@/components/EditableSnippetTitle'
import { EditableProjectTitle } from '@/components/EditableProjectTitle'
import { SettingsModal } from '@/components/SettingsModal'
import Link from 'next/link'
import { WorkflowDiagnostic } from '@/components/WorkflowDiagnostic' // <--- 加上这一行
import { decryptApiKey } from '@/lib/encryption'

export default async function Home(props: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  const { userId } = await auth();
  if (!userId) return null;

  // 1. 解析 URL 参数
  const searchParams = await props.searchParams;
  const q = searchParams?.q || '';
  const currentTab = searchParams?.tab || 'home';

  // 2. 数据库查询构建
  const termWhere = q ? { userId, OR: [{ name: { contains: q } }, { aiSummary: { contains: q } }] } : { userId };
  const snippetWhere = q ? { userId, OR: [{ title: { contains: q } }, { explanation: { contains: q } }, { code: { contains: q } }] } : { userId };
  const projectWhere = q ? { userId, OR: [{ projectName: { contains: q } }, { workflowNotes: { contains: q } }, { aiWorkflowSummary: { contains: q } }] } : { userId };

  const terms = await prisma.term.findMany({ where: termWhere, orderBy: { createdAt: 'desc' } })
  const snippets = await prisma.snippet.findMany({ where: snippetWhere, orderBy: { createdAt: 'desc' } })
  const projects = await prisma.projectAnalysis.findMany({ where: projectWhere, orderBy: { createdAt: 'desc' } })
  const userConfig = await prisma.userConfig.findUnique({ where: { userId } });

  // 3. 左侧导航配置
  const navItems = [
    { id: 'home', label: '🏠 工作台首页' },
    { id: 'terms', label: `💡 概念知识库 (${terms.length})` },
    { id: 'snippets', label: `📄 代码片段库 (${snippets.length})` },
    { id: 'projects', label: `🏗️ 项目架构库 (${projects.length})` },
  ];

  // ================= 架构师魔法：提取三大输入卡片，实现随处复用 =================
  const TermInputCard = (
    <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-300 transition-colors">
      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">💡 新增概念速记</h3>
      <form action={createTermAction as any} className="flex gap-4">
        <input 
          type="text" name="name" required placeholder="输入你不懂的代码名词，例如：Zustand, 闭包, gRPC..." 
          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
        />
        <button type="submit" className="bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors shrink-0 font-medium">
          让 AI 解释并保存
        </button>
      </form>
    </section>
  );

  const SnippetInputCard = (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-300 transition-colors">
      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">📄 上传代码片段</h3>
      <LocalFileReader />
    </div>
  );

  const ProjectInputCard = (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-purple-300 transition-colors">
      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">🏗️ 逆向工程分析项目</h3>
      <ProjectFolderReader />
    </div>
  );
  // =====================================================================

  return (
    <main className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      
      {/* ================= A 区：左侧导航侧边栏 ================= */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-5 border-b border-gray-100">
          <SearchBar /> 
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          <div className="text-xs font-semibold text-gray-400 mb-3 px-3 tracking-wider">我的知识库</div>
          {navItems.map((item) => (
            <Link 
              key={item.id}
              href={item.id === 'home' ? '/' : `/?tab=${item.id}`}
              className={`block px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                currentTab === item.id && !q
                  ? 'bg-blue-50 text-blue-700 shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900' 
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* ================= B 区：右侧主内容区 ================= */}
      <section className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Header */}
        <header className="h-16 border-b border-gray-200 bg-white/80 backdrop-blur-md flex justify-between items-center px-8 flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-gray-900">DevVault 第二大脑</h1>
            {q && <span className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100 font-medium">🔍 搜索: {q}</span>}
          </div>
          <div className="flex items-center gap-4">
            <SettingsModal 
              initialBaseURL={userConfig?.baseURL || ''} 
              initialApiKey={userConfig?.apiKey ? decryptApiKey(userConfig.apiKey) : ''} 
              initialModelName={userConfig?.modelName || ''} 
            />
            <UserButton />
          </div>
        </header>

        {/* 主滚动区域 */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#fafafa]">
          <div className="max-w-4xl mx-auto space-y-8 pb-32">

            {/* 搜索提示 */}
            {q && (
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 shadow-sm">
                <p><strong>"{q}"</strong> 的全库检索结果：共找到 {terms.length + snippets.length + projects.length} 条记录。</p>
              </div>
            )}

            {/* 情景 1：首页仪表盘 (Dashboard) */}
            {currentTab === 'home' && !q && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">欢迎回来，今天想存点什么？</h2>
                  <p className="text-gray-500 text-sm mt-1">请选择你要沉淀的知识类型，或者在左侧侧边栏查看历史记录。</p>
                </div>
                {/* 首页展示所有三个输入卡片 */}
                {TermInputCard}
                {SnippetInputCard}
                {ProjectInputCard}
              </div>
            )}

            {/* 情景 2：概念知识库 Tab */}
            {(currentTab === 'terms' || (q && terms.length > 0)) && (
              <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-6">
                {currentTab === 'terms' && !q && TermInputCard}
                
                {q && terms.length > 0 && <h2 className="text-xl font-semibold border-b border-gray-200 pb-2">💡 相关概念知识</h2>}
                {terms.length > 0 ? (
                  <div className="grid gap-4 mt-4">
                    {terms.map((term) => (
                      <div key={term.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 transition-colors">
                        <h3 className="text-xl font-bold text-blue-600 mb-3">{term.name}</h3>
                        <div className="prose prose-sm text-gray-700 max-w-none">
                          <pre className="whitespace-pre-wrap font-sans bg-gray-50/80 p-5 rounded-xl text-sm border border-gray-100 leading-relaxed">{term.aiSummary || "暂无解释"}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  currentTab === 'terms' && !q && <p className="text-center text-gray-400 py-12">暂无历史记录，快在上方录入你的第一个概念吧！</p>
                )}
              </div>
            )}

            {/* 情景 3：代码片段库 Tab */}
            {(currentTab === 'snippets' || (q && snippets.length > 0)) && (
              <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-6">
                {currentTab === 'snippets' && !q && SnippetInputCard}
                
                {q && snippets.length > 0 && <h2 className="text-xl font-semibold border-b border-gray-200 pb-2">📄 相关代码片段</h2>}
                {snippets.length > 0 ? (
                  <div className="grid gap-6 mt-4">
                    {snippets.map((snippet) => (
                      <div key={snippet.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                        <EditableSnippetTitle snippetId={snippet.id} initialTitle={snippet.title} />
                        <div className="mb-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                          <p className="text-sm font-bold text-blue-800 mb-2">🤖 AI 深度解析：</p>
                          <div className="prose prose-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{snippet.explanation || "暂无解析"}</div>
                        </div>
                        <div className="relative group">
                          <p className="text-xs font-mono text-gray-400 absolute right-3 top-3 uppercase z-10">{snippet.language}</p>
                          <pre className="bg-[#1e1e1e] text-gray-100 p-5 rounded-xl text-sm overflow-auto max-h-80 shadow-inner">
                            <code>{snippet.code}</code>
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  currentTab === 'snippets' && !q && <p className="text-center text-gray-400 py-12">暂无历史记录，快在上方上传你的第一段代码吧！</p>
                )}
              </div>
            )}

            {/* 情景 4：项目架构库 Tab */}
            {(currentTab === 'projects' || (q && projects.length > 0)) && (
              <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-6">
                {currentTab === 'projects' && !q && ProjectInputCard}
                
                {q && projects.length > 0 && <h2 className="text-xl font-semibold border-b border-gray-200 pb-2 text-purple-900">🏗️ 相关项目架构</h2>}
                {projects.length > 0 ? (
                  <div className="grid gap-8 mt-4">
                    {projects.map((project) => (
                      <div key={project.id} className="bg-white p-6 rounded-xl shadow-sm border border-purple-100 hover:shadow-md transition-shadow">
                        <EditableProjectTitle projectId={project.id} initialName={project.projectName} />
                        {project.mermaidCode && (
                          <div className="mb-4 bg-gray-50 rounded-lg border border-gray-100 p-2">
                            <MermaidRenderer chartCode={project.mermaidCode} />
                          </div>
                        )}
                        <details className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-200">
                          <summary className="cursor-pointer font-semibold hover:text-purple-600">查看原始纯净目录树</summary>
                          <pre className="mt-4 text-xs text-gray-800 overflow-auto max-h-64 font-mono leading-relaxed">{project.directoryTree}</pre>
                        </details>
                        {projects.map((project) => (
                      <div key={project.id} className="bg-white p-6 rounded-xl shadow-sm border border-purple-100 hover:shadow-md transition-shadow">
                        <EditableProjectTitle projectId={project.id} initialName={project.projectName} />
                        
                        {project.mermaidCode && (
                          <div className="mb-4 bg-gray-50 rounded-lg border border-gray-100 p-2">
                            <MermaidRenderer chartCode={project.mermaidCode} />
                          </div>
                        )}
                        
                        {/* 注意这里我给 details 加了一个 mb-4 的下边距，让它和下面的复盘组件隔开点 */}
                        <details className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-200 mb-4">
                          <summary className="cursor-pointer font-semibold hover:text-purple-600">查看原始纯净目录树</summary>
                          <pre className="mt-4 text-xs text-gray-800 overflow-auto max-h-64 font-mono leading-relaxed">{project.directoryTree}</pre>
                        </details>

                        {/* ================= 修复：找回失踪的首席架构师诊断组件 ================= */}
                        <WorkflowDiagnostic 
                          projectId={project.id} 
                          existingNotes={project.workflowNotes} 
                          existingSummary={project.aiWorkflowSummary} 
                        />

                      </div>
                    ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  currentTab === 'projects' && !q && <p className="text-center text-gray-400 py-12">暂无历史记录，快在上方导入你的第一个项目吧！</p>
                )}
              </div>
            )}

          </div>
        </div>
      </section>
    </main>
  )
}