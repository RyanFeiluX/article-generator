import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { LLMConfig, LLMProvider, ConfiguredProvider } from '../types';
import { DEFAULT_PROVIDER_CONFIGS, AVAILABLE_MODELS, PROVIDER_LABELS } from '../types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LLMConfig;
  configuredProviders: ConfiguredProvider[];
  activeProviderId: string;
  onConfigChange: (config: LLMConfig) => void;
  onAddProvider: (provider: ConfiguredProvider) => void;
  onRemoveProvider: (id: string) => void;
  onSetActiveProvider: (id: string) => void;
  onUpdateProvider: (id: string, updates: Partial<ConfiguredProvider>) => void;
  tavilyApiKey?: string;
  onTavilyApiKeyChange?: (key: string) => void;
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

export function ConfigModal({
  isOpen, onClose, config,
  configuredProviders, activeProviderId,
  onConfigChange, onAddProvider, onRemoveProvider,
  onSetActiveProvider, onUpdateProvider,
  tavilyApiKey = '', onTavilyApiKeyChange,
}: ConfigModalProps) {
  const { t } = useTranslation();
  const [localProvider, setLocalProvider] = useState<LLMProvider>(config.provider);
  const [localConfig, setLocalConfig] = useState<Record<string, any>>(config.config || DEFAULT_PROVIDER_CONFIGS[config.provider]);
  const [localTavilyKey, setLocalTavilyKey] = useState(tavilyApiKey);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProviderType, setNewProviderType] = useState<LLMProvider>('volc');
  const [newProviderConfig, setNewProviderConfig] = useState<Record<string, any>>(DEFAULT_PROVIDER_CONFIGS.volc);
  const [newVerifyResult, setNewVerifyResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [isVerifyingNew, setIsVerifyingNew] = useState(false);
  const [selectedConfiguredId, setSelectedConfiguredId] = useState<string | null>(activeProviderId);

  useEffect(() => {
    if (isOpen) {
      const activeProvider = configuredProviders.find(p => p.id === activeProviderId);
      if (activeProvider) {
        setLocalProvider(activeProvider.provider);
        setLocalConfig(activeProvider.config);
        setSelectedConfiguredId(activeProviderId);
      } else {
        setLocalProvider(config.provider);
        setLocalConfig(config.config || DEFAULT_PROVIDER_CONFIGS[config.provider]);
        setSelectedConfiguredId(null);
      }
      setLocalTavilyKey(tavilyApiKey);
      setVerifyResult(null);
      setShowAddProvider(false);
    }
  }, [isOpen, config, activeProviderId, configuredProviders, tavilyApiKey]);

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
      if (data.valid && activeProviderId) {
        onUpdateProvider(activeProviderId, { validated: true, config: localConfig as any });
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

  const handleSelectConfigured = (id: string) => {
    setSelectedConfiguredId(id);
    const provider = configuredProviders.find(p => p.id === id);
    if (provider) {
      setLocalProvider(provider.provider);
      setLocalConfig(provider.config);
      setVerifyResult(provider.validated ? { valid: true, message: t('config.keyValid') } : null);
    }
  };

  const handleSetActive = (id: string) => {
    onSetActiveProvider(id);
    handleSelectConfigured(id);
  };

  const handleRemoveConfigured = (id: string) => {
    if (confirm(t('config.confirmDelete'))) {
      onRemoveProvider(id);
    }
  };

  const handleNewProviderTypeChange = (provider: LLMProvider) => {
    setNewProviderType(provider);
    setNewProviderConfig(DEFAULT_PROVIDER_CONFIGS[provider]);
    setNewVerifyResult(null);
  };

  const handleNewConfigChange = (key: string, value: string | number) => {
    setNewProviderConfig((prev: Record<string, any>) => ({
      ...prev,
      [key]: value
    }));
    if (key === 'apiKey') {
      setNewVerifyResult(null);
    }
  };

  const handleVerifyNew = async () => {
    setIsVerifyingNew(true);
    setNewVerifyResult(null);
    try {
      const body: Record<string, any> = {
        provider: newProviderType,
        apiKey: newProviderConfig.apiKey,
      };
      if (newProviderType === 'azure') {
        body.endpoint = newProviderConfig.endpoint;
        body.deploymentName = newProviderConfig.deploymentName;
        body.apiVersion = newProviderConfig.apiVersion;
      }
      if (newProviderType === 'custom') {
        body.baseUrl = newProviderConfig.baseUrl;
        body.model = newProviderConfig.model;
      }
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setNewVerifyResult(data);
    } catch {
      setNewVerifyResult({ valid: false, message: t('config.networkError') });
    } finally {
      setIsVerifyingNew(false);
    }
  };

  const handleAddNewProvider = () => {
    if (!newVerifyResult?.valid) {
      alert(t('config.verifyFirst'));
      return;
    }
    const newProvider: ConfiguredProvider = {
      id: `provider-${Date.now()}`,
      provider: newProviderType,
      config: newProviderConfig as any,
      validated: true,
      createdAt: Date.now()
    };
    onAddProvider(newProvider);
    onSetActiveProvider(newProvider.id);
    setShowAddProvider(false);
    setNewProviderConfig(DEFAULT_PROVIDER_CONFIGS.volc);
    setNewProviderType('volc');
    setNewVerifyResult(null);
  };

  const handleCancelAdd = () => {
    setShowAddProvider(false);
    setNewProviderConfig(DEFAULT_PROVIDER_CONFIGS.volc);
    setNewProviderType('volc');
    setNewVerifyResult(null);
  };

  if (!isOpen) return null;

  const activeProvider = configuredProviders.find(p => p.id === activeProviderId);
  const canSave = activeProvider?.validated || verifyResult?.valid;

  const renderValidationStatus = (result = verifyResult) => {
    if (result) {
      return result.valid
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
            {result.message || t('config.keyInvalid')}
          </span>;
    }
    if (activeProvider?.validated && selectedConfiguredId === activeProviderId) {
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
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col">
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

        <div className="px-6 py-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {t('config.availableModels')}
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {AVAILABLE_MODELS.map(available => (
                  <div key={available.provider} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="font-medium text-sm text-gray-800">{available.providerName}</div>
                    {available.models.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {available.models.map(model => (
                          <div key={model} className="text-xs text-gray-500 pl-2 border-l-2 border-gray-300">
                            {model}
                          </div>
                        ))}
                      </div>
                    )}
                    {available.models.length === 0 && (
                      <div className="mt-1.5 text-xs text-gray-400 pl-2">
                        {available.requiresEndpoint ? t('config.azureCustomModel') : t('config.customModel')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                {t('config.configuredModels')}
              </h3>
              
              {showAddProvider ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('config.selectProvider')}</label>
                    <select
                      value={newProviderType}
                      onChange={(e) => handleNewProviderTypeChange(e.target.value as LLMProvider)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {(Object.keys(PROVIDER_LABELS) as LLMProvider[]).map(provider => (
                        <option key={provider} value={provider}>{PROVIDER_LABELS[provider]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t(API_KEY_LABELS[newProviderType])}</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={newProviderConfig.apiKey || ''}
                        onChange={(e) => handleNewConfigChange('apiKey', e.target.value)}
                        placeholder={API_KEY_PLACEHOLDERS[newProviderType] ? t(API_KEY_PLACEHOLDERS[newProviderType]) : ''}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <button
                        onClick={handleVerifyNew}
                        disabled={isVerifyingNew || !newProviderConfig.apiKey}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                      >
                        {isVerifyingNew ? t('config.verifying') : t('config.verifyKey')}
                      </button>
                    </div>
                    {newVerifyResult && (
                      <div className="mt-1.5">
                        {renderValidationStatus(newVerifyResult)}
                      </div>
                    )}
                  </div>
                  {(newProviderType === 'azure') && (
                    <>
                      <input
                        type="text"
                        value={newProviderConfig.endpoint || ''}
                        onChange={(e) => handleNewConfigChange('endpoint', e.target.value)}
                        placeholder={t('config.endpoint')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        value={newProviderConfig.deploymentName || ''}
                        onChange={(e) => handleNewConfigChange('deploymentName', e.target.value)}
                        placeholder={t('config.deploymentName')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </>
                  )}
                  {newProviderType === 'custom' && (
                    <input
                      type="text"
                      value={newProviderConfig.baseUrl || ''}
                      onChange={(e) => handleNewConfigChange('baseUrl', e.target.value)}
                      placeholder={t('config.baseUrl')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddNewProvider}
                      disabled={!newVerifyResult?.valid}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                    >
                      {t('config.addProvider')}
                    </button>
                    <button
                      onClick={handleCancelAdd}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                    >
                      {t('config.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {configuredProviders.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        {t('config.noConfiguredProviders')}
                      </div>
                    ) : (
                      configuredProviders.map(provider => (
                        <div
                          key={provider.id}
                          className={`bg-white rounded-lg p-3 border-2 ${selectedConfiguredId === provider.id ? 'border-blue-500' : 'border-gray-200'} cursor-pointer`}
                          onClick={() => handleSelectConfigured(provider.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {activeProviderId === provider.id && (
                                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                </svg>
                              )}
                              <span className="font-medium text-sm text-gray-800">{PROVIDER_LABELS[provider.provider]}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {provider.validated && (
                                <span className="text-green-500">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {provider.provider === 'azure' 
                              ? (provider.config as any).deploymentName || '-'
                              : (provider.config as any).model || '-'}
                          </div>
                          <div className="mt-2 flex gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSetActive(provider.id); }}
                              className={`px-2 py-1 text-xs rounded transition-colors ${activeProviderId === provider.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                              {activeProviderId === provider.id ? t('config.current') : t('config.setActive')}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemoveConfigured(provider.id); }}
                              className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                            >
                              {t('config.delete')}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <button
                    onClick={() => setShowAddProvider(true)}
                    className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 text-sm flex items-center justify-center gap-1 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t('config.addNewProvider')}
                  </button>
                </>
              )}
            </div>
          </div>

          <hr className="border-gray-200 my-6" />

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('config.modelAndParams')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.provider')}</label>
                <select
                  value={localProvider}
                  onChange={(e) => handleProviderChange(e.target.value as LLMProvider)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  {(Object.keys(PROVIDER_LABELS) as LLMProvider[]).map(provider => (
                    <option key={provider} value={provider}>{PROVIDER_LABELS[provider]}</option>
                  ))}
                </select>
              </div>

              <div>
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

              {localProvider === 'azure' && (
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

              {localProvider === 'custom' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.baseUrl')}</label>
                  <input
                    type="text"
                    value={localConfig.baseUrl || ''}
                    onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              {(localProvider !== 'azure') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('config.model')}</label>
                  {(AVAILABLE_MODELS.find(m => m.provider === localProvider)?.models.length ?? 0) > 0 ? (
                    <select
                      value={localConfig.model || ''}
                      onChange={(e) => handleConfigChange('model', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      {(AVAILABLE_MODELS.find(m => m.provider === localProvider)?.models || []).map(model => (
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

              {(localProvider !== 'azure') && (
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

              {(localProvider !== 'azure' && localProvider !== 'anthropic') && (
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
          </div>

          <hr className="border-gray-200 my-6" />

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
