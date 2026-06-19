import { useState, useCallback, useEffect, useRef } from 'react';
import i18next from 'i18next';
import type { 
  Snippet, 
  ArticleRequest, 
  GenerationProgress, 
  SearchSource,
  LLMConfig
} from '../types';

const STORAGE_KEY = 'article-generator-state';

interface StoredState {
  snippets: Snippet[];
  generatedTitle: string;
  generatedContent: string;
  topic: string;
  style: string;
  useSearch: boolean;
}

interface UseArticleGeneratorProps {
  llmConfig: LLMConfig;
  tavilyApiKey?: string;
}

interface UseArticleGeneratorReturn {
  snippets: Snippet[];
  isGenerating: boolean;
  progress: GenerationProgress | null;
  generatedContent: string;
  generatedTitle: string;
  sources: SearchSource[];
  error: string | null;
  topic: string;
  style: string;
  useSearch: boolean;
  addSnippet: (content: string, source?: string) => void;
  removeSnippet: (id: string) => void;
  updateSnippet: (id: string, content: string, source?: string) => void;
  clearSnippets: () => void;
  clearAll: () => void;
  generateArticle: () => Promise<void>;
  reset: () => void;
  setTopic: (topic: string) => void;
  setStyle: (style: string) => void;
  setUseSearch: (useSearch: boolean) => void;
}

function loadStoredState(): StoredState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load stored state:', e);
  }
  return null;
}

function saveStoredState(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export function useArticleGenerator({ llmConfig, tavilyApiKey }: UseArticleGeneratorProps): UseArticleGeneratorReturn {
  const storedState = loadStoredState();
  
  const [snippets, setSnippets] = useState<Snippet[]>(storedState?.snippets || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [generatedContent, setGeneratedContent] = useState(storedState?.generatedContent || '');
  const [generatedTitle, setGeneratedTitle] = useState(storedState?.generatedTitle || '');
  const [sources, setSources] = useState<SearchSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Settings
  const [topic, setTopic] = useState((storedState?.topic === 'null' || storedState?.topic === null) ? '' : storedState?.topic || '');
  const [style, setStyle] = useState(storedState?.style || 'informative');
  const [useSearch, setUseSearch] = useState(storedState?.useSearch ?? true);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const contentBufferRef = useRef<string>('');

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveStoredState({
      snippets,
      generatedTitle,
      generatedContent,
      topic,
      style,
      useSearch
    });
  }, [snippets, generatedTitle, generatedContent, topic, style, useSearch]);

  const addSnippet = useCallback((content: string, source?: string) => {
    const newSnippet: Snippet = {
      id: `snippet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      source
    };
    setSnippets(prev => [...prev, newSnippet]);
  }, []);

  const removeSnippet = useCallback((id: string) => {
    setSnippets(prev => prev.filter(s => s.id !== id));
  }, []);

  const updateSnippet = useCallback((id: string, content: string, source?: string) => {
    setSnippets(prev => prev.map(s => 
      s.id === id ? { ...s, content, source } : s
    ));
  }, []);

  const clearSnippets = useCallback(() => {
    setSnippets([]);
  }, []);

  const clearAll = useCallback(() => {
    setSnippets([]);
    setGeneratedContent('');
    setGeneratedTitle('');
    setSources([]);
    setError(null);
    setTopic('');
    setStyle('informative');
    setUseSearch(true);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const parseSSE = useCallback((data: string): { event: string; data: any } | null => {
    const lines = data.split('\n');
    let event = '';
    let jsonData = '';
    
    for (const line of lines) {
      if (line.startsWith('event:')) {
        event = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        jsonData = line.substring(5).trim();
      }
    }
    
    if (jsonData) {
      try {
        // Handle HTML line breaks in content
        if (event === 'content') {
          return { event, data: jsonData.replace(/<br>/g, '\n').replace(/\\"/g, '"') };
        }
        return { event, data: JSON.parse(jsonData) };
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  const generateArticle = useCallback(async () => {
    const validSnippets = snippets.filter(s => s.content.trim().length > 0);
    if (validSnippets.length === 0) {
      setError(i18next.t('errors.noSnippet'));
      return;
    }

    setIsGenerating(true);
    setError(null);
    contentBufferRef.current = '';
    setGeneratedContent('');
    setGeneratedTitle('');
    setSources([]);
    setProgress({ status: 'preparing', message: 'Starting...', progress: 0 });

    abortControllerRef.current = new AbortController();

    const request: ArticleRequest = {
      snippets: validSnippets.map(s => ({ content: s.content.trim(), source: s.source?.trim() || undefined })),
      topic: topic.trim() || undefined,
      style,
      use_search: useSearch,
      max_search_results: 5,
      tavily_api_key: tavilyApiKey || undefined,
      llm_config: llmConfig
    };

    console.log('[DEBUG] llmConfig passed to hook:', llmConfig);
    console.log('[DEBUG] llmConfig.provider:', llmConfig?.provider);
    console.log('[DEBUG] llmConfig.config:', llmConfig?.config);
    console.log('[DEBUG] Sending request:', JSON.stringify(request, null, 2));

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal
      });

      console.log('[DEBUG] Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG] Error response:', errorText);
        throw new Error(`HTTP error: ${response.status}: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const chunk of lines) {
          if (!chunk.trim()) continue;
          
          const parsed = parseSSE(chunk);
          if (!parsed) continue;

          switch (parsed.event) {
            case 'progress':
              setProgress(parsed.data);
              break;
            case 'content':
              contentBufferRef.current += parsed.data;
              setGeneratedContent(prev => prev + parsed.data);
              break;
            case 'complete':
              setGeneratedTitle(parsed.data.title || '');
              if (parsed.data.sources) {
                setSources(parsed.data.sources);
              }
              setProgress({ status: 'complete', message: 'Article ready!', progress: 100 });
              break;
            case 'error':
              setError(parsed.data.message || 'Generation failed');
              break;
          }
        }
      }

      // Use buffered content if no title was set
      if (!generatedTitle && contentBufferRef.current) {
        // Try [Title]...[Content] pattern first
        const titleMatch = contentBufferRef.current.match(/\[Title\]\s*([\s\S]+?)(?:\n\s*\[Content\])/i);
        if (titleMatch) {
          setGeneratedTitle(titleMatch[1].trim().split('\n')[0].trim());
        } else {
          // Fallback: try [Title] followed by text until double newline or end
          const fallbackMatch = contentBufferRef.current.match(/\[Title\]\s*(.+?)(?:\n\n|$)/i);
          if (fallbackMatch) {
            setGeneratedTitle(fallbackMatch[1].trim());
          }
        }
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError(i18next.t('errors.generationCancelled'));
      } else {
        setError(err.message || i18next.t('errors.generationFailed'));
      }
    } finally {
      setIsGenerating(false);
    }
  }, [snippets, topic, style, useSearch, parseSSE, generatedTitle, tavilyApiKey]);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
    setProgress(null);
    setGeneratedContent('');
    setGeneratedTitle('');
    setSources([]);
    setError(null);
    contentBufferRef.current = '';
  }, []);

  return {
    snippets,
    isGenerating,
    progress,
    generatedContent,
    generatedTitle,
    sources,
    error,
    topic,
    style,
    useSearch,
    addSnippet,
    removeSnippet,
    updateSnippet,
    clearSnippets,
    clearAll,
    generateArticle,
    reset,
    setTopic,
    setStyle,
    setUseSearch
  };
}
