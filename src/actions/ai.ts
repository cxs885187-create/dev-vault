// src/actions/ai.ts
'use server'

import { prisma } from '../lib/prisma'
import { auth } from "@clerk/nextjs/server"
import { decryptApiKey } from '../lib/encryption' // <--- 1. 新增：引入解密引擎

/**
 * 核心网关：智能路由大模型请求 (支持 BYOK 自定义模型)
 */
async function fetchAIResponse(messages: any[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("未授权访问");

  // 1. 去数据库查这个用户有没有自定义配置
  const userConfig = await prisma.userConfig.findUnique({ where: { userId } });

  // 2. 架构师级 Fallback（兜底）策略
  const isCustom = userConfig && userConfig.apiKey;
  
  // ================= 核心安全修复 =================
  // 如果用户配了，就把数据库里的加密乱码解密出来再用；没配就用系统 .env 里的白嫖额度
  const apiKey = isCustom ? decryptApiKey(userConfig.apiKey || '') : process.env.ZHIPU_API_KEY;
  // ===============================================

  // 完美兼容所有类 OpenAI 格式的模型接口（DeepSeek, 通义, OpenAI 等）
  const baseURL = (isCustom && userConfig.baseURL) ? userConfig.baseURL : 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  const modelName = (isCustom && userConfig.modelName) ? userConfig.modelName : 'glm-4-flash';

  if (!apiKey) {
    throw new Error("系统缺失 API_KEY，且用户未配置专属 Key");
  }

  // 3. 发送请求给大模型
  const response = await fetch(baseURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}` // 这里传出去的将是解密还原后的真正明文 Key
    },
    body: JSON.stringify({
      model: modelName,
      messages: messages,
    })
  });

  if (!response.ok) {
    throw new Error(`大模型 API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 智谱 AI 总结生成器 (业务函数 1)
 */
export async function generateTermSummary(query: string): Promise<string> {
  try {
    const messages = [
      { 
        role: "system", 
        content: "你是一个资深的研发架构师。请用通俗易懂的“人话”解释用户提供的技术名词或代码依赖包。你需要说明：1. 它是做什么的；2. 解决了什么痛点；3. 一个极其简单的应用场景。保持简短，使用 Markdown 格式。" 
      },
      { 
        role: "user", 
        content: query 
      }
    ];
    
    // 直接调用核心网关
    return await fetchAIResponse(messages);
  } catch (error) {
    console.error("AI 总结生成失败:", error);
    return "抱歉，AI 总结生成失败，请检查您的 API Key 配置或稍后再试。";
  }
}

/**
 * 智谱 AI 代码解释器 (业务函数 2)
 */
export async function generateCodeExplanation(code: string): Promise<string> {
  try {
    const messages = [
      { 
        role: "system", 
        content: "你是一个资深的研发架构师。用户会发给你一段代码。请你：1. 用一句话总结这段代码的核心功能；2. 解释里面用到了哪些不常见的依赖包或内置 API（如果都很常见则跳过）；3. 指出这段代码的一个潜在可优化点。使用 Markdown 格式;4.如果有经典算法，请解释运用了哪些算法思想，同时标注出现在代码中的哪些地方。" 
      },
      { 
        role: "user", 
        content: `请帮我分析这段代码：\n\n${code}` 
      }
    ];

    // 直接调用核心网关
    return await fetchAIResponse(messages);
  } catch (error) {
    console.error("代码分析失败:", error);
    return "抱歉，代码分析失败，请检查您的 API Key 配置或稍后再试。";
  }
}