<div align="center">
  <h1>🧠 DevVault 第二大脑</h1>
  <p>🚀 卸载认知负荷，把不懂的代码、晦涩的名词和庞杂的项目结构统统丢给 AI。</p>
  
  <p>
    <a href="https://github.com/cxs885187-create/dev-vault/stargazers"><img src="https://img.shields.io/github/stars/cxs885187-create/dev-vault?style=flat-square&color=blue" alt="Stars"></a>
    <a href="https://github.com/cxs885187-create/dev-vault/network/members"><img src="https://img.shields.io/github/forks/cxs885187-create/dev-vault?style=flat-square&color=blue" alt="Forks"></a>
    <a href="https://github.com/cxs885187-create/dev-vault/issues"><img src="https://img.shields.io/github/issues/cxs885187-create/dev-vault?style=flat-square&color=blue" alt="Issues"></a>
    <a href="https://github.com/cxs885187-create/dev-vault/blob/main/LICENSE"><img src="https://img.shields.io/github/license/cxs885187-create/dev-vault?style=flat-square&color=blue" alt="License"></a>
  </p>
</div>

## 🌟 项目初衷 (Why DevVault?)

在日常的研发工作中，我们每天都在面临信息爆炸：晦涩难懂的依赖包、同事祖传的“屎山代码”、没有任何文档的庞大项目架构……人的大脑是用来思考的，而不是用来死记硬背的。

**DevVault (开发者第二大脑)** 是一个现代化的 AI 驱动个人知识管理 SaaS。它借鉴了 Gemini / ChatGPT 的全屏分栏架构，致力于为你提供一个**无干扰、高沉浸**的技术沉淀工作台。遇到不懂的技术概念？直接丢进去；看到精妙的代码片段？一键收录；接手全新的庞大项目？让 AI 帮你做逆向工程！

## ✨ 核心特性 (Key Features)

- **💡 AI 概念速记 (Term Lexicon)**：
  输入陌生的技术名词（如 `Zustand`、`Event Loop`），AI 会自动用“说人话”的方式为你解释它的核心作用、解决的痛点以及极简应用场景。
  
- **📄 智能代码收录库 (Snippet Vault)**：
  粘贴或上传代码片段，系统不仅会高亮保存，还会让 AI 进行深度代码审查（Code Review）。自动提取核心算法思想、解释冷门 API，并给出潜在的优化建议。支持极速行内重命名 (Inline Editing)。

- **🏗️ 项目架构逆向工程 (Architecture Reverse-Engineering)**：
  （杀手级功能）一键读取本地前端/后端项目目录。系统会自动剥离 `node_modules` 等冗余文件，提取纯净目录树，并交由 AI 生成精准的 **Mermaid 模块数据流向图** 和 **工作流复盘诊断**。没有文档的项目，一秒看穿！

- **🔍 URL 驱动的全局极速搜索 (Spotlight Search)**：
  采用现代化的 URL 驱动状态管理（无感刷新）。在左侧导航栏输入任意关键词，瞬间跨表（概念、代码、项目）进行全文模糊检索，打造 Mac Spotlight 般的丝滑体验。

- **💰 BYOK 多租户计费隔离 (Bring Your Own Key)**：
  原生支持多用户隔离（基于 Clerk）。内置极其优雅的齿轮设置弹窗，允许每位用户填入自己的大模型 API Key 和 BaseURL（完美兼容 DeepSeek, OpenAI, 智谱等）。**不用担心服务器破产，让用户消耗自己的 Token！**

## 🛠️ 技术栈 (Tech Stack)

本项目采用了 2025-2026 年度最前沿的全栈 SaaS 技术方案：

* **框架**: [Next.js (App Router)](https://nextjs.org/) - 采用极致的 Server Components 与 Server Actions 架构
* **UI & 样式**: [Tailwind CSS](https://tailwindcss.com/) + 原生 CSS 动画
* **数据库 ORM**: [Prisma](https://www.prisma.io/)
* **云端数据库**: [Neon Postgres](https://neon.tech/) - Serverless 边缘数据库，完美适配 Vercel
* **鉴权**: [Clerk](https://clerk.com/) - 现代化的多租户身份验证
* **AI 大模型网关**: 兼容 OpenAI 格式的动态模型路由（默认使用智谱 GLM-4-Flash）
* **图表渲染**: [Mermaid.js](https://mermaid.js.org/)

## 🚀 本地运行指南 (Getting Started)

想要在本地把玩或者进行二次开发？只需简单几步：

**1. 克隆项目**
```bash
git clone [https://github.com/cxs885187-create/dev-vault.git](https://github.com/cxs885187-create/dev-vault.git)
cd dev-vault
```

**2. 安装依赖**
```bash
npm install
```

**3. 配置环境变量**
将根目录下的 `.env.example` 复制为 `.env`，并填入你的服务秘钥：
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=postgresql://用户名:密码@你的Neon数据库地址
ZHIPU_API_KEY=你的智谱API_KEY（作为系统兜底额度）
```

**4. 初始化数据库**
```bash
npx prisma db push
npx prisma generate
```

**5. 启动开发服务器**
```bash
npm run dev
```
打开浏览器访问 `http://localhost:3000`，你的第二大脑已就绪！🧠

## 🤝 参与贡献 (Contributing)

**热烈欢迎大家来砸 PR 和提 Issue！🎉**

无论你是发现了样式错位、遇到了难以忍受的 Bug，还是想到了某个极其炫酷的脑洞功能（比如：支持解析 PDF 文档、增加暗黑模式 Dark Mode、接入本地的 Ollama 模型等等），都非常欢迎你参与到建设中来！

**如何发起 Pull Request：**
1. Fork 本仓库。
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)。
3. 提交你的代码 (`git commit -m 'feat: Add some AmazingFeature'`)。
4. 推送到分支 (`git push origin feature/AmazingFeature`)。
5. 在 GitHub 上开启一个 Pull Request。

所有的代码审查和合并我都将亲自处理。你的每一行代码，都有可能帮助全世界的开发者更好地对抗“认知负荷”！

## 📄 许可证 (License)

本项目基于 [MIT License](LICENSE) 协议开源。你可以自由地学习、修改和用于个人和商业用途。请遵守协议条款，并遵守开源项目。