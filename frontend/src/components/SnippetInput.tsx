import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  snippets: { id: string; content: string; source?: string }[];
  onAdd: (content: string, source?: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, content: string, source?: string) => void;
}

export const SnippetInput: React.FC<Props> = ({ snippets, onAdd, onRemove, onUpdate }) => {
  const { t } = useTranslation();
  const [newContent, setNewContent] = useState('');
  const [newSource, setNewSource] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editSource, setEditSource] = useState('');
  const editContentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingId && editContentRef.current) {
      editContentRef.current.focus();
    }
  }, [editingId]);

  const handleAdd = () => {
    if (newContent.trim()) {
      onAdd(newContent.trim(), newSource.trim() || undefined);
      setNewContent('');
      setNewSource('');
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  const startEditing = (snippet: { id: string; content: string; source?: string }) => {
    setEditingId(snippet.id);
    setEditContent(snippet.content);
    setEditSource(snippet.source || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent('');
    setEditSource('');
  };

  const saveEditing = () => {
    if (editingId && editContent.trim()) {
      onUpdate(editingId, editContent.trim(), editSource.trim() || undefined);
      cancelEditing();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      saveEditing();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">{t('snippet.addTitle')}</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('snippet.contentLabel')}
            </label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onKeyDown={handleAddKeyDown}
              placeholder={t('snippet.contentPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={4}
            />
            <div className="text-xs text-gray-500 text-right mt-1">
              {newContent.length.toLocaleString()} {t('snippet.characters')}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('snippet.sourceLabel')}
            </label>
            <input
              type="text"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder={t('snippet.sourcePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button
            onClick={handleAdd}
            disabled={!newContent.trim()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {t('snippet.addButton')}
          </button>
        </div>
      </div>

      {snippets.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-gray-900">
              {t('snippet.listTitle')} ({snippets.length})
            </h3>
            <span className="text-sm text-gray-500">
              {t('snippet.total')}: {snippets.reduce((acc, s) => acc + s.content.length, 0)} {t('snippet.chars')}
            </span>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {snippets.map((snippet, index) => (
              <div
                key={snippet.id}
                className="bg-gray-50 rounded-lg p-3 border border-gray-100"
              >
                {editingId === snippet.id ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        {t('snippet.editTitle')}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={saveEditing}
                          disabled={!editContent.trim()}
                          className="text-green-600 hover:text-green-800 text-sm font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          {t('snippet.save')}
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="text-gray-500 hover:text-gray-700 text-sm"
                        >
                          {t('snippet.cancel')}
                        </button>
                      </div>
                    </div>
                    <textarea
                      ref={editContentRef}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                      rows={4}
                    />
                    <input
                      type="text"
                      value={editSource}
                      onChange={(e) => setEditSource(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      placeholder={t('snippet.sourcePlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <div className="text-xs text-gray-400">
                      Ctrl+Enter {t('snippet.save')} | Esc {t('snippet.cancel')}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEditing(snippet)}
                          className="text-blue-500 hover:text-blue-700 text-sm"
                        >
                          {t('snippet.edit')}
                        </button>
                        <button
                          onClick={() => onRemove(snippet.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          {t('snippet.remove')}
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mt-2 text-sm whitespace-pre-wrap">
                      {snippet.content.length > 200 
                        ? snippet.content.substring(0, 200) + '...' 
                        : snippet.content}
                    </p>
                    
                    {snippet.source && (
                      <p className="text-gray-500 mt-1 text-xs italic">
                        {t('snippet.source')}: {snippet.source}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SnippetInput;
