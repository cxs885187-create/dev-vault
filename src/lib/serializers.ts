import type { Note, NoteLink, ProjectAnalysis, Snippet, Term, UserConfig } from '@prisma/client'
import type {
  ClientNote,
  ClientNoteLink,
  ClientProject,
  ClientSnippet,
  ClientTerm,
  ClientUserConfig,
} from './entities'

function toISOString(value: Date | null) {
  return value ? value.toISOString() : null
}

export function serializeTerm(term: Term): ClientTerm {
  return {
    id: term.id,
    userId: term.userId,
    name: term.name,
    description: term.description,
    sourceUrl: term.sourceUrl,
    aiSummary: term.aiSummary,
    tags: term.tags,
    deletedAt: toISOString(term.deletedAt),
    createdAt: term.createdAt.toISOString(),
    updatedAt: term.updatedAt.toISOString(),
  }
}

export function serializeSnippet(snippet: Snippet): ClientSnippet {
  return {
    id: snippet.id,
    userId: snippet.userId,
    title: snippet.title,
    code: snippet.code,
    language: snippet.language,
    explanation: snippet.explanation,
    deletedAt: toISOString(snippet.deletedAt),
    createdAt: snippet.createdAt.toISOString(),
    updatedAt: snippet.updatedAt.toISOString(),
  }
}

export function serializeProject(project: ProjectAnalysis): ClientProject {
  return {
    id: project.id,
    userId: project.userId,
    projectName: project.projectName,
    directoryTree: project.directoryTree,
    mermaidCode: project.mermaidCode,
    workflowNotes: project.workflowNotes,
    aiWorkflowSummary: project.aiWorkflowSummary,
    deletedAt: toISOString(project.deletedAt),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  }
}

export function serializeNote(note: Note): ClientNote {
  return {
    id: note.id,
    userId: note.userId,
    title: note.title,
    content: note.content,
    summary: note.summary,
    tags: note.tags,
    deletedAt: toISOString(note.deletedAt),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  }
}

export function serializeNoteLink(link: NoteLink): ClientNoteLink {
  return {
    id: link.id,
    sourceNoteId: link.sourceNoteId,
    label: link.label,
    targetType: link.targetType,
    targetId: link.targetId,
    createdAt: link.createdAt.toISOString(),
  }
}

export function serializeUserConfig(config: UserConfig | null, apiKey: string): ClientUserConfig {
  return {
    provider: config?.provider ?? 'zhipu',
    baseURL: config?.baseURL ?? '',
    apiKey,
    modelName: config?.modelName ?? '',
  }
}
