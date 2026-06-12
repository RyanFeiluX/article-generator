# Article Generator

[English](README.md) | [中文](README.zh.md)

AI-powered article generation from text snippets with content verification.

## Quick Start

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```

### Frontend (React + Vite)
```bash
cd frontend
pnpm install
pnpm dev
```

Access at http://localhost:3000

## Features

- Multi-snippet input with source attribution
- AI article generation (Volc Engine ARK LLM)
- Web search supplements
- **Internal content verification** (auto-retry on failure)
- **Sensitive words filtering** (viewable list)
- **Data persistence** (localStorage)
- Real-time streaming (SSE)
- Export (TXT, MD, HTML) & Copy
- **Single-click "Clear All"**

## Article Types

Three writing styles are available, each shaping the tone and language of the generated article:

| Style | Description |
|-------|-------------|
| **Informative** (default) | Balanced, professional tone with clear explanations and factual presentation. Suitable for general-purpose articles and explainers. |
| **Casual** | Relaxed, conversational tone with approachable language. Suitable for blog posts, lifestyle pieces, and reader-friendly content. |
| **Formal** | Precise, polished, and authoritative tone. Suitable for reports, white papers, and professional publications. |

The selected style is applied throughout both the initial generation and any automatic improvement passes.

## Input Limits

| Constraint | Value |
|------------|-------|
| Text snippets per request | 1 – 20 |
| Characters per snippet | 1 – 100,000 |
| Minimum generated article length | 3,000 characters or 2× total input length (whichever is larger) |
| Auto-improvement retries | Up to 3 attempts on verification failure |

## Documentation

See [docs/INSTALL.md](docs/INSTALL.md) for detailed installation guide.
