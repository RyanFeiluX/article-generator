import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { LLMConfig, LLMProvider } from '../types';
import { DEFAULT_PROVIDER_CONFIGS } from '../types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LLMConfig;
  onConfigChange: (config: LLMConfig) => void;
  tavilyApiKey?: string;
  onTavilyApiKeyChange?: (key: string) => void;
}

const PROVIDER_NAMES: Record<LLMProvider, string> = {
  volc: 'Volc Engine ARK (Doubao)',
  openai: 'OpenAI',
  azure: 'Azure OpenAI',
  anthropic: 'Anthropic Claude',
  deepseek: 'DeepSeek',
  kimi: 'Kimi (Moonshot)',
  custom: 'Custom API'
};

const MODEL_SUGGESTIONS: Record<LLMProvider, string[]> = {
  volc: ['doubao-pro', 'doubao-lite', 'doubao-3'],
  openai: ['gpt-4', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  azure: [],
  anthropic: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'],
  deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-chat', 'deepseek-r1'],
  kimi: ['kimi-k2.6', 'kimi-k2.5', 'kimi-k2.7-code', 'kimi-k2.7-code-highspeed', 'moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k', 'moonshot-v1-128k-vision-preview', 'moonshot-v1-32k-vision-preview', 'moonshot-v1-8k-vision-preview'],
  custom: []
};

export function ConfigModal({ isOpen, onClose, config, onConfigChange, tavilyApiKey = '', onTavilyApiKeyChange }: ConfigModalProps) {
  const { t } = useTranslation();
  const [localProvider, setLocalProvider] = useState<LLMProvider>(config.provider);
  const [localConfig, setLocalConfig] = useState<Record<string, any>>(config.config || DEFAULT_PROVIDER_CONFIGS[config.provider]);
  const [localTavilyKey, setLocalTavilyKey] = useState(tavilyApiKey);

  useEffect(() => {
    setLocalProvider(config.provider);
    setLocalConfig(config.config || DEFAULT_PROVIDER_CONFIGS[config.provider]);
    setLocalTavilyKey(tavilyApiKey);
  }, [config, tavilyApiKey]);

  const handleProviderChange = (newProvider: LLMProvider) => {
    setLocalProvider(newProvider);
    setLocalConfig(DEFAULT_PROVIDER_CONFIGS[newProvider]);
  };

  const handleConfigChange = (key: string, value: string | number) => {
    setLocalConfig((prev: Record<string, any>) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    onConfigChange({
      provider: localProvider,
      config: localConfig as any
    });
    if (onTavilyApiKeyChange) {
      onTavilyApiKeyChange(localTavilyKey);
    }
    onClose();
  };

  if (!isOpen) return null;

  const renderProviderForm = () => {
    switch (localProvider) {
      case 'volc':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.arkApiKey')}</label>
              <input
                type="password"
                value={localConfig.apiKey}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                placeholder={t('config.arkApiKeyPlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.model')}</label>
              <input
                type="text"
                value={localConfig.model}
                onChange={(e) => handleConfigChange('model', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </>
        );

      case 'openai':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.openaiApiKey')}</label>
              <input
                type="password"
                value={localConfig.apiKey}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.model')}</label>
              <select
                value={localConfig.model}
                onChange={(e) => handleConfigChange('model', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {MODEL_SUGGESTIONS.openai.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
          </>
        );

      case 'azure':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.azureApiKey')}</label>
              <input
                type="password"
                value={localConfig.apiKey}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.endpoint')}</label>
              <input
                type="text"
                value={localConfig.endpoint}
                onChange={(e) => handleConfigChange('endpoint', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.deploymentName')}</label>
              <input
                type="text"
                value={localConfig.deploymentName}
                onChange={(e) => handleConfigChange('deploymentName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </>
        );

      case 'anthropic':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.anthropicApiKey')}</label>
              <input
                type="password"
                value={localConfig.apiKey}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.model')}</label>
              <select
                value={localConfig.model}
                onChange={(e) => handleConfigChange('model', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {MODEL_SUGGESTIONS.anthropic.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
          </>
        );

      case 'deepseek':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.deepseekApiKey')}</label>
              <input
                type="password"
                value={localConfig.apiKey}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.model')}</label>
              <select
                value={localConfig.model}
                onChange={(e) => handleConfigChange('model', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {MODEL_SUGGESTIONS.deepseek.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
          </>
        );

      case 'kimi':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.kimiApiKey')}</label>
              <input
                type="password"
                value={localConfig.apiKey}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.model')}</label>
              <select
                value={localConfig.model}
                onChange={(e) => handleConfigChange('model', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {MODEL_SUGGESTIONS.kimi.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
          </>
        );

      case 'custom':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.apiKey')}</label>
              <input
                type="password"
                value={localConfig.apiKey}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.baseUrl')}</label>
              <input
                type="text"
                value={localConfig.baseUrl}
                onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.model')}</label>
              <input
                type="text"
                value={localConfig.model}
                onChange={(e) => handleConfigChange('model', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const renderCommonParams = () => {
    if (localProvider === 'azure' || !localConfig) return null;

    return (
      <>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.temperature')}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={localConfig.temperature !== undefined ? localConfig.temperature : 0.7}
            onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.maxTokens')}</label>
          <input
            type="number"
            min="512"
            max="32768"
            value={localConfig.maxTokens !== undefined ? localConfig.maxTokens : 4096}
            onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value) || 4096)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        {localProvider !== 'anthropic' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.topP')}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localConfig.topP !== undefined ? localConfig.topP : 0.95}
              onChange={(e) => handleConfigChange('topP', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg"
            />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">{t('config.title')}</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.provider')}</label>
            <select
              value={localProvider}
              onChange={(e) => handleProviderChange(e.target.value as LLMProvider)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              {(Object.keys(PROVIDER_NAMES) as LLMProvider[]).map(provider => (
                <option key={provider} value={provider}>{PROVIDER_NAMES[provider]}</option>
              ))}
            </select>
          </div>

          {renderProviderForm()}

          {renderCommonParams()}

          {/* Search Engine Section */}
          <hr className="border-gray-200" />
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('config.searchEngine')}</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.tavilyApiKey')}</label>
              <input
                type="password"
                value={localTavilyKey}
                onChange={(e) => setLocalTavilyKey(e.target.value)}
                placeholder="tvly-..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <p className="mt-1 text-xs text-gray-500">{t('config.tavilyHint')}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              {t('config.cancel')}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('config.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
