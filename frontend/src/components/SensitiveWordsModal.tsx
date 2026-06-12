import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface CategoryConfig {
  label: string;
  enabled: boolean;
  words: string[];
}

interface SensitiveWordsResponse {
  count: number;
  categories: Record<string, CategoryConfig>;
  all_words: string[];
}

interface SensitiveWordsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SensitiveWordsModal: React.FC<SensitiveWordsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [data, setData] = useState<SensitiveWordsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [newWord, setNewWord] = useState<Record<string, string>>({});
  const [addingWord, setAddingWord] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setNewWord({});
      if (!data) {
        fetchSensitiveWords();
      }
    }
  }, [isOpen]);

  const fetchSensitiveWords = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/sensitive-words');
      if (!response.ok) {
        throw new Error(t('errors.loadSensitiveWordsFailed'));
      }
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || t('errors.loadSensitiveWordsError'));
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = async (category: string, currentEnabled: boolean) => {
    if (!data) {
      console.error('Data not loaded yet');
      return;
    }
    
    setUpdating(category);
    setError(null);
    try {
      const payload = { category, enabled: !currentEnabled };
      console.log('Sending PUT request:', payload);
      
      const response = await fetch('/api/sensitive-words/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.detail || t('errors.requestFailed', { status: response.status }));
      }
      
      const result = await response.json();
      console.log('Success response:', result);
      
      // Update local state
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: {
            ...prev.categories,
            [category]: {
              ...prev.categories[category],
              enabled: !currentEnabled
            }
          }
        };
      });
    } catch (err: any) {
      console.error('Toggle error:', err);
      setError(err.message || t('errors.toggleCategoryFailed'));
    } finally {
      setUpdating(null);
    }
  };

  const addWord = async (category: string) => {
    const word = newWord[category]?.trim().toLowerCase();
    if (!word || !data) return;
    
    setAddingWord(category);
    setError(null);
    try {
      const response = await fetch('/api/sensitive-words/word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, word })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || t('errors.addWordFailed'));
      }
      
      const result = await response.json();
      console.log('Add word result:', result);
      
      // Update local state
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: {
            ...prev.categories,
            [category]: {
              ...prev.categories[category],
              words: [...prev.categories[category].words, word]
            }
          }
        };
      });
      
      // Clear input
      setNewWord(prev => ({ ...prev, [category]: '' }));
    } catch (err: any) {
      console.error('Add word error:', err);
      setError(err.message || t('errors.addWordFailed'));
    } finally {
      setAddingWord(null);
    }
  };

  const deleteWord = async (category: string, word: string) => {
    if (!data) return;
    
    setUpdating(`${category}-${word}`);
    setError(null);
    try {
      const response = await fetch(`/api/sensitive-words/word?category=${encodeURIComponent(category)}&word=${encodeURIComponent(word)}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || t('errors.deleteWordFailed'));
      }
      
      console.log('Delete word result:', await response.json());
      
      // Update local state
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: {
            ...prev.categories,
            [category]: {
              ...prev.categories[category],
              words: prev.categories[category].words.filter(w => w !== word)
            }
          }
        };
      });
    } catch (err: any) {
      console.error('Delete word error:', err);
      setError(err.message || t('errors.deleteWordFailed'));
    } finally {
      setUpdating(null);
    }
  };

  if (!isOpen) return null;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'violence':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'illegal':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'adult':
        return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'hate':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'self_harm':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'violence':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'illegal':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        );
      case 'adult':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
        );
      case 'hate':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
          </svg>
        );
      case 'self_harm':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const enabledCount = data?.categories ? Object.values(data.categories).filter(c => c.enabled).length : 0;
  const totalCount = data?.categories ? Object.keys(data.categories).length : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {t('sensitive.title')}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t('sensitive.subtitle')}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loading && (
              <div className="flex justify-center py-8">
                <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {data && !loading && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {t('sensitive.monitorStatus')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t('sensitive.enabledCategories', { enabled: enabledCount, total: totalCount })}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    enabledCount === totalCount 
                      ? 'bg-green-100 text-green-700' 
                      : enabledCount > 0 
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}>
                    {enabledCount === totalCount ? t('sensitive.fullProtection') : enabledCount > 0 ? t('sensitive.partialProtection') : t('sensitive.disabled')}
                  </div>
                </div>

                {Object.entries(data.categories).map(([category, config]) => (
                  <div 
                    key={category} 
                    className={`border rounded-lg p-4 transition-opacity ${config.enabled ? 'border-gray-200' : 'border-gray-300 bg-gray-50 opacity-60'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${getCategoryColor(category)}`}>
                          {getCategoryIcon(category)}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{config.label}</h4>
                          <p className="text-xs text-gray-500">{config.words.length} {t('sensitive.words')}</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => toggleCategory(category, config.enabled)}
                        disabled={updating === category}
                        className={`relative inline-flex flex-shrink-0 h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          config.enabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                            config.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    {config.enabled && (
                      <>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {config.words.map((word) => (
                            <span
                              key={word}
                              className="group px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded font-mono flex items-center gap-1"
                            >
                              {word}
                              <button
                                onClick={() => deleteWord(category, word)}
                                disabled={updating === `${category}-${word}`}
                                className="ml-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                title={t('sensitive.deleteWord')}
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                        
                        {/* Add new word input */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newWord[category] || ''}
                            onChange={(e) => setNewWord(prev => ({ ...prev, [category]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && addWord(category)}
                            placeholder={t('sensitive.addPlaceholder')}
                            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            onClick={() => addWord(category)}
                            disabled={addingWord === category || !newWord[category]?.trim()}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                          >
                            {addingWord === category ? (
                              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            )}
                            {t('sensitive.add')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {t('sensitive.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SensitiveWordsModal;
