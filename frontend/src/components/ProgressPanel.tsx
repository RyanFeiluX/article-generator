import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GenerationProgress } from '../types';

interface ProgressPanelProps {
  progress: GenerationProgress | null;
  isGenerating: boolean;
  error: string | null;
}

export const ProgressPanel: React.FC<ProgressPanelProps> = ({
  progress,
  isGenerating,
  error
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'generating':
        return 'bg-blue-500';
      case 'improving':
        return 'bg-purple-500';
      case 'searching':
        return 'bg-yellow-500';
      case 'verifying':
        return 'bg-indigo-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'improving':
        return (
          <svg className="w-5 h-5 text-purple-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
      case 'generating':
        return (
          <svg className="w-5 h-5 text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        );
      case 'searching':
        return (
          <svg className="w-5 h-5 text-yellow-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case 'verifying':
        return (
          <svg className="w-5 h-5 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'preparing':
        return t('progress.preparing');
      case 'searching':
        return t('progress.searching');
      case 'generating':
        return t('progress.generating');
      case 'verifying':
        return t('progress.verifying');
      case 'improving':
        return t('progress.improving');
      case 'complete':
        return t('progress.complete');
      case 'error':
        return t('progress.error');
      default:
        return t('progress.processing');
    }
  };

  const copyStatusToClipboard = async () => {
    if (!progress) return;
    
    const statusText = `${getStatusLabel(progress.status)}: ${progress.message} (${Math.round(progress.progress)}%)`;
    
    try {
      await navigator.clipboard.writeText(statusText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyErrorToClipboard = async () => {
    if (!error) return;
    
    try {
      await navigator.clipboard.writeText(error);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">{t('progress.title')}</h3>
        {(isGenerating || progress) && (
          <button
            onClick={copyStatusToClipboard}
            className={`flex items-center space-x-1 px-2 py-1 text-xs rounded-md transition-colors ${
              copied 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={t('progress.copy')}
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{t('progress.copied')}</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>{t('progress.copy')}</span>
              </>
            )}
          </button>
        )}
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700 text-sm flex-1">{error}</p>
            <button
              onClick={copyErrorToClipboard}
              className="flex-shrink-0 p-1 text-red-400 hover:text-red-600 transition-colors"
              title={t('progress.copy')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {isGenerating && progress && (
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            {getStatusIcon(progress.status)}
            <div className="flex-1">
              <span className="text-gray-700 font-medium">{getStatusLabel(progress.status)}</span>
              <span className="text-gray-500 text-sm ml-2">- {progress.message}</span>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${getStatusColor(progress.status)}`}
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          
          <p className="text-sm text-gray-500 text-right">
            {Math.round(progress.progress)}%
          </p>
        </div>
      )}
      
      {!isGenerating && !error && !progress && (
        <div className="text-center py-6">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 text-sm">
            {t('progress.idleHint')}
          </p>
        </div>
      )}
      
      {!isGenerating && progress?.status === 'complete' && (
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-green-700 font-medium">{t('progress.ready')}</p>
          <p className="text-gray-500 text-sm mt-1">{t('progress.readyHint')}</p>
        </div>
      )}
    </div>
  );
};

export default ProgressPanel;
