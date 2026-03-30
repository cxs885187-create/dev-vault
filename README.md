# DevVault

DevVault 是一个面向开发者的 AI 知识工作台，用来沉淀三类最容易散掉的信息：

- 技术概念与术语解释
- 可复用的代码片段与 AI 说明
- 项目目录结构、Mermaid 架构图与工作流复盘

它的目标不是做一个“万能聊天框”，而是把开发过程中最常见的理解成本，整理成一个可以长期回看的第二大脑。

## 项目定位

在日常研发里，我们会反复遇到这些问题：

- 刚看懂一个概念，过几周又忘了
- 保存了一段代码，但下次再看已经想不起用途
- 接手一个陌生项目时，没有文档，不知道从哪里开始理解

DevVault 试图把这三类场景统一到一个工作台里，让 AI 帮你做解释、总结和结构化整理，而不是只给出一次性回答。

## 核心能力

### 1. 概念知识库

输入一个你不熟悉的术语或技术点，系统会调用 AI 生成更容易理解的解释，并保存到数据库中，方便后续检索和回看。

适合记录的内容例如：

- Zustand
- 事件循环
- gRPC
- React Compiler

### 2. 代码片段库

你可以直接从浏览器读取本地代码文件，系统会：

- 保存代码内容
- 自动识别语言
- 生成 AI 说明
- 支持后续重命名和搜索

这类能力适合沉淀那些“以后一定还会再看”的实现，比如工具函数、自定义 Hook、接口封装或复杂业务逻辑。

### 3. 项目结构库

你可以直接选择本地项目目录，系统会先清洗目录树，再交给 AI 做结构分析，并保存：

- 原始目录树
- Mermaid 架构图
- 开发流程复盘输入
- AI 生成的工作流诊断建议

这对接手旧项目、快速理解仓库结构、做重构前摸底很有帮助。

### 4. 全局搜索

搜索会跨以下内容一起执行：

- 概念名称与解释
- 代码标题、代码内容、AI 说明
- 项目名称、目录树、工作流笔记、AI 诊断结果

搜索结果会在界面中按内容类型分区展示。

### 5. BYOK 模型配置

项目支持用户自行配置模型服务参数，包括：

- Base URL
- API Key
- Model Name

如果没有填写，系统会回退到默认的 `ZHIPU_API_KEY` 配置。用户填写的 API Key 会经过加密后再存库。

## 当前技术栈

- Next.js 16（App Router）
- React 19
- Tailwind CSS 4
- Prisma
- Clerk
- Mermaid
- TypeScript

## 目录说明

项目当前的主要代码结构如下：

```text
src/
  app/                页面入口、全局样式、根布局
  actions/            Server Actions 与 AI 调用逻辑
  components/         前端交互组件
  lib/                Prisma 与加密等基础能力
prisma/
  schema.prisma       数据模型
```

其中几个关键模块：

- `src/app/page.tsx`：主工作台页面
- `src/actions/ai.ts`：统一的 AI 请求入口
- `src/actions/project.ts`：项目结构分析与工作流诊断
- `src/components/LocalFileReader.tsx`：本地代码文件读取
- `src/components/ProjectFolderReader.tsx`：本地项目目录读取

## 本地运行

### 1. 克隆仓库

```bash
git clone https://github.com/cxs885187-create/dev-vault.git
cd dev-vault
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

当前仓库没有内置 `.env.example`，你需要手动创建 `.env` 文件。

最少需要这些变量：

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
DATABASE_URL=your_database_url
ZHIPU_API_KEY=your_default_ai_api_key
ENCRYPTION_KEY=your_32_char_secret
```

说明：

- `DATABASE_URL`：Prisma 使用的数据库连接串
- `ZHIPU_API_KEY`：默认 AI 服务密钥，用于未配置 BYOK 时的兜底调用
- `ENCRYPTION_KEY`：用于加密用户自定义 API Key，建议使用稳定且长度足够的私密字符串

### 4. 初始化数据库

```bash
npx prisma generate
npx prisma db push
```

### 5. 启动开发环境

```bash
npm run dev
```

默认访问：

```text
http://localhost:3000
```

## 常用脚本

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## 使用说明

### 概念知识库

在首页或概念页输入术语，提交后系统会自动生成解释并保存。

### 代码片段库

点击“选择本地代码文件”，从浏览器中选择本地代码文件，系统会自动保存代码与说明。

### 项目结构库

点击“选择本地项目目录”，系统会读取目录树并请求 AI 生成 Mermaid 结构图。之后你还可以补充自己的开发过程，让 AI 输出复盘建议。

### 模型设置

在界面右上角打开“模型设置”，填写：

- Base URL
- API Key
- Model Name

保存后即会使用你的专属模型配置。

## 注意事项

### 1. 浏览器兼容性

本项目依赖以下浏览器能力：

- `showOpenFilePicker`
- `showDirectoryPicker`

因此更推荐使用较新的 Chrome 或 Edge。

### 2. 鉴权

项目通过 Clerk 保护页面访问，默认所有页面都需要登录后才能使用。

### 3. AI 服务

项目结构分析和工作流诊断目前依赖 AI 请求成功返回结果。如果模型服务不可用，相关能力也会失败。

### 4. 加密

用户自定义 API Key 会通过 `AES-256-GCM` 方式处理。生产环境务必设置自己的 `ENCRYPTION_KEY`，不要使用默认回退值。

## 适合谁用

DevVault 更适合这些场景：

- 个人开发者做长期知识沉淀
- 团队内部整理常见技术概念
- 新成员接手旧项目时快速建立结构认知
- 想把“临时查到的答案”变成“长期可复用资产”的开发者

## 后续可以继续扩展的方向

- 增加 `.env.example`
- 增加删除、标签、筛选和归档能力
- 支持更多模型供应商和本地模型
- 增加项目截图或演示 GIF
- 增加测试与更完整的错误兜底

## 贡献方式

欢迎提交 Issue 或 Pull Request。

如果你准备提 PR，建议流程如下：

```bash
git checkout -b feature/your-feature-name
git commit -m "feat: your change"
git push origin feature/your-feature-name
```

## License

MIT
