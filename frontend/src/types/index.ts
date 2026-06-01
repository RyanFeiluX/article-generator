export interface Snippet {
  id: string;
  content: string;
  source?: string;
}

export interface SearchSource {
  title: string;
  url: string;
  snippet: string;
  site: string;
}

export interface GenerationProgress {
  status: 'preparing' | 'searching' | 'generating' | 'verifying' | 'improving' | 'complete' | 'error';
  message: string;
  progress: number;
}

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}

export interface ArticleRequest {
  snippets: Array<{
    content: string;
    source?: string;
  }>;
  topic?: string;
  style: string;
  use_search: boolean;
  max_search_results: number;
  llm_config?: LLMConfig;
}

export interface GenerationComplete {
  title: string;
  sources: SearchSource[];
}

export interface SensitiveWordsResponse {
  count: number;
  categories: {
    violence: string[];
    illegal: string[];
    adult: string[];
    hate: string[];
    self_harm: string[];
  };
  all_words: string[];
}
