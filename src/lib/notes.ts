export interface ParsedWikiLink {
  label: string
}

const wikiLinkPattern = /\[\[([^[\]]+)\]\]/g

export function parseWikiLinks(content: string): ParsedWikiLink[] {
  const matches = new Map<string, ParsedWikiLink>()

  for (const match of content.matchAll(wikiLinkPattern)) {
    const label = match[1]?.trim()

    if (!label) {
      continue
    }

    matches.set(label.toLowerCase(), { label })
  }

  return [...matches.values()]
}

export function normalizeTags(input: string) {
  const uniqueTags = new Set<string>()

  input
    .split(/[,\n]/)
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => uniqueTags.add(value))

  return [...uniqueTags].join(', ')
}

export function splitTags(tags: string) {
  return tags
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export function summarizeMarkdown(content: string) {
  const plainText = content
    .replace(/\[\[([^[\]]+)\]\]/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*`>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!plainText) {
    return '这是一条新的 Markdown 笔记。'
  }

  return plainText.slice(0, 140)
}

export function toMarkdownDocument(title: string, content: string, tags: string) {
  const tagList = splitTags(tags)
  const frontmatter =
    tagList.length > 0
      ? `---\ntitle: ${title}\ntags:\n${tagList.map((tag) => `  - ${tag}`).join('\n')}\n---\n\n`
      : `---\ntitle: ${title}\n---\n\n`

  return `${frontmatter}${content.trim()}\n`
}

export function sanitizeMarkdownFileName(value: string) {
  const safe = value
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, ' ')

  return safe || 'untitled-note'
}
