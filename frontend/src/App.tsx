import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SnippetInput } from './components/SnippetInput';
import { ProgressPanel } from './components/ProgressPanel';
import { ArticleDisplay } from './components/ArticleDisplay';
import { SensitiveWordsModal } from './components/SensitiveWordsModal';
import { TermTranslationModal } from './components/TermTranslationModal';
import { ConfigModal } from './components/ConfigModal';
import type { LLMConfig, ConfiguredProvider, ValidatedKeys } from './types';
import { DEFAULT_PROVIDER_CONFIGS } from './types';
import { useArticleGenerator } from './hooks/useArticleGenerator';

function migrateOldConfig(): { configuredProviders: ConfiguredProvider[]; activeProviderId: string } {
  const oldConfig = localStorage.getItem('llm-config');
  const oldValidatedKeys = localStorage.getItem('validated-keys');
  
  if (!oldConfig) {
    return { configuredProviders: [], activeProviderId: '' };
  }

  try {
    const parsed: LLMConfig = JSON.parse(oldConfig);
    const validatedKeys: ValidatedKeys = oldValidatedKeys ? JSON.parse(oldValidatedKeys) : {};
    
    const providerId = `${parsed.provider}-${Date.now()}`;
    const configuredProvider: ConfiguredProvider = {
      id: providerId,
      provider: parsed.provider,
      config: parsed.config,
      validated: !!validatedKeys[parsed.provider],
      createdAt: Date.now()
    };

    localStorage.removeItem('llm-config');
    localStorage.removeItem('validated-keys');
    
    return {
      configuredProviders: [configuredProvider],
      activeProviderId: providerId
    };
  } catch {
    return { configuredProviders: [], activeProviderId: '' };
  }
}

function App() {
  const { t, i18n } = useTranslation();

  const [configuredProviders, setConfiguredProviders] = useState<ConfiguredProvider[]>(() => {
    const saved = localStorage.getItem('configured-providers');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        const migrated = migrateOldConfig();
        return migrated.configuredProviders;
      }
    }
    const migrated = migrateOldConfig();
    return migrated.configuredProviders;
  });

  const [activeProviderId, setActiveProviderId] = useState<string>(() => {
    const saved = localStorage.getItem('active-provider');
    if (saved) {
      return saved;
    }
    const migrated = migrateOldConfig();
    return migrated.activeProviderId;
  });

  const llmConfig: LLMConfig = useMemo(() => {
    const activeProvider = configuredProviders.find(p => p.id === activeProviderId);
    if (activeProvider) {
      return {
        provider: activeProvider.provider,
        config: activeProvider.config
      };
    }
    return {
      provider: 'volc',
      config: DEFAULT_PROVIDER_CONFIGS.volc
    };
  }, [configuredProviders, activeProviderId]);

  useEffect(() => {
    localStorage.setItem('configured-providers', JSON.stringify(configuredProviders));
  }, [configuredProviders]);

  useEffect(() => {
    localStorage.setItem('active-provider', activeProviderId);
  }, [activeProviderId]);

  const [tavilyApiKey, setTavilyApiKey] = useState<string>(() => {
    return localStorage.getItem('tavily-api-key') || '';
  });

  useEffect(() => {
    localStorage.setItem('tavily-api-key', tavilyApiKey);
  }, [tavilyApiKey]);

  const [showSensitiveWords, setShowSensitiveWords] = useState(false);
  const [showTermTranslation, setShowTermTranslation] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const handleConfigChange = (config: LLMConfig) => {
    setConfiguredProviders(prev => {
      if (activeProviderId) {
        return prev.map(p => 
          p.id === activeProviderId 
            ? { ...p, config: config.config, provider: config.provider }
            : p
        );
      }
      const newProvider: ConfiguredProvider = {
        id: `provider-${Date.now()}`,
        provider: config.provider,
        config: config.config,
        validated: false,
        createdAt: Date.now()
      };
      setActiveProviderId(newProvider.id);
      return [...prev, newProvider];
    });
  };

  const handleAddProvider = (provider: ConfiguredProvider) => {
    setConfiguredProviders(prev => [...prev, provider]);
  };

  const handleRemoveProvider = (id: string) => {
    setConfiguredProviders(prev => prev.filter(p => p.id !== id));
    if (activeProviderId === id) {
      const remaining = configuredProviders.filter(p => p.id !== id);
      setActiveProviderId(remaining.length > 0 ? remaining[0].id : '');
    }
  };

  const handleSetActiveProvider = (id: string) => {
    setActiveProviderId(id);
  };

  const handleUpdateProvider = (id: string, updates: Partial<ConfiguredProvider>) => {
    setConfiguredProviders(prev => prev.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ));
  };

  const handleTavilyApiKeyChange = (key: string) => {
    setTavilyApiKey(key);
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('i18n-lang', nextLang);
  };

  const {
    snippets,
    isGenerating,
    progress,
    generatedContent,
    generatedTitle,
    sources,
    error,
    topic,
    style,
    length,
    useSearch,
    addSnippet,
    removeSnippet,
    updateSnippet,
    clearAll,
    generateArticle,
    reset,
    setTopic,
    setStyle,
    setLength,
    setUseSearch
  } = useArticleGenerator({ llmConfig, tavilyApiKey });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('header.title')}</h1>
              <p className="text-sm text-gray-500">{t('header.subtitle')}</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleLanguage}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{i18n.language === 'zh' ? '中文' : 'EN'}</span>
              </button>
              <button
                onClick={() => setShowTermTranslation(true)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-1"
                title="术语翻译"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>术语</span>
              </button>
              <button
                onClick={() => setShowConfig(true)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-1"
                title={t('header.settings')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{t('header.settings')}</span>
              </button>
              <button
                onClick={() => setShowSensitiveWords(true)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{t('header.sensitiveWords')}</span>
              </button>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                {t('header.poweredByAI')}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-screen-2xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Input */}
          <div className="lg:col-span-1 space-y-6">
            <SnippetInput
              snippets={snippets}
              onAdd={addSnippet}
              onRemove={removeSnippet}
              onUpdate={updateSnippet}
            />

            {/* Generation Settings */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">{t('settings.title')}</h3>
                {snippets.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-sm text-red-600 hover:text-red-800 flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>{t('settings.clearAll')}</span>
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('settings.topicLabel')}
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={t('settings.topicPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('settings.styleLabel')}
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="informative">{t('settings.styleInformative')}</option>
                    <option value="casual">{t('settings.styleCasual')}</option>
                    <option value="formal">{t('settings.styleFormal')}</option>
                    <option value="narrative">{t('settings.styleNarrative')}</option>
                    <option value="technical">{t('settings.styleTechnical')}</option>
                    <option value="opinion">{t('settings.styleOpinion')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('settings.lengthLabel')}
                  </label>
                  <select
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="micro">{t('settings.lengthMicro')}</option>
                    <option value="short">{t('settings.lengthShort')}</option>
                    <option value="standard">{t('settings.lengthStandard')}</option>
                    <option value="detailed">{t('settings.lengthDetailed')}</option>
                    <option value="comprehensive">{t('settings.lengthComprehensive')}</option>
                  </select>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="useSearch"
                    checked={useSearch}
                    onChange={(e) => setUseSearch(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="useSearch" className="text-sm text-gray-700">
                    {t('settings.useSearch')}
                  </label>
                </div>

                <button
                  onClick={generateArticle}
                  disabled={snippets.length === 0 || isGenerating}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                >
                  {isGenerating ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>{t('settings.generating')}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>{t('settings.generate')}</span>
                    </>
                  )}
                </button>

                {isGenerating && (
                  <button
                    onClick={reset}
                    className="w-full px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    {t('settings.cancel')}
                  </button>
                )}
              </div>
            </div>

            <ProgressPanel
              progress={progress}
              isGenerating={isGenerating}
              error={error}
            />
          </div>

          {/* Right Column - Output */}
          <div className="lg:col-span-2">
            <ArticleDisplay
              title={generatedTitle}
              content={generatedContent}
              sources={sources}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-screen-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>{t('footer.description')}</p>
            <p className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">v{(window as any).APP_VERSION || '0.0.1'}</p>
          </div>
        </div>
      </footer>

      {/* Sensitive Words Modal */}
      <SensitiveWordsModal
        isOpen={showSensitiveWords}
        onClose={() => setShowSensitiveWords(false)}
      />

      {/* Term Translation Modal */}
      <TermTranslationModal
        isOpen={showTermTranslation}
        onClose={() => setShowTermTranslation(false)}
      />

      {/* Config Modal */}
      <ConfigModal
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        config={llmConfig}
        configuredProviders={configuredProviders}
        activeProviderId={activeProviderId}
        onConfigChange={handleConfigChange}
        onAddProvider={handleAddProvider}
        onRemoveProvider={handleRemoveProvider}
        onSetActiveProvider={handleSetActiveProvider}
        onUpdateProvider={handleUpdateProvider}
        tavilyApiKey={tavilyApiKey}
        onTavilyApiKeyChange={handleTavilyApiKeyChange}
      />
    </div>
  );
}

export default App;
