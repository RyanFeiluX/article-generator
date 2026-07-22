import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { LLMProvider, ConfiguredProvider } from '../types';
import { DEFAULT_PROVIDER_CONFIGS, AVAILABLE_MODELS, PROVIDER_LABELS } from '../types';

interface ProviderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ConfiguredProvider) => void;
  editProvider?: ConfiguredProvider | null;
}

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

export function ProviderConfigModal({
  isOpen, onClose, onSave, editProvider
}: ProviderConfigModalProps) {
  const { t } = useTranslation();
  const [provider, setProvider] = useState<LLMProvider>('volc');
  const [localConfig, setLocalConfig] = useState<Record<string, any>>(DEFAULT_PROVIDER_CONFIGS.volc);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editProvider) {
        setProvider(editProvider.provider);
        setLocalConfig(editProvider.config);
        setVerifyResult(editProvider.validated ? { valid: true, message: t('config.keyValid') } : null);
      } else {
        setProvider('volc');
        setLocalConfig(DEFAULT_PROVIDER_CONFIGS.volc);
        setVerifyResult(null);
      }
    }
  }, [isOpen, editProvider, t]);

  const handleProviderChange = (newProvider: LLMProvider) => {
    setProvider(newProvider);
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
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const body: Record<string, any> = {
        provider: provider,
        apiKey: localConfig.apiKey,
      };
      if (provider === 'azure') {
        body.endpoint = localConfig.endpoint;
        body.deploymentName = localConfig.deploymentName;
        body.apiVersion = localConfig.apiVersion;
      }
      if (provider === 'custom') {
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
    } catch {
      setVerifyResult({ valid: false, message: t('config.networkError') });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = () => {
    if (!verifyResult?.valid && !editProvider?.validated) {
      alert(t('config.verifyFirst'));
      return;
    }
    const newProvider: ConfiguredProvider = {
      id: editProvider?.id || `provider-${Date.now()}`,
      provider: provider,
      config: localConfig as any,
      validated: verifyResult?.valid || editProvider?.validated || false,
      createdAt: editProvider?.createdAt || Date.now()
    };
    onSave(newProvider);
    onClose();
  };

  if (!isOpen) return null;

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
    if (editProvider?.validated) {
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              {editProvider ? t('config.editProvider') : t('config.addProvider')}
            </h2>
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

        <div className="px-6 py-6 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.provider')}</label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as LLMProvider)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              {(Object.keys(PROVIDER_LABELS) as LLMProvider[]).map(p => (
                <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t(API_KEY_LABELS[provider])}</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={localConfig.apiKey || ''}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                placeholder={API_KEY_PLACEHOLDERS[provider] ? t(API_KEY_PLACEHOLDERS[provider]) : ''}
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

          {provider === 'azure' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.endpoint')}</label>
                <input
                  type="text"
                  value={localConfig.endpoint || ''}
                  onChange={(e) => handleConfigChange('endpoint', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
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

          {provider === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.baseUrl')}</label>
              <input
                type="text"
                value={localConfig.baseUrl || ''}
                onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          )}

          {provider !== 'azure' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.model')}</label>
              {(AVAILABLE_MODELS.find(m => m.provider === provider)?.models.length ?? 0) > 0 ? (
                <select
                  value={localConfig.model || ''}
                  onChange={(e) => handleConfigChange('model', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  {(AVAILABLE_MODELS.find(m => m.provider === provider)?.models || []).map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={localConfig.model || ''}
                  onChange={(e) => handleConfigChange('model', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              )}
            </div>
          )}

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

          {provider !== 'azure' && (
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
          )}

          {provider !== 'azure' && provider !== 'anthropic' && (
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
              disabled={!verifyResult?.valid && !editProvider?.validated}
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
