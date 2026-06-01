import { useState, useEffect } from 'react';
import type { LLMConfig, LLMProvider } from '../types';
import { DEFAULT_PROVIDER_CONFIGS } from '../types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LLMConfig;
  onConfigChange: (config: LLMConfig) => void;
}

// Provider display names
const PROVIDER_NAMES: Record<LLMProvider, string> = {
  volc: 'Volc Engine ARK (Doubao)',
  openai: 'OpenAI',
  azure: 'Azure OpenAI',
  anthropic: 'Anthropic Claude',
  custom: 'Custom API'
};

// Model suggestions per provider
const MODEL_SUGGESTIONS: Record<LLMProvider, string[]> = {
  volc: ['doubao-pro', 'doubao-lite', 'doubao-3'],
  openai: ['gpt-4', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  azure: [], // User specifies deployment name
  anthropic: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'],
  custom: []
};

export function ConfigModal({ isOpen, onClose, config, onConfigChange }: ConfigModalProps) {
  const [localProvider, setLocalProvider] = useState<LLMProvider>(config.provider);
  const [localConfig, setLocalConfig] = useState<Record<string, any>>(config.config);

  // Update local state when external config changes
  useEffect(() => {
    setLocalProvider(config.provider);
    setLocalConfig(config.config);
  }, [config]);

  // Reset config when provider changes
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
    onClose();
  };

  const handleReset = () => {
    const defaultConfig = DEFAULT_PROVIDER_CONFIGS[localProvider];
    setLocalConfig(defaultConfig);
  };

  if (!isOpen) return null;

  // Render provider-specific form fields
  const renderProviderForm = () => {
    switch (localProvider) {
      case 'volc':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                ARK API Key
              </label>
              <input
                type="password"
                value={localConfig.apiKey}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                placeholder="Enter your Volc ARK API key"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Required for AI generation. Get from Volc Engine ARK console.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                API Base URL
              </label>
              <input
                type="text"
                value={localConfig.baseUrl}
                onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Model
              </label>
              <input
                type="text"
                value={localConfig.model}
                onChange={(e) => handleConfigChange('model', e.target.value)}
                placeholder="e.g., doubao-pro"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Suggestions: {MODEL_SUGGESTIONS.volc.join(', ')}
              </p>
            </div>
          </>
        );

      case 'openai':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={localConfig.apiKey}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                API Base URL (Optional)
              </label>
              <input
                type="text"
                value={localConfig.baseUrl || ''}
                onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Model
              </label>
              <select
                value={localConfig.model}
                onChange={(e) => handleConfigChange('model', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Azure API Key
              </label>
              <input
                type="password"
                value={localConfig.apiKey}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                placeholder="Enter your Azure API key"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Azure Endpoint
              </label>
              <input
                type="text"
                value={localConfig.endpoint}
                onChange={(e) => handleConfigChange('endpoint', e.target.value)}
                placeholder="https://your-resource.openai.azure.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Deployment Name
              </label>
              <input
                type="text"
                value={localConfig.deploymentName}
                onChange={(e) => handleConfigChange('deploymentName', e.target.value)}
                placeholder="Your deployment name"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                API Version
              </label>
              <input
                type="text"
                value={localConfig.apiVersion}
                onChange={(e) => handleConfigChange('apiVersion', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
            </div>
          </>
        );

      case 'anthropic':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Anthropic API Key
              </label>
              <input
                type="password"
                value={localConfig.apiKey}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                API Base URL (Optional)
              </label>
              <input
                type="text"
                value={localConfig.baseUrl || ''}
                onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                placeholder="https://api.anthropic.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Model
              </label>
              <select
                value={localConfig.model}
                onChange={(e) => handleConfigChange('model', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {MODEL_SUGGESTIONS.anthropic.map(model => (
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                API Key
              </label>
              <input
                type="password"
                value={localConfig.apiKey}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                placeholder="Enter API key"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                API Base URL
              </label>
              <input
                type="text"
                value={localConfig.baseUrl}
                onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                placeholder="https://your-api-endpoint.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Model
              </label>
              <input
                type="text"
                value={localConfig.model}
                onChange={(e) => handleConfigChange('model', e.target.value)}
                placeholder="Model name"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  // Common parameters (shared by most providers)
  const renderCommonParams = () => {
    // Only show common params if provider is not azure (azure has different params)
    if (localProvider === 'azure') {
      return null;
    }

    return (
      <>
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-sm font-medium text-gray-700">
              Temperature
            </label>
            <span className="text-sm text-gray-500 font-mono">
              {localConfig.temperature?.toFixed(2) || '0.70'}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={localConfig.temperature || 0.7}
            onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <p className="mt-1 text-xs text-gray-500">
            Controls randomness. Lower = more deterministic, Higher = more creative
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Max Tokens
          </label>
          <input
            type="number"
            min="512"
            max="32768"
            value={localConfig.maxTokens || 4096}
            onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value) || 4096)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {localProvider !== 'anthropic' && (
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-medium text-gray-700">
                Top P (Nucleus Sampling)
              </label>
              <span className="text-sm text-gray-500 font-mono">
                {localConfig.topP?.toFixed(2) || '0.95'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localConfig.topP || 0.95}
              onChange={(e) => handleConfigChange('topP', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <p className="mt-1 text-xs text-gray-500">
              Controls diversity via nucleus sampling. Lower = more focused
            </p>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h2 className="text-xl font-semibold text-white">LLM Configuration</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Provider Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              LLM Provider
            </label>
            <select
              value={localProvider}
              onChange={(e) => handleProviderChange(e.target.value as LLMProvider)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {(Object.keys(PROVIDER_NAMES) as LLMProvider[]).map(provider => (
                <option key={provider} value={provider}>{PROVIDER_NAMES[provider]}</option>
              ))}
            </select>
          </div>

          {/* Provider-specific form fields */}
          {renderProviderForm()}

          {/* Common parameters */}
          {renderCommonParams()}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
