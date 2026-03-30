export type EntityKind = 'term' | 'snippet' | 'project' | 'note'

export type TabId = 'home' | 'terms' | 'snippets' | 'projects' | 'notes' | 'recycle'

export type ToastTone = 'success' | 'error' | 'info'

export interface ClientTerm {
  id: string
  userId: string
  name: string
  description: string | null
  sourceUrl: string | null
  aiSummary: string | null
  tags: string
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ClientSnippet {
  id: string
  userId: string
  title: string
  code: string
  language: string
  explanation: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ClientProject {
  id: string
  userId: string
  projectName: string
  directoryTree: string
  mermaidCode: string | null
  workflowNotes: string | null
  aiWorkflowSummary: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ClientNote {
  id: string
  userId: string
  title: string
  content: string
  summary: string
  tags: string
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ClientNoteLink {
  id: string
  sourceNoteId: string
  label: string
  targetType: 'NOTE' | 'TERM' | 'SNIPPET' | 'PROJECT' | 'UNKNOWN'
  targetId: string | null
  createdAt: string
}

export interface ClientUserConfig {
  baseURL: string
  apiKey: string
  modelName: string
  provider: string
}

export interface WorkspaceSnapshot {
  terms: ClientTerm[]
  snippets: ClientSnippet[]
  projects: ClientProject[]
  notes: ClientNote[]
  links: ClientNoteLink[]
  deletedTerms: ClientTerm[]
  deletedSnippets: ClientSnippet[]
  deletedProjects: ClientProject[]
  deletedNotes: ClientNote[]
  userConfig: ClientUserConfig
}
