// src/actions/project.ts
'use server'

import { prisma } from '../lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from "@clerk/nextjs/server" // <--- 放到文件顶部

export async function analyzeProjectArchitecture(projectName: string, directoryTree: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("未授权访问");

  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey) throw new Error("系统缺失 ZHIPU_API_KEY");

  try {
    // 1. 调用智谱 AI，注入极为苛刻的 Prompt
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "glm-4-flash",
        messages: [
          { 
            role: "system", 
            // 将 src/actions/project.ts 中的系统提示词替换为：
content: `你是一位顶级的首席架构师。请分析用户的项目目录树，使用 Mermaid.js 的 graph TD 语法绘制架构图。

【绝对不可触碰的语法红线 - 违反必将导致系统崩溃】：
1. 节点 ID 必须是纯英文或字母组合！绝对不能包含中文！
2. 中文说明必须用方括号和双引号包裹附在节点 ID 后面。错误：UI视图层 --> 数据库。正确：A["UI视图层"] --> B["数据库"]。
3. 连线必须使用双破折号加箭头 -->，绝对禁止使用单破折号 ->！
4. 绝对不要在 subgraph 的 end 关键字后面直接写连线！
5. 只输出 markdown 代码块，不准说任何废话！

【标准输出示例（严格模仿）】：
\`\`\`mermaid
graph TD
  subgraph Frontend["前端视图层"]
    A["page.tsx"] --> B["components"]
  end
  subgraph Backend["后端逻辑层"]
    B --> C["actions/project.ts"]
  end
\`\`\`
`
          },
          { 
            role: "user", 
            content: `项目名称：${projectName}\n目录树：\n${directoryTree}` 
          }
        ]
      })
    });

    const data = await response.json();
    const aiRawReply = data.choices[0].message.content;

    // 2. 架构级防御：用正则表达式提取 Mermaid 代码块
    let mermaidCode = '';
    const match = aiRawReply.match(/```(?:mermaid)?\n([\s\S]*?)\n```/);
    if (match && match[1]) {
      mermaidCode = match[1].trim();
    } else {
      // 如果 AI 不听话没有用代码块包裹，尝试强行使用原文
      mermaidCode = aiRawReply.trim();
    }

    // 3. 存入我们刚刚新建的数据库表中
    const savedAnalysis = await prisma.projectAnalysis.create({
      data: {
        projectName,
        directoryTree,
        mermaidCode,
        userId, // <--- 注入拥有者 ID
      }
    });
  

    // 4. 刷新页面缓存
    revalidatePath('/');
    
    return { success: true, mermaidCode: savedAnalysis.mermaidCode };

  } catch (error) {
    console.error("架构分析失败:", error);
    return { error: '架构分析失败，请检查控制台' };
  }
}

// src/actions/project.ts (追加到文件末尾)

export async function diagnoseWorkflow(projectId: string, workflowNotes: string) {
  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey) throw new Error("系统缺失 ZHIPU_API_KEY");

  try {
    // 1. 从数据库中拉取这个项目的“骨架”（目录树），作为 AI 的上下文
    const project = await prisma.projectAnalysis.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("项目不存在");

    // 2. 调用大模型进行深度诊断
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "glm-4-flash",
        messages: [
          { 
            role: "system", 
            content: `你是一位顶级的 Staff+ 级别软件架构师。用户会给你两份材料：1. 他的项目纯净目录树；2. 他的开发工作流（口水话）。
请你输出一份结构化的复盘诊断报告：
### 🛠️ 开发步骤重构
（将用户的口水话转化为专业、清晰的 1, 2, 3 步骤）
### 💡 架构师优化建议
（结合目录树和他的工作流，指出 2-3 个工程化、性能或代码组织上的可优化点。一针见血，不要废话）` 
          },
          { 
            role: "user", 
            content: `【项目目录树上下文】\n${project.directoryTree}\n\n【我的开发工作流】\n${workflowNotes}` 
          }
        ]
      })
    });

    const data = await response.json();
    const aiSummary = data.choices[0].message.content;

    // 3. 将用户的输入和 AI 的诊断报告更新到数据库
    await prisma.projectAnalysis.update({
      where: { id: projectId },
      data: {
        workflowNotes: workflowNotes,
        aiWorkflowSummary: aiSummary
      }
    });

    // 4. 刷新页面数据
    revalidatePath('/');
    return { success: true };

  } catch (error) {
    console.error("诊断失败:", error);
    return { error: '诊断失败，请检查控制台' };
  }
}

// src/actions/project.ts (追加到文件末尾)

export async function renameProject(projectId: string, newName: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("未授权访问");

  if (!newName || !newName.trim()) {
    return { error: "项目名称不能为空" };
  }

  try {
    // 同样的安全防线：匹配 projectId 和 userId
    await prisma.projectAnalysis.update({
      where: { 
        id: projectId,
        userId: userId 
      },
      data: { 
        projectName: newName.trim() 
      }
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error("项目重命名失败:", error);
    return { error: '项目重命名失败，请检查控制台' };
  }
}