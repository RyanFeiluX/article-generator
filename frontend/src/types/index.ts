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

export interface ArticleRequest {
  snippets: Array<{
    content: string;
    source?: string;
  }>;
  topic?: string;
  style: string;
  use_search: boolean;
  max_search_results: number;
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
