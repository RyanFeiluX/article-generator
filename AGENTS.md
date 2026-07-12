# Article Generator — Repo Guide

## Tech stack

- **Backend**: FastAPI (Python 3.11) — `backend/main.py`
  - Entrypoint: `backend/entrypoint.py` (loads config, starts uvicorn on port 5000)
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS — `frontend/src/`
  - Entry: `frontend/src/main.tsx` → `App.tsx`
- **Deployment**: Single Docker container (multi-stage build, python:3.11-slim runtime)
- **No database** — all persistence is `localStorage`
- **No test framework** detected

## Commands

```bash
cd frontend && pnpm dev           # Vite dev server
cd backend && python main.py      # Backend dev
pnpm dev                          # scripts/dev.sh: builds frontend then starts backend
pnpm build                        # scripts/build.sh: installs deps + builds frontend
pnpm start                        # scripts/start.sh: production backend (uvicorn)
pnpm lint                         # eslint (root eslint.config.mjs)
pnpm ts-check                     # tsc -p tsconfig.json
docker-compose up --build         # Full stack container
docker_up.bat / docker_up.sh      # Build + launch with version bump
```

## Package manager

**pnpm only** — enforced by `"preinstall": "npx only-allow pnpm"`. Never use npm or yarn.

## Architecture notes

- Backend serves frontend static files (`frontend/dist/`) in production. In dev, Vite proxies or you run them separately.
- All content is **Chinese-first** (zh-CN default in `index.html`). i18next for EN/ZH switching.
- **7 LLM providers**: volc (default, ARK), openai, azure, anthropic, deepseek, kimi, custom
  - Default model is `doubao-pro` (Volc Engine); configured in `backend/default_config.json`
  - Config is also settable from the frontend (saved to `localStorage`)
- **Content verification pipeline**: generate → extract title/content → improve → verify → auto-retry up to 3× → replace sensitive words → enforce term translations
- **Web search**: Tavily API (needs key; primary) or DuckDuckGo (free fallback, no key needed)
- **Streaming**: SSE from `POST /api/generate` to frontend progress panel
- **Sensitive word filtering** in `backend/sensitive_words_config.json` (5 categories, per-word replacements)
- **Term translation map** in `backend/term_translation_map.json` (English→Chinese hard replacements)

## Important gotchas

- `VERSION` file at root (currently `0.3.5`) — Docker build reads it for image tagging
- Backend port is **5000** everywhere (uvicorn, Docker, vite config proxy)
- Root `src/` directory is stale/unused; real frontend is in `frontend/src/`
- Root `tsconfig.json` includes `"src"` but actual frontend TS config is `frontend/tsconfig.json`
- No `__init__.py` needed — backend is a flat module
- `pnpm build` runs `tsc && vite build` in frontend — TypeScript errors will fail the build
