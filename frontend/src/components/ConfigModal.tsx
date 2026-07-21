import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { LLMConfig, LLMProvider, ValidatedKeys } from '../types';
import { DEFAULT_PROVIDER_CONFIGS, isKeyValidated } from '../types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LLMConfig;
  onConfigChange: (config: LLMConfig) => void;
  tavilyApiKey?: string;
  onTavilyApiKeyChange?: (key: string) => void;
  validatedKeys: ValidatedKeys;
  onValidatedKeysChange: (keys: ValidatedKeys) => void;
  onApiKeyChange: (provider: LLMProvider, newKey: string) => void;
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

const API_KEY_LABELS: Record<LLMProvider, string> = {
  volc: 'config.arkApiKey',
  openai: 'config.openaiApiKey',
  azure: 'config.azureApiKey',
  anthropic: 'config.anthropicApiKey',
  deepseek: 'config.deepseekApiKey',
  kimi: 'config.kimiApiKey',
  custom: 'config.apiKey',
};

const API_KEY_PLACEHOLDERS: Record<LLMProvider, string> = {
  volc: 'config.arkApiKeyPlaceholder',
  openai: 'sk-...',
  azure: '',
  anthropic: 'sk-ant-...',
  deepseek: 'sk-...',
  kimi: 'sk-...',
  custom: '',
};

export function ConfigModal({
  isOpen, onClose, config, onConfigChange,
  tavilyApiKey = '', onTavilyApiKeyChange,
  validatedKeys, onValidatedKeysChange, onApiKeyChange,
}: ConfigModalProps) {
  const { t } = useTranslation();
  const [localProvider, setLocalProvider] = useState<LLMProvider>(config.provider);
  const [localConfig, setLocalConfig] = useState<Record<string, any>>(config.config || DEFAULT_PROVIDER_CONFIGS[config.provider]);
  const [localTavilyKey, setLocalTavilyKey] = useState(tavilyApiKey);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; message: string } | null>(null);

  useEffect(() => {
    setLocalProvider(config.provider);
    setLocalConfig(config.config || DEFAULT_PROVIDER_CONFIGS[config.provider]);
    setLocalTavilyKey(tavilyApiKey);
    setVerifyResult(null);
  }, [config, tavilyApiKey]);

  const handleProviderChange = (newProvider: LLMProvider) => {
    setLocalProvider(newProvider);
    setLocalConfig(DEFAULT_PROVIDER_CONFIGS[newProvider]);
    setVerifyResult(null);
  };

  const handleConfigChange = (key: string, value: string | number) => {
    setLocalConfig((prev: Record<string, any>) => ({
      ...prev,
      [key]: value
    }));
    if (key === 'apiKey') {
      setVerifyResult(null);
      onApiKeyChange(localProvider, value as string);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const body: Record<string, any> = {
        provider: localProvider,
        apiKey: localConfig.apiKey,
      };
      if (localProvider === 'azure') {
        body.endpoint = localConfig.endpoint;
        body.deploymentName = localConfig.deploymentName;
        body.apiVersion = localConfig.apiVersion;
      }
      if (localProvider === 'custom') {
        body.baseUrl = localConfig.baseUrl;
        body.model = localConfig.model;
      }
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setVerifyResult(data);
      if (data.valid) {
        onValidatedKeysChange({
          ...validatedKeys,
          [localProvider]: localConfig.apiKey,
        });
      } else {
        const next = { ...validatedKeys };
        delete next[localProvider];
        onValidatedKeysChange(next);
      }
    } catch {
      setVerifyResult({ valid: false, message: t('config.networkError') });
    } finally {
      setIsVerifying(false);
    }
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

  const validated = isKeyValidated(localProvider, localConfig.apiKey, validatedKeys);
  const canSave = validated;

  const renderValidationStatus = () => {
    if (verifyResult) {
      return verifyResult.valid
        ? <span className="text-green-600 text-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t('config.keyValid')}
          </span>
        : <span className="text-red-600 text-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {verifyResult.message || t('config.keyInvalid')}
          </span>;
    }
    if (validated) {
      return <span className="text-green-600 text-sm flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {t('config.keyValid')}
      </span>;
    }
    return <span className="text-gray-400 text-sm">{t('config.keyNotSet')}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex-shrink-0">
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

        <div className="px-6 py-6 space-y-4 overflow-y-auto flex-1">
          {/* === Section 1: API Keys === */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('config.apiKeys')}</h3>

            {/* Provider selector */}
            <div className="mb-3">
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

            {/* API key input + Verify button */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t(API_KEY_LABELS[localProvider])}</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={localConfig.apiKey || ''}
                  onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                  placeholder={API_KEY_PLACEHOLDERS[localProvider] ? t(API_KEY_PLACEHOLDERS[localProvider]) : ''}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={handleVerify}
                  disabled={isVerifying || !localConfig.apiKey}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                >
                  {isVerifying ? t('config.verifying') : t('config.verifyKey')}
                </button>
              </div>
              <div className="mt-1.5">{renderValidationStatus()}</div>
            </div>

            {/* Azure-specific: endpoint + deploymentName (moved here for validation) */}
            {localProvider === 'azure' && (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.endpoint')}</label>
                  <input
                    type="text"
                    value={localConfig.endpoint || ''}
                    onChange={(e) => handleConfigChange('endpoint', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.deploymentName')}</label>
                  <input
                    type="text"
                    value={localConfig.deploymentName || ''}
                    onChange={(e) => handleConfigChange('deploymentName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </>
            )}

            {/* Custom-specific: baseUrl (moved here for validation) */}
            {localProvider === 'custom' && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.baseUrl')}</label>
                <input
                  type="text"
                  value={localConfig.baseUrl || ''}
                  onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            )}
          </div>

          <hr className="border-gray-200" />

          {/* === Section 2: Model & Parameters === */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('config.modelAndParams')}</h3>

            {/* Model selector — disabled if not validated */}
            {localProvider !== 'azure' && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.model')}</label>
                {MODEL_SUGGESTIONS[localProvider].length > 0 ? (
                  <select
                    value={localConfig.model || ''}
                    onChange={(e) => handleConfigChange('model', e.target.value)}
                    disabled={!validated}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    {MODEL_SUGGESTIONS[localProvider].map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={localConfig.model || ''}
                    onChange={(e) => handleConfigChange('model', e.target.value)}
                    disabled={!validated}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                )}
                {!validated && (
                  <p className="mt-1 text-xs text-amber-600">{t('config.verifyFirst')}</p>
                )}
              </div>
            )}

            {/* Temperature */}
            {localProvider !== 'azure' && (
              <div className="mb-3">
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
            )}

            {/* Max Tokens */}
            <div className="mb-3">
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

            {/* Top P */}
            {localProvider !== 'azure' && localProvider !== 'anthropic' && (
              <div className="mb-3">
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
          </div>

          <hr className="border-gray-200" />

          {/* === Section 3: Search Engine (unchanged) === */}
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

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              {t('config.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {t('config.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
