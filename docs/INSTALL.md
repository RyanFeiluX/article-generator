# Article Generator - Installation Package

A full-stack application for generating AI-powered articles from text snippets with content verification.

## Features

- **Multi-snippet Input**: Receive multiple text snippets from users with optional source attribution
- **AI Article Generation**: Generate comprehensive articles using Coze's built-in LLM
- **Web Search Supplement**: Automatically supplement content with online search results
- **Internal Content Verification** (Invisible to Frontend):
  - Size validation (500-30,000 characters)
  - Anti-duplication check (n-gram similarity analysis)
  - Conflict detection (contradictory statements)
  - Logical flow verification (intro, transitions, conclusion)
  - **Auto-retry on failure**: Articles that fail verification are automatically improved
- **Sensitive Words Filtering**: Comprehensive list of inappropriate content indicators
- **Real-time Streaming**: See article generation in real-time via SSE
- **Data Persistence**: Content persists across page refreshes via localStorage
- **Export Options**: Download articles as TXT, Markdown, or HTML
- **Copy to Clipboard**: One-click copy functionality
- **Clear All**: Single-click to clear all input and output

## Architecture

```
article-generator/
├── backend/              # FastAPI Python backend
│   ├── main.py           # API server with LLM integration
│   └── requirements.txt  # Python dependencies
├── frontend/             # React + Vite frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks
│   │   └── types/        # TypeScript types
│   └── package.json
└── docs/
    └── INSTALL.md       # This file
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- pnpm (package manager)

## Installation Steps

### Step 1: Backend Setup

```bash
# Navigate to backend directory
cd article-generator/backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

### Step 2: Frontend Setup

```bash
# Open a new terminal and navigate to frontend directory
cd article-generator/frontend

# Install Node.js dependencies
pnpm install
```

### Step 3: Start the Application

You need to run both backend and frontend services.

**Terminal 1 - Backend (FastAPI on port 8000):**
```bash
cd article-generator/backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python main.py
```

**Terminal 2 - Frontend (Vite on port 3000):**
```bash
cd article-generator/frontend
pnpm dev
```

### Step 4: Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

The frontend will proxy API requests to the backend at `http://localhost:8000`.

## Usage Guide

### 1. Add Text Snippets

- Enter your text content in the "Snippet Content" field
- Optionally add a source/author
- Click "Add Snippet" or press Ctrl+Enter
- Add multiple snippets as needed
- Total character count is displayed

### 2. Configure Generation Settings

- **Topic**: Optional title or topic hint for the article
- **Style**: Choose between Informative, Casual, or Formal
- **Web Search**: Enable/disable supplementary web search

### 3. Generate Article

Click "Generate Article" to start the process. The backend will:
- Prepare your snippets
- Search for supplementary information (if enabled)
- Generate article using AI
- **Automatically verify and improve** if quality checks fail
- Stream results in real-time

### 4. Export & Copy

After generation:
- Click "Copy" to copy to clipboard
- Select export format (.txt, .md, .html)
- Click "Export" to download the file

### 5. Manage Content

- **Clear All**: Removes all snippets, generated content, and resets settings
- **Clear Snippets**: Removes only the snippets (generated content preserved)
- **Data Persistence**: Refresh the page without losing your content

### 6. View Sensitive Words

Click "Sensitive Words" in the header to view:
- Total count of monitored words
- Words organized by category (Violence, Illegal, Adult, Hate, Self-Harm)
- The complete list of checked terms

## API Endpoints

### Backend API (Port 8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /` | GET | Health check |
| `GET /health` | GET | Detailed health status |
| `POST /api/generate` | POST | Generate article (SSE stream) |
| `GET /api/sensitive-words` | GET | Get sensitive words list |
| `GET /api/config` | GET | Get verification config |

### Example API Call

```bash
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "snippets": [{"content": "Your text snippet here"}],
    "topic": "AI Technology",
    "style": "informative",
    "use_search": true,
    "max_search_results": 5
  }'
```

## Sensitive Words Categories

The application monitors for inappropriate content in these categories:

| Category | Description | Example Words |
|----------|-------------|---------------|
| Violence | Harmful violent content | murder, kill, bomb, terrorist, weapon |
| Illegal | Illegal activities | drugs, fraud, scam, hack, theft |
| Adult | Adult content indicators | porn, nude, escort |
| Hate | Hate speech | hate, racist, Nazi, discriminate |
| Self-Harm | Self-harm and exploitation | suicide, exploit, predator |

> Note: Detected sensitive words may affect article quality score but won't necessarily block generation.

## Content Verification (Internal)

The backend automatically verifies articles with these checks:

1. **Size Check**: Ensures 500-30,000 characters
2. **Duplication Check**: N-gram similarity analysis (max 25%)
3. **Conflict Check**: Detects contradictory statements
4. **Logical Flow**: Checks for intro, transitions, conclusion
5. **Sensitive Words**: Flags inappropriate content

If verification fails, the system will automatically retry up to 3 times with improvement prompts.

## Configuration

### Verification Gates

Edit `backend/main.py` to modify verification thresholds:

```python
MIN_ARTICLE_LENGTH = 500   # Minimum characters
MAX_ARTICLE_LENGTH = 30000 # Maximum characters
MAX_DUPLICATION_RATIO = 0.25 # Maximum duplication ratio
MAX_RETRY_ATTEMPTS = 3      # Auto-retry attempts
```

### LLM Model

Change the model in `backend/main.py`:

```python
llm_client = LLMClient(ctx=llm_ctx)
# The default model is configured in the SDK
```

## Troubleshooting

### Port Already in Use

If port 8000 or 3000 is already in use:
- Backend: Change port in `main.py`: `uvicorn.run(..., port=8001)`
- Frontend: Change port in `vite.config.ts`: `port: 3001`

### CORS Errors

If you see CORS errors, ensure the backend CORS middleware is configured:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### LLM Connection Issues

Ensure the Coze SDK is properly installed:
```bash
pip install coze-coding-dev-sdk coze-coding-utils
```

## Development

### Running in Development Mode

Both services support hot reload:
- Backend: Auto-reload on Python file changes
- Frontend: HMR (Hot Module Replacement) enabled

### Building for Production

**Frontend:**
```bash
cd frontend
pnpm build
```

**Backend:**
```bash
cd backend
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

## Docker Deployment

A docker-compose.yml is provided for containerized deployment:

```bash
docker-compose up -d
```

## License

MIT License
