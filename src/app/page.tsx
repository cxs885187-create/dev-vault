import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { decryptApiKey } from '@/lib/encryption'
import { serializeNote, serializeNoteLink, serializeProject, serializeSnippet, serializeTerm, serializeUserConfig } from '@/lib/serializers'
import type { TabId } from '@/lib/entities'
import { WorkspaceClient } from '@/components/WorkspaceClient'

type SearchParams = {
  q?: string
  tab?: string
}

const validTabs: TabId[] = ['home', 'terms', 'snippets', 'projects', 'notes', 'recycle']

export default async function Home(props: { searchParams: Promise<SearchParams> }) {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  const searchParams = await props.searchParams
  const requestedTab = (searchParams.tab ?? 'home') as TabId
  const initialTab = validTabs.includes(requestedTab) ? requestedTab : 'home'
  const initialQuery = (searchParams.q ?? '').trim()

  const [terms, snippets, projects, notes, deletedTerms, deletedSnippets, deletedProjects, deletedNotes, noteLinks, userConfig] = await Promise.all([
    prisma.term.findMany({ where: { userId, deletedAt: null }, orderBy: { updatedAt: 'desc' } }),
    prisma.snippet.findMany({ where: { userId, deletedAt: null }, orderBy: { updatedAt: 'desc' } }),
    prisma.projectAnalysis.findMany({ where: { userId, deletedAt: null }, orderBy: { updatedAt: 'desc' } }),
    prisma.note.findMany({ where: { userId, deletedAt: null }, orderBy: { updatedAt: 'desc' } }),
    prisma.term.findMany({ where: { userId, NOT: { deletedAt: null } }, orderBy: { deletedAt: 'desc' } }),
    prisma.snippet.findMany({ where: { userId, NOT: { deletedAt: null } }, orderBy: { deletedAt: 'desc' } }),
    prisma.projectAnalysis.findMany({ where: { userId, NOT: { deletedAt: null } }, orderBy: { deletedAt: 'desc' } }),
    prisma.note.findMany({ where: { userId, NOT: { deletedAt: null } }, orderBy: { deletedAt: 'desc' } }),
    prisma.noteLink.findMany({
      where: {
        sourceNote: {
          userId,
          deletedAt: null,
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.userConfig.findUnique({ where: { userId } }),
  ])

  const snapshot = {
    terms: terms.map(serializeTerm),
    snippets: snippets.map(serializeSnippet),
    projects: projects.map(serializeProject),
    notes: notes.map(serializeNote),
    links: noteLinks.map(serializeNoteLink),
    deletedTerms: deletedTerms.map(serializeTerm),
    deletedSnippets: deletedSnippets.map(serializeSnippet),
    deletedProjects: deletedProjects.map(serializeProject),
    deletedNotes: deletedNotes.map(serializeNote),
    userConfig: serializeUserConfig(userConfig, userConfig?.apiKey ? decryptApiKey(userConfig.apiKey) : ''),
  }

  return <WorkspaceClient snapshot={snapshot} initialTab={initialTab} initialQuery={initialQuery} />
}
