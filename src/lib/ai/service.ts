import { decryptApiKey } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import {
  type AIMessage,
  buildCodeExplanationMessages,
  buildProjectDiagramMessages,
  buildTermSummaryMessages,
  buildWorkflowDiagnosisMessages,
  type CodeExplanationShape,
  formatCodeExplanation,
  formatTermSummary,
  formatWorkflowDiagnosis,
  type TermSummaryShape,
  type WorkflowDiagnosisShape,
} from './prompts'

const defaultChatCompletionsURL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

function normalizeBaseURL(value: string | null | undefined) {
  const base = (value ?? '').trim()

  if (!base) {
    return defaultChatCompletionsURL
  }

  if (base.endsWith('/chat/completions') || base.endsWith('/responses')) {
    return base
  }

  return `${base.replace(/\/$/, '')}/chat/completions`
}

async function resolveModelConfig(userId: string) {
  const config = await prisma.userConfig.findUnique({ where: { userId } })
  const apiKey = config?.apiKey ? decryptApiKey(config.apiKey) : process.env.ZHIPU_API_KEY ?? ''

  if (!apiKey) {
    throw new Error('未检测到可用的 AI 模型密钥，请先配置系统默认模型或你的专属模型。')
  }

  return {
    apiKey,
    modelName: config?.modelName?.trim() || 'glm-4-flash',
    baseURL: normalizeBaseURL(config?.baseURL),
  }
}

async function requestAI(userId: string, messages: AIMessage[]) {
  const config = await resolveModelConfig(userId)
  const response = await fetch(config.baseURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelName,
      messages,
    }),
  })

  if (!response.ok) {
    throw new Error(`AI 服务请求失败：${response.status}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('AI 服务返回了空结果。')
  }

  return content.trim()
}

function parseJSONObject<T>(raw: string): T {
  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const source = fencedMatch?.[1]?.trim() || raw
  return JSON.parse(source) as T
}

function extractMermaidCode(raw: string) {
  const fencedMatch = raw.match(/```(?:mermaid)?\s*([\s\S]*?)\s*```/)
  const source = fencedMatch?.[1]?.trim() || raw.trim()

  if (!source.startsWith('graph')) {
    throw new Error('AI 返回的结构图结果不符合 Mermaid 语法。')
  }

  return source
}

export async function generateStructuredTermSummary(userId: string, query: string) {
  const raw = await requestAI(userId, buildTermSummaryMessages(query))

  try {
    return formatTermSummary(parseJSONObject<TermSummaryShape>(raw))
  } catch {
    return raw
  }
}

export async function generateStructuredCodeExplanation(userId: string, code: string) {
  const raw = await requestAI(userId, buildCodeExplanationMessages(code))

  try {
    return formatCodeExplanation(parseJSONObject<CodeExplanationShape>(raw))
  } catch {
    return raw
  }
}

export async function generateProjectDiagram(userId: string, projectName: string, directoryTree: string) {
  const raw = await requestAI(userId, buildProjectDiagramMessages(projectName, directoryTree))
  return extractMermaidCode(raw)
}

export async function generateWorkflowDiagnosis(userId: string, directoryTree: string, notes: string) {
  const raw = await requestAI(userId, buildWorkflowDiagnosisMessages(directoryTree, notes))

  try {
    return formatWorkflowDiagnosis(parseJSONObject<WorkflowDiagnosisShape>(raw))
  } catch {
    return raw
  }
}
