import { appCopy } from '../copy'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface TermSummaryShape {
  overview: string
  painPoint: string
  example: string
}

export interface CodeExplanationShape {
  summary: string
  keyApis: string[]
  risks: string[]
  algorithms: string[]
}

export interface WorkflowDiagnosisShape {
  steps: string[]
  suggestions: string[]
}

export function buildTermSummaryMessages(query: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: [
        '你是一名擅长技术解释的资深工程师。',
        `使用简体中文回答，Prompt 版本：${appCopy.prompts.version}。`,
        '请把输入术语解释给开发者听，输出必须是 JSON 对象，字段如下：',
        '{"overview":"一句清晰解释","painPoint":"它解决什么问题","example":"一个简单使用场景"}',
        '不要输出 Markdown，不要输出代码块，不要增加额外字段。',
      ].join('\n'),
    },
    { role: 'user', content: query },
  ]
}

export function buildCodeExplanationMessages(code: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: [
        '你是一名擅长代码阅读与工程分析的资深开发者。',
        `使用简体中文回答，Prompt 版本：${appCopy.prompts.version}。`,
        '请阅读用户给出的代码，并输出 JSON 对象，字段如下：',
        '{"summary":"一句话总结核心功能","keyApis":["关键 API 或依赖"],"risks":["风险或可优化点"],"algorithms":["涉及的算法或关键思路"]}',
        '如果某个数组没有内容，返回空数组。',
        '不要输出 Markdown，不要输出代码块，不要增加额外字段。',
      ].join('\n'),
    },
    { role: 'user', content: code },
  ]
}

export function buildProjectDiagramMessages(projectName: string, directoryTree: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: [
        '你是一名擅长软件架构梳理的首席工程师。',
        `使用简体中文理解上下文，但最终只输出 Mermaid 代码块，Prompt 版本：${appCopy.prompts.version}。`,
        '你必须遵守以下规则：',
        '1. 只输出一个 ```mermaid 代码块，不要输出额外解释。',
        '2. 使用 graph TD。',
        '3. 节点 ID 只能使用英文字母、数字和下划线。',
        '4. 中文说明必须写在方括号标签里，例如 A["前端页面"]。',
        '5. 连线必须使用 -->。',
        '6. 如果目录信息不足，优先画核心模块关系，不要为了完整而编造模块。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `项目名称：${projectName}\n目录树：\n${directoryTree}`,
    },
  ]
}

export function buildWorkflowDiagnosisMessages(directoryTree: string, notes: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: [
        '你是一名擅长工程复盘的 Staff+ 级工程师。',
        `使用简体中文回答，Prompt 版本：${appCopy.prompts.version}。`,
        '请基于项目目录树和开发记录输出 JSON 对象，字段如下：',
        '{"steps":["按顺序重构开发步骤"],"suggestions":["2 到 4 条工程化优化建议"]}',
        '建议要直接、具体、可执行。',
        '不要输出 Markdown，不要输出代码块，不要增加额外字段。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `项目目录树：\n${directoryTree}\n\n开发记录：\n${notes}`,
    },
  ]
}

export function formatTermSummary(result: TermSummaryShape) {
  return ['是什么', result.overview, '', '解决什么问题', result.painPoint, '', '使用场景', result.example].join('\n')
}

export function formatCodeExplanation(result: CodeExplanationShape) {
  return [
    '功能总结',
    result.summary,
    '',
    '关键 API / 依赖',
    result.keyApis.length ? result.keyApis.map((item) => `- ${item}`).join('\n') : '- 无',
    '',
    '风险与优化建议',
    result.risks.length ? result.risks.map((item) => `- ${item}`).join('\n') : '- 无',
    '',
    '算法与思路',
    result.algorithms.length ? result.algorithms.map((item) => `- ${item}`).join('\n') : '- 无',
  ].join('\n')
}

export function formatWorkflowDiagnosis(result: WorkflowDiagnosisShape) {
  return [
    '开发步骤重构',
    result.steps.length ? result.steps.map((item, index) => `${index + 1}. ${item}`).join('\n') : '1. 暂无可重构步骤',
    '',
    '优化建议',
    result.suggestions.length ? result.suggestions.map((item, index) => `${index + 1}. ${item}`).join('\n') : '1. 暂无可执行建议',
  ].join('\n')
}
