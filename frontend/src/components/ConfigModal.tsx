import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { LLMConfig, ConfiguredProvider } from '../types';
import { AVAILABLE_MODELS, PROVIDER_LABELS } from '../types';
import { ProviderConfigModal } from './ProviderConfigModal';

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

export function ConfigModal({
  isOpen, onClose,
  configuredProviders, activeProviderId,
  onAddProvider, onRemoveProvider, onSetActiveProvider, onUpdateProvider,
  tavilyApiKey = '', onTavilyApiKeyChange,
}: ConfigModalProps) {
  const { t } = useTranslation();
  const [localTavilyKey, setLocalTavilyKey] = useState(tavilyApiKey);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ConfiguredProvider | null>(null);
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());

  const toggleExpand = (providerId: string) => {
    setExpandedProviders(prev => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (isOpen) {
      setLocalTavilyKey(tavilyApiKey);
      setShowProviderModal(false);
      setEditingProvider(null);
    }
  }, [isOpen, tavilyApiKey]);

  const handleOpenAddModal = () => {
    setEditingProvider(null);
    setShowProviderModal(true);
  };

  const handleOpenEditModal = (provider: ConfiguredProvider) => {
    setEditingProvider(provider);
    setShowProviderModal(true);
  };

  const handleSaveProvider = (provider: ConfiguredProvider) => {
    if (editingProvider) {
      onUpdateProvider(editingProvider.id, provider);
    } else {
      onAddProvider(provider);
    }
  };

  const handleRemoveConfigured = (id: string) => {
    if (confirm(t('config.confirmDelete'))) {
      onRemoveProvider(id);
    }
  };

  const handleSetActive = (id: string) => {
    onSetActiveProvider(id);
  };

  const handleSave = () => {
    if (onTavilyApiKeyChange) {
      onTavilyApiKeyChange(localTavilyKey);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col">
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
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {AVAILABLE_MODELS.map(available => (
                  <div key={available.provider} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => toggleExpand(available.provider)}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-sm text-gray-800">{available.providerName}</span>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${expandedProviders.has(available.provider) ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    {expandedProviders.has(available.provider) && (
                      <div className="px-3 pb-2">
                        {available.models.length > 0 && (
                          <div className="space-y-0.5">
                            {available.models.map(model => (
                              <div key={model} className="text-xs text-gray-500 pl-2 border-l-2 border-gray-300">
                                {model}
                              </div>
                            ))}
                          </div>
                        )}
                        {available.models.length === 0 && (
                          <div className="text-xs text-gray-400 pl-2">
                            {available.requiresEndpoint ? t('config.azureCustomModel') : t('config.customModel')}
                          </div>
                        )}
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

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {configuredProviders.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    {t('config.noConfiguredProviders')}
                  </div>
                ) : (
                  configuredProviders.map(provider => (
                    <div
                      key={provider.id}
                      className={`bg-white rounded-lg p-3 border-2 ${activeProviderId === provider.id ? 'border-blue-500' : 'border-gray-200'}`}
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
                          onClick={() => handleSetActive(provider.id)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${activeProviderId === provider.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                          {activeProviderId === provider.id ? t('config.current') : t('config.setActive')}
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(provider)}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                        >
                          {t('config.edit')}
                        </button>
                        <button
                          onClick={() => handleRemoveConfigured(provider.id)}
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
                onClick={handleOpenAddModal}
                className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 text-sm flex items-center justify-center gap-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('config.addNewProvider')}
              </button>
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('config.save')}
            </button>
          </div>
        </div>
      </div>

      <ProviderConfigModal
        isOpen={showProviderModal}
        onClose={() => setShowProviderModal(false)}
        onSave={handleSaveProvider}
        editProvider={editingProvider}
      />
    </div>
  );
}
