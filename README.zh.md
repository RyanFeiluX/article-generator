# 文章生成器

[English](README.md) | [中文](README.zh.md)

基于文本片段的 AI 智能文章生成工具，内置内容校验机制。

## 快速开始

### 后端（FastAPI）
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows 下使用 venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### 前端（React + Vite）
```bash
cd frontend
pnpm install
pnpm dev
```

访问 http://localhost:3000

## 功能特性

- 多片段输入，支持来源标注
- AI 文章生成（火山引擎 ARK 大模型）
- 网络搜索内容补充
- **内置内容校验**（失败自动重试）
- **敏感词过滤**（可查看完整列表）
- **数据持久化**（localStorage 本地存储）
- 实时流式输出（SSE）
- 导出（TXT、MD、HTML）& 一键复制
- **一键「清除全部」**

## 文章风格

系统提供三种写作风格，每种风格会影响生成文章的语气和表达方式：

| 风格 | 说明 |
|------|------|
| **资讯型**（默认） | 平衡、专业的语气，表述清晰、注重事实。适合通用文章和知识科普。 |
| **休闲型** | 轻松、口语化的语气，语言亲切易读。适合博客文章、生活类内容和读者友好型内容。 |
| **正式型** | 精准、严谨、权威的语气。适合报告、白皮书及专业出版物。 |

所选风格在初次生成和自动优化过程中均会保持一致。

## 文档

详细安装指南请参阅 [docs/INSTALL.md](docs/INSTALL.md)。
