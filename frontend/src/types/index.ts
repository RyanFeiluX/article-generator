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

// Provider types
export type LLMProvider = 'volc' | 'openai' | 'azure' | 'anthropic' | 'deepseek' | 'custom';

// Provider-specific config interfaces
export interface VolcConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}

export interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}

export interface AzureConfig {
  apiKey: string;
  endpoint: string;
  deploymentName: string;
  apiVersion: string;
  temperature: number;
  maxTokens: number;
}

export interface AnthropicConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface DeepSeekConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}

// Unified config interface
export interface LLMConfig {
  provider: LLMProvider;
  config: VolcConfig | OpenAIConfig | AzureConfig | AnthropicConfig | DeepSeekConfig;
}

// Default provider configs
export const DEFAULT_PROVIDER_CONFIGS: Record<LLMProvider, any> = {
  volc: {
    apiKey: '',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-pro',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.95
  },
  openai: {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.95
  },
  azure: {
    apiKey: '',
    endpoint: '',
    deploymentName: '',
    apiVersion: '2024-02-15-preview',
    temperature: 0.7,
    maxTokens: 4096
  },
  anthropic: {
    apiKey: '',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-opus',
    temperature: 0.7,
    maxTokens: 4096
  },
  deepseek: {
    apiKey: '',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-v4-flash',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.95
  },
  custom: {
    apiKey: '',
    baseUrl: '',
    model: '',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.95
  }
};

export interface ArticleRequest {
  snippets: Array<{
    content: string;
    source?: string;
  }>;
  topic?: string;
  style: string;
  use_search: boolean;
  max_search_results: number;
  tavily_api_key?: string;
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
