import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { createTermAction } from '@/actions/term'
import { decryptApiKey } from '@/lib/encryption'
import { SearchBar } from '@/components/SearchBar'
import { LocalFileReader } from '@/components/LocalFileReader'
import { ProjectFolderReader } from '@/components/ProjectFolderReader'
import { MermaidRenderer } from '@/components/MermaidRenderer'
import { SettingsModal } from '@/components/SettingsModal'
import { EditableSnippetTitle } from '@/components/EditableSnippetTitle'
import { EditableProjectTitle } from '@/components/EditableProjectTitle'
import { WorkflowDiagnostic } from '@/components/WorkflowDiagnostic'

type TabId = 'home' | 'terms' | 'snippets' | 'projects'

type SearchParams = {
  q?: string
  tab?: string
}

const tabLabels: Record<TabId, { title: string; description: string }> = {
  home: {
    title: '工作台首页',
    description: '从一个界面管理概念、代码片段和项目结构，把知识沉淀成可反复调用的资产。',
  },
  terms: {
    title: '概念知识库',
    description: '快速记录陌生术语，保留 AI 用人话解释过的版本，方便日后回看和复习。',
  },
  snippets: {
    title: '代码片段库',
    description: '收录值得记住的代码，配上 AI 摘要和语言标签，让片段真正可检索、可复用。',
  },
  projects: {
    title: '项目结构库',
    description: '读取目录树并生成结构图，把没有文档的项目先看懂，再做后续维护和演进。',
  },
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function formatCount(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-panel px-6 py-10 text-center">
      <p className="text-lg font-semibold text-[var(--ink)]">{title}</p>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-stone-600">{description}</p>
    </div>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
  badge,
}: {
  eyebrow: string
  title: string
  description: string
  badge?: string
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="section-kicker">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)]">{title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">{description}</p>
      </div>
      {badge ? <span className="tag md:self-start">{badge}</span> : null}
    </div>
  )
}

export default async function Home(props: {
  searchParams: Promise<SearchParams>
}) {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  const searchParams = await props.searchParams
  const query = (searchParams.q ?? '').trim()
  const requestedTab = (searchParams.tab ?? 'home') as TabId
  const currentTab: TabId = requestedTab in tabLabels ? requestedTab : 'home'

  const termWhere = query
    ? {
        userId,
        OR: [
          { name: { contains: query, mode: 'insensitive' as const } },
          { aiSummary: { contains: query, mode: 'insensitive' as const } },
        ],
      }
    : { userId }

  const snippetWhere = query
    ? {
        userId,
        OR: [
          { title: { contains: query, mode: 'insensitive' as const } },
          { explanation: { contains: query, mode: 'insensitive' as const } },
          { code: { contains: query, mode: 'insensitive' as const } },
        ],
      }
    : { userId }

  const projectWhere = query
    ? {
        userId,
        OR: [
          { projectName: { contains: query, mode: 'insensitive' as const } },
          { workflowNotes: { contains: query, mode: 'insensitive' as const } },
          { aiWorkflowSummary: { contains: query, mode: 'insensitive' as const } },
          { directoryTree: { contains: query, mode: 'insensitive' as const } },
        ],
      }
    : { userId }

  const [terms, snippets, projects, userConfig] = await Promise.all([
    prisma.term.findMany({ where: termWhere, orderBy: { createdAt: 'desc' } }),
    prisma.snippet.findMany({ where: snippetWhere, orderBy: { createdAt: 'desc' } }),
    prisma.projectAnalysis.findMany({ where: projectWhere, orderBy: { createdAt: 'desc' } }),
    prisma.userConfig.findUnique({ where: { userId } }),
  ])

  const totalCount = terms.length + snippets.length + projects.length
  const latestDate = [terms[0]?.createdAt, snippets[0]?.createdAt, projects[0]?.createdAt]
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => right.getTime() - left.getTime())[0]

  const showTerms = currentTab === 'terms' || Boolean(query && terms.length)
  const showSnippets = currentTab === 'snippets' || Boolean(query && snippets.length)
  const showProjects = currentTab === 'projects' || Boolean(query && projects.length)
  const noResults = Boolean(query) && totalCount === 0

  const navItems = [
    {
      id: 'home' as const,
      title: '工作台',
      description: '总览、快捷录入和统计',
      count: totalCount,
    },
    {
      id: 'terms' as const,
      title: '概念知识库',
      description: 'AI 术语解释',
      count: terms.length,
    },
    {
      id: 'snippets' as const,
      title: '代码片段库',
      description: '代码与注释沉淀',
      count: snippets.length,
    },
    {
      id: 'projects' as const,
      title: '项目结构库',
      description: '结构图与流程诊断',
      count: projects.length,
    },
  ]

  const quickStats = [
    {
      label: '总记录数',
      value: formatCount(totalCount),
      detail: totalCount > 0 ? '三个知识面板统一沉淀' : '从第一条记录开始建立你的知识库',
    },
    {
      label: '最近更新',
      value: latestDate ? formatDate(latestDate) : '暂无',
      detail: latestDate ? '最近一次新增内容' : '等待你的第一条输入',
    },
    {
      label: '模型状态',
      value: userConfig?.apiKey ? 'BYOK' : 'Default',
      detail: userConfig?.apiKey ? '已启用专属模型配置' : '当前使用系统默认模型',
    },
  ]

  const flowSteps = [
    {
      title: '1. 收集',
      description: '先把不懂的概念、值得保留的代码和陌生项目丢进来。',
    },
    {
      title: '2. 分析',
      description: '让 AI 自动补齐说明、结构图和工作流诊断，降低理解成本。',
    },
    {
      title: '3. 回看',
      description: '以后通过搜索或分类快速找到内容，而不是重新理解一遍。',
    },
  ]

  return (
    <main className="min-h-screen text-stone-900">
      <div className="mx-auto flex max-w-[1720px] flex-col gap-6 px-4 py-4 lg:h-screen lg:flex-row lg:overflow-hidden lg:px-6 lg:py-6">
        <aside className="w-full lg:w-[330px] lg:flex-shrink-0">
          <div className="app-panel flex h-full flex-col p-5 sm:p-6">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="section-kicker">DevVault</p>
                  <h1 className="mt-3 text-3xl font-semibold text-[var(--ink)]">开发者第二大脑</h1>
                </div>
                <span className="tag">AI Workspace</span>
              </div>

              <p className="mt-4 text-sm leading-7 text-stone-600">
                用一个更清晰的界面，整理概念、代码片段和项目结构，把零散信息变成可持续回看的开发资产。
              </p>
            </div>

            <div className="mt-6">
              <SearchBar />
            </div>

            <nav className="mt-8 space-y-2">
              {navItems.map((item) => {
                const href = item.id === 'home' ? '/' : `/?tab=${item.id}`
                const isActive = !query && currentTab === item.id

                return (
                  <Link
                    key={item.id}
                    href={href}
                    className={`block rounded-[24px] border px-4 py-4 transition ${
                      isActive
                        ? 'border-teal-200 bg-[var(--teal-soft)] shadow-[0_16px_40px_rgba(15,118,110,0.12)]'
                        : 'border-transparent bg-white/45 hover:border-stone-200 hover:bg-white/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--ink)]">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-stone-500">{item.description}</p>
                      </div>
                      <span className="tag">{formatCount(item.count)}</span>
                    </div>
                  </Link>
                )
              })}
            </nav>

            <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {quickStats.map((stat) => (
                <div key={stat.label} className="metric-tile">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{stat.value}</p>
                  <p className="mt-2 text-xs leading-5 text-stone-500">{stat.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col gap-6">
          <header className="app-panel flex flex-col gap-5 px-6 py-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="section-kicker">{query ? 'Global Search' : tabLabels[currentTab].title}</p>
              <h2 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight text-[var(--ink)] sm:text-4xl">
                {query
                  ? `围绕“${query}”找到的知识结果`
                  : '把理解成本更高的内容，整理成更容易回看的工作台。'}
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600">
                {query
                  ? `搜索会同时扫描概念解释、代码片段说明与项目分析内容。当前共匹配到 ${formatCount(totalCount)} 条记录。`
                  : tabLabels[currentTab].description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {query ? <span className="tag">搜索词：{query}</span> : null}
              <SettingsModal
                initialBaseURL={userConfig?.baseURL ?? ''}
                initialApiKey={userConfig?.apiKey ? decryptApiKey(userConfig.apiKey) : ''}
                initialModelName={userConfig?.modelName ?? ''}
              />
              <div className="rounded-full border border-white/70 bg-white/75 p-1 shadow-sm">
                <UserButton />
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-8 pb-10">
              {query ? (
                <div className="app-panel rise-in px-5 py-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">已完成全库检索</p>
                      <p className="mt-2 text-sm leading-7 text-stone-600">
                        结果按内容类型分区展示，你可以继续缩小关键词，或者先清空搜索回到完整工作台。
                      </p>
                    </div>
                    <Link href={currentTab === 'home' ? '/' : `/?tab=${currentTab}`} className="secondary-button">
                      清除搜索
                    </Link>
                  </div>
                </div>
              ) : null}

              {currentTab === 'home' && !query ? (
                <>
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
                    <section className="app-panel relative overflow-hidden px-6 py-6 sm:px-7">
                      <div className="absolute right-[-40px] top-[-56px] h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(15,118,110,0.24),transparent_70%)]" />
                      <div className="absolute bottom-[-64px] left-[-32px] h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(194,65,12,0.18),transparent_72%)]" />
                      <div className="relative">
                        <p className="section-kicker">Workspace Overview</p>
                        <h3 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-[var(--ink)]">
                          今天想沉淀什么？
                        </h3>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
                          如果你刚学到一个新概念，就把它存成解释卡片；如果看到一段值得反复参考的实现，就导入代码片段；如果接手了陌生项目，就先做结构逆向分析。
                        </p>

                        <div className="mt-8 grid gap-4 md:grid-cols-3">
                          <div className="metric-tile">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">概念解释</p>
                            <p className="mt-3 text-lg font-semibold text-[var(--ink)]">快速补齐理解</p>
                          </div>
                          <div className="metric-tile">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">代码收录</p>
                            <p className="mt-3 text-lg font-semibold text-[var(--ink)]">留下上下文和用途</p>
                          </div>
                          <div className="metric-tile">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">结构分析</p>
                            <p className="mt-3 text-lg font-semibold text-[var(--ink)]">先看懂，再优化项目</p>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="app-panel px-6 py-6 sm:px-7">
                      <p className="section-kicker">Knowledge Flow</p>
                      <h3 className="mt-3 text-2xl font-semibold text-[var(--ink)]">让输入、整理和回看连成一条链路</h3>
                      <div className="mt-6 space-y-4">
                        {flowSteps.map((step) => (
                          <div key={step.title} className="metric-tile">
                            <p className="text-sm font-semibold text-[var(--ink)]">{step.title}</p>
                            <p className="mt-2 text-sm leading-7 text-stone-600">{step.description}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-3">
                    <section className="app-panel p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="section-kicker">Term Lexicon</p>
                          <h3 className="mt-3 text-2xl font-semibold text-[var(--ink)]">记录一个陌生概念</h3>
                        </div>
                        <span className="tag">术语解释</span>
                      </div>

                      <p className="mt-4 text-sm leading-7 text-stone-600">
                        输入一个技术名词，系统会生成更容易理解的说明，适合积累那些你总会遇到、却总要重新查的概念。
                      </p>

                      <form action={createTermAction} className="mt-6 space-y-4">
                        <input
                          type="text"
                          name="name"
                          required
                          placeholder="例如 Zustand、事件循环、gRPC、React Compiler"
                          className="app-input text-sm"
                        />
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs leading-5 text-stone-500">提交后会自动生成解释并写入概念知识库。</p>
                          <button type="submit" className="primary-button">
                            解释并保存
                          </button>
                        </div>
                      </form>
                    </section>

                    <LocalFileReader />
                    <ProjectFolderReader />
                  </div>
                </>
              ) : null}

              {showTerms ? (
                <section className="space-y-5">
                  <SectionHeading
                    eyebrow="Term Lexicon"
                    title={query ? '匹配到的概念解释' : '概念知识库'}
                    description="把复杂名词存成可读性更高的解释卡片，后面回看时不必再重新查一遍。"
                    badge={`${formatCount(terms.length)} 条记录`}
                  />

                  {currentTab === 'terms' && !query ? (
                    <section className="app-panel p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="section-kicker">New Entry</p>
                          <h3 className="mt-3 text-2xl font-semibold text-[var(--ink)]">继续补充新的概念解释</h3>
                        </div>
                        <span className="tag">持续积累</span>
                      </div>

                      <form action={createTermAction} className="mt-6 space-y-4">
                        <input
                          type="text"
                          name="name"
                          required
                          placeholder="输入你刚碰到的新概念"
                          className="app-input text-sm"
                        />
                        <div className="flex justify-end">
                          <button type="submit" className="primary-button">
                            解释并保存
                          </button>
                        </div>
                      </form>
                    </section>
                  ) : null}

                  {terms.length ? (
                    <div className="grid gap-5">
                      {terms.map((term) => (
                        <article key={term.id} className="data-card p-6">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="section-kicker">Concept Note</p>
                              <h3 className="mt-3 text-2xl font-semibold text-[var(--ink)]">{term.name}</h3>
                            </div>
                            <span className="tag">{formatDate(term.createdAt)}</span>
                          </div>
                          <p className="mt-5 whitespace-pre-wrap text-sm leading-8 text-stone-700">
                            {term.aiSummary ?? '暂未生成解释。'}
                          </p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="概念知识库还是空的"
                      description="从一个你最近刚查过的名词开始，比如状态管理、消息队列、并发模型。它们都很适合做成长期可复用的解释卡片。"
                    />
                  )}
                </section>
              ) : null}

              {showSnippets ? (
                <section className="space-y-5">
                  <SectionHeading
                    eyebrow="Snippet Vault"
                    title={query ? '匹配到的代码片段' : '代码片段库'}
                    description="保留代码本身，也保留 AI 给出的用途说明和理解上下文，让片段真正具备复用价值。"
                    badge={`${formatCount(snippets.length)} 条记录`}
                  />

                  {currentTab === 'snippets' && !query ? <LocalFileReader /> : null}

                  {snippets.length ? (
                    <div className="grid gap-6">
                      {snippets.map((snippet) => (
                        <article key={snippet.id} className="data-card overflow-hidden">
                          <div className="px-6 py-6">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <EditableSnippetTitle snippetId={snippet.id} initialTitle={snippet.title} />
                              <div className="flex flex-wrap gap-2">
                                <span className="tag">{snippet.language}</span>
                                <span className="tag">{formatDate(snippet.createdAt)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="surface-divider grid gap-5 px-6 py-6 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)]">
                            <div className="rounded-[28px] border border-teal-100 bg-[var(--teal-soft)]/80 p-5">
                              <p className="section-kicker">AI Summary</p>
                              <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-stone-700">
                                {snippet.explanation ?? '暂未生成说明。'}
                              </p>
                            </div>

                            <pre className="code-surface max-h-[460px] overflow-auto rounded-[28px] p-5 text-sm leading-7">
                              <code>{snippet.code}</code>
                            </pre>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="代码片段库里还没有内容"
                      description="挑一段你以后还会参考的实现存进来，比如自定义 Hook、查询封装、动画逻辑或权限判断函数。"
                    />
                  )}
                </section>
              ) : null}

              {showProjects ? (
                <section className="space-y-5">
                  <SectionHeading
                    eyebrow="Architecture Library"
                    title={query ? '匹配到的项目结构分析' : '项目结构库'}
                    description="先看懂项目的模块关系，再继续维护、接手或重构，能明显降低后续的沟通和理解成本。"
                    badge={`${formatCount(projects.length)} 个项目`}
                  />

                  {currentTab === 'projects' && !query ? <ProjectFolderReader /> : null}

                  {projects.length ? (
                    <div className="grid gap-6">
                      {projects.map((project) => (
                        <article key={project.id} className="data-card p-6">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <EditableProjectTitle projectId={project.id} initialName={project.projectName} />
                            <span className="tag">{formatDate(project.createdAt)}</span>
                          </div>

                          {project.mermaidCode ? (
                            <div className="mt-6">
                              <MermaidRenderer chartCode={project.mermaidCode} />
                            </div>
                          ) : (
                            <div className="mt-6 empty-panel px-6 py-8">
                              <p className="text-sm text-stone-600">这个项目还没有可渲染的结构图结果。</p>
                            </div>
                          )}

                          <details className="mt-6 overflow-hidden rounded-[28px] border border-stone-200/70 bg-stone-50/90">
                            <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-stone-700">
                              查看原始目录树
                            </summary>
                            <div className="surface-divider px-5 py-5">
                              <pre className="overflow-auto text-xs leading-6 text-stone-700">
                                <code>{project.directoryTree}</code>
                              </pre>
                            </div>
                          </details>

                          <WorkflowDiagnostic
                            projectId={project.id}
                            existingNotes={project.workflowNotes}
                            existingSummary={project.aiWorkflowSummary}
                          />
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="项目结构库还没有分析结果"
                      description="导入一个你最近接手的仓库，先把目录结构和模块关系理清楚，后面再做功能开发或重构会轻松很多。"
                    />
                  )}
                </section>
              ) : null}

              {noResults ? (
                <EmptyState
                  title="没有找到匹配内容"
                  description="可以换一个更短或更宽泛的关键词试试，也可以先回到工作台新增概念、代码片段或项目结构分析。"
                />
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
