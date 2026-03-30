import type { EntityKind, TabId } from './entities'

export const appCopy = {
  brand: {
    name: 'DevVault',
    title: '开发者第二大脑',
    badge: 'AI 知识工作台',
    description: '把概念、代码、项目与笔记沉淀成可回看、可搜索、可恢复的知识资产。',
  },
  tabs: {
    home: { label: '工作台', description: '总览、快速录入与近期动态' },
    terms: { label: '概念知识库', description: '术语解释与概念沉淀' },
    snippets: { label: '代码片段库', description: '代码收藏与 AI 说明' },
    projects: { label: '项目结构库', description: '结构分析与工作流诊断' },
    notes: { label: '笔记', description: 'Markdown、标签与双向链接' },
    recycle: { label: '回收站', description: '恢复或彻底删除内容' },
  } satisfies Record<TabId, { label: string; description: string }>,
  entityNames: {
    term: '概念',
    snippet: '代码片段',
    project: '项目',
    note: '笔记',
  } satisfies Record<EntityKind, string>,
  common: {
    save: '保存',
    saving: '保存中',
    cancel: '取消',
    close: '关闭',
    edit: '编辑',
    rename: '重命名',
    delete: '删除',
    restore: '恢复',
    purge: '彻底删除',
    undo: '撤回',
    search: '全局搜索',
    clearSearch: '清除搜索',
    loading: '处理中',
    retry: '重试',
    export: '导出',
    import: '导入',
    create: '新建',
    update: '更新',
  },
  prompts: {
    version: '2026-03-30.zh-cn.v1',
  },
}

export function getArchiveSuccessMessage(kind: EntityKind, title: string) {
  return `${appCopy.entityNames[kind]}“${title}”已移入回收站。`
}

export function getRestoreSuccessMessage(kind: EntityKind, title: string) {
  return `${appCopy.entityNames[kind]}“${title}”已恢复。`
}

export function getPurgeSuccessMessage(kind: EntityKind, title: string) {
  return `${appCopy.entityNames[kind]}“${title}”已彻底删除。`
}
