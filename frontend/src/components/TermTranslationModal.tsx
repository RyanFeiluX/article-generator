import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface TermTranslationData {
  enabled: boolean;
  terms: Record<string, string>;
}

interface TermTranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermTranslationModal: React.FC<TermTranslationModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [data, setData] = useState<TermTranslationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSource, setNewSource] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [editSource, setEditSource] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError(null);
      fetchTermTranslationMap();
    }
  }, [isOpen]);

  const fetchTermTranslationMap = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/term-translation-map');
      if (!response.ok) {
        throw new Error(t('errors.loadFailed'));
      }
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || t('errors.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const toggleEnabled = async (currentEnabled: boolean) => {
    setError(null);
    try {
      const response = await fetch('/api/term-translation-map/enabled', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled })
      });
      if (!response.ok) throw new Error(t('errors.requestFailed'));
      const result = await response.json();
      setData(prev => prev ? { ...prev, enabled: result.enabled } : prev);
    } catch (err: any) {
      setError(err.message || t('errors.toggleFailed'));
    }
  };

  const addTerm = async () => {
    const source = newSource.trim();
    const target = newTarget.trim();
    if (!source || !target || !data) return;

    setError(null);
    try {
      const response = await fetch('/api/term-translation-map/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, target })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || t('errors.addFailed'));
      }
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          terms: { ...prev.terms, [source]: target }
        };
      });
      setNewSource('');
      setNewTarget('');
    } catch (err: any) {
      setError(err.message || t('errors.addFailed'));
    }
  };

  const deleteTerm = async (source: string) => {
    if (!data) return;
    setError(null);
    try {
      const response = await fetch(`/api/term-translation-map/terms?source=${encodeURIComponent(source)}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || t('errors.deleteFailed'));
      }
      setData(prev => {
        if (!prev) return prev;
        const newTerms = { ...prev.terms };
        delete newTerms[source];
        return { ...prev, terms: newTerms };
      });
    } catch (err: any) {
      setError(err.message || t('errors.deleteFailed'));
    }
  };

  const updateTerm = async (source: string, target: string) => {
    if (!data) return;
    setError(null);
    try {
      const response = await fetch('/api/term-translation-map/terms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, target })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || t('errors.updateFailed'));
      }
      setData(prev => {
        if (!prev) return prev;
        return { ...prev, terms: { ...prev.terms, [source]: target } };
      });
      setEditSource(null);
      setEditTarget('');
    } catch (err: any) {
      setError(err.message || t('errors.updateFailed'));
    }
  };

  const resetToDefaults = async () => {
    setError(null);
    try {
      const response = await fetch('/api/term-translation-map/reset', {
        method: 'POST'
      });
      if (!response.ok) throw new Error(t('errors.resetFailed'));
      await fetchTermTranslationMap();
    } catch (err: any) {
      setError(err.message || t('errors.resetFailed'));
    }
  };

  if (!isOpen) return null;

  const termCount = data ? Object.keys(data.terms).length : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  术语翻译约束
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  配置 LLM 生成文章时必须使用的术语翻译映射
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
              <div className="p-4 bg-red-50 rounded-lg mb-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {data && !loading && (
              <div className="space-y-4">
                {/* Enabled toggle */}
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">启用术语约束</p>
                    <p className="text-xs text-gray-500">
                      {data.enabled ? '已启用 - LLM 将强制使用指定翻译' : '已禁用 - 术语翻译约束未生效'}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleEnabled(data.enabled)}
                    className={`relative inline-flex flex-shrink-0 h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      data.enabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                        data.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Stats bar */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    共 <span className="font-semibold">{termCount}</span> 条术语映射
                  </p>
                  <button
                    onClick={resetToDefaults}
                    className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    恢复默认
                  </button>
                </div>

                {/* Add new term */}
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700 mb-3">添加术语映射</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTerm()}
                      placeholder="源术语 (如 AI)"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={newTarget}
                      onChange={(e) => setNewTarget(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTerm()}
                      placeholder="目标翻译 (如 人工智能)"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={addTerm}
                      disabled={!newSource.trim() || !newTarget.trim()}
                      className="px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      添加
                    </button>
                  </div>
                </div>

                {/* Term list */}
                {termCount > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {Object.entries(data.terms).map(([source, target]) => (
                      <div
                        key={source}
                        className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 group"
                      >
                        {editSource === source ? (
                          <>
                            <input
                              type="text"
                              value={editTarget}
                              onChange={(e) => setEditTarget(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && updateTerm(source, editTarget)}
                              className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                            <button
                              onClick={() => updateTerm(source, editTarget)}
                              className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                            >
                              保存
                            </button>
                            <button
                              onClick={() => { setEditSource(null); setEditTarget(''); }}
                              className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                              取消
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 font-mono text-sm font-medium text-gray-900">{source}</span>
                            <span className="text-gray-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                              </svg>
                            </span>
                            <span className="flex-1 font-mono text-sm text-blue-700">{target}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setEditSource(source); setEditTarget(target); }}
                                className="p-1 text-gray-400 hover:text-blue-500"
                                title="编辑"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => deleteTerm(source)}
                                className="p-1 text-gray-400 hover:text-red-500"
                                title="删除"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">暂无术语映射，请添加</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermTranslationModal;
