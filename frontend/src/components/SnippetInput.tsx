import { useState } from 'react';

interface Props {
  snippets: { id: string; content: string; source?: string }[];
  onAdd: (content: string, source?: string) => void;
  onRemove: (id: string) => void;
}

export const SnippetInput: React.FC<Props> = ({ snippets, onAdd, onRemove }) => {
  const [newContent, setNewContent] = useState('');
  const [newSource, setNewSource] = useState('');

  const handleAdd = () => {
    if (newContent.trim()) {
      onAdd(newContent.trim(), newSource.trim() || undefined);
      setNewContent('');
      setNewSource('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Add Text Snippets</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Snippet Content *
            </label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your text snippet here... (Ctrl+Enter to add)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={4}
            />
            <div className="text-xs text-gray-500 text-right mt-1">
              {newContent.length.toLocaleString()} characters
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source (Optional)
            </label>
            <input
              type="text"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="e.g., Author Name, Document Title, URL"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button
            onClick={handleAdd}
            disabled={!newContent.trim()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Add Snippet
          </button>
        </div>
      </div>

      {snippets.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-gray-900">
              Snippets ({snippets.length})
            </h3>
            <span className="text-sm text-gray-500">
              Total: {snippets.reduce((acc, s) => acc + s.content.length, 0)} chars
            </span>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {snippets.map((snippet, index) => (
              <div
                key={snippet.id}
                className="bg-gray-50 rounded-lg p-3 border border-gray-100"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded">
                    #{index + 1}
                  </span>
                  <button
                    onClick={() => onRemove(snippet.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
                
                <p className="text-gray-700 mt-2 text-sm whitespace-pre-wrap">
                  {snippet.content.length > 200 
                    ? snippet.content.substring(0, 200) + '...' 
                    : snippet.content}
                </p>
                
                {snippet.source && (
                  <p className="text-gray-500 mt-1 text-xs italic">
                    Source: {snippet.source}
                  </p>
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
