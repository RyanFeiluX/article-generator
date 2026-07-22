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
export type LLMProvider = 'volc' | 'openai' | 'azure' | 'anthropic' | 'deepseek' | 'kimi' | 'custom';

// Provider-specific config interfaces
export interface VolcConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}

export interface OpenAIConfig {
  apiKey: string;
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
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface DeepSeekConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}

export interface KimiConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}

// Unified config interface
export interface LLMConfig {
  provider: LLMProvider;
  config: VolcConfig | OpenAIConfig | AzureConfig | AnthropicConfig | DeepSeekConfig | KimiConfig;
}

// Validated API keys — stores the key string that was successfully verified
export interface ValidatedKeys {
  volc?: string;
  openai?: string;
  azure?: string;
  anthropic?: string;
  deepseek?: string;
  kimi?: string;
  custom?: string;
}

export function isKeyValidated(
  provider: LLMProvider,
  apiKey: string,
  validatedKeys: ValidatedKeys
): boolean {
  return !!validatedKeys[provider] && validatedKeys[provider] === apiKey;
}

export interface ConfiguredProvider {
  id: string;
  provider: LLMProvider;
  config: VolcConfig | OpenAIConfig | AzureConfig | AnthropicConfig | DeepSeekConfig | KimiConfig;
  name?: string;
  validated: boolean;
  createdAt: number;
}

export interface AvailableModel {
  provider: LLMProvider;
  providerName: string;
  models: string[];
  requiresEndpoint?: boolean;
  requiresBaseUrl?: boolean;
}

export const AVAILABLE_MODELS: AvailableModel[] = [
  {
    provider: 'volc',
    providerName: 'Volc Engine ARK (Doubao)',
    models: ['doubao-pro', 'doubao-lite', 'doubao-3']
  },
  {
    provider: 'openai',
    providerName: 'OpenAI',
    models: ['gpt-4', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']
  },
  {
    provider: 'azure',
    providerName: 'Azure OpenAI',
    models: [],
    requiresEndpoint: true
  },
  {
    provider: 'anthropic',
    providerName: 'Anthropic Claude',
    models: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku']
  },
  {
    provider: 'deepseek',
    providerName: 'DeepSeek',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-chat', 'deepseek-r1']
  },
  {
    provider: 'kimi',
    providerName: 'Kimi (Moonshot)',
    models: ['kimi-k2.6', 'kimi-k2.5', 'kimi-k2.7-code', 'kimi-k2.7-code-highspeed', 'moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k']
  },
  {
    provider: 'custom',
    providerName: 'Custom API',
    models: [],
    requiresBaseUrl: true
  }
];

export const PROVIDER_LABELS: Record<LLMProvider, string> = {
  volc: 'Volc Engine ARK (Doubao)',
  openai: 'OpenAI',
  azure: 'Azure OpenAI',
  anthropic: 'Anthropic Claude',
  deepseek: 'DeepSeek',
  kimi: 'Kimi (Moonshot)',
  custom: 'Custom API'
};

// Default provider configs
export const DEFAULT_PROVIDER_CONFIGS: Record<LLMProvider, any> = {
  volc: {
    apiKey: '',
    model: 'doubao-pro',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.95
  },
  openai: {
    apiKey: '',
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
    model: 'claude-3-opus',
    temperature: 0.7,
    maxTokens: 4096
  },
  deepseek: {
    apiKey: '',
    model: 'deepseek-v4-flash',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.95
  },
  kimi: {
    apiKey: '',
    model: 'kimi-k2.6',
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
  length: string;
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
