'use client';

import React, { useState } from 'react';
import { UserIcon, SparklesIcon } from '@heroicons/react/24/outline';

export interface ChatMessageData {
  role: 'user' | 'assistant' | 'system' | 'document';
  content: string;
  timestamp: Date;
  diagramVersion?: string;
  diagramVersions?: string[];
  error?: string;
}

export interface ChatMessageProps {
  message: ChatMessageData;
  onDiagramVersionSelect: (version: string) => Promise<void>;
  onRetry: () => void;
  isDarkMode?: boolean;
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  onDiagramVersionSelect,
  onRetry,
  isDarkMode = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSystem = message.role === 'system';
  const isDocument = message.role === 'document';
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isError = message.role === 'system' && message.content.startsWith('Error:');

  // For error messages
  if (isError) {
    return (
      <div className="flex justify-start mb-3">
        <div className="max-w-xs rounded-md p-3 bg-red-100 dark:bg-red-800">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-300 text-sm">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>{message.content.substring(6)}</span>
          </div>
          {onRetry && (
            <div className="mt-2">
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-2 py-1 rounded-md transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.93 11H9m0 0l-1.5 1.5M9 11l-1.5-1.5M4.93 11a8 8 0 118 8" />
                </svg>
                <span>Retry</span>
              </button>
            </div>
          )}
          <div className="mt-1 text-xs text-red-500 dark:text-red-400">
            {formatTime(new Date(message.timestamp))}
          </div>
        </div>
      </div>
    );
  }

  // For document messages, show a preview of the content
  if (isDocument) {
    const preview = message.content.slice(0, 150) + (message.content.length > 150 ? '...' : '');
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[80%] rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
              <span className="text-sm font-medium">Document Content</span>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path fillRule="evenodd" 
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
                  clipRule="evenodd" 
                />
              </svg>
            </button>
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-400">
            {isExpanded ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              <div>
                {preview}
                {message.content.length > 150 && (
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 ml-1 text-sm font-medium"
                  >
                    Show more
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="mt-2 text-xs text-blue-400 dark:text-blue-500">
            {formatTime(new Date(message.timestamp))}
          </div>
        </div>
      </div>
    );
  }

  // Update the diagram version button click handler
  const handleDiagramVersionClick = () => {
    if (message.diagramVersion && onDiagramVersionSelect) {
      onDiagramVersionSelect(message.diagramVersion);
    }
  };

  // Return original message format for non-document messages
  return (
    <div className="flex items-start space-x-3">
      <div className={`flex-1 rounded-2xl p-4 shadow-sm ${
        message.role === 'user' 
          ? isDarkMode 
            ? "bg-gray-800/50" 
            : "bg-[#d8cbb8]/50"
          : isDarkMode 
            ? "bg-gray-800/80" 
            : "bg-[#d8cbb8]/80"
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              message.role === 'user' 
                ? isDarkMode 
                  ? "bg-gray-700" 
                  : "bg-[#c8bba8]"
                : "bg-primary"
            }`}>
              {message.role === 'user' ? (
                <UserIcon className="h-4 w-4 text-white" />
              ) : (
                <SparklesIcon className="h-4 w-4 text-white" />
              )}
            </div>
            <span className={`text-xs font-medium ${
              isDarkMode ? "text-gray-300" : "text-[#6a5c4c]"
            }`}>
              {message.role === 'user' ? 'You' : 'AI Assistant'}
            </span>
          </div>
          <span className={`text-xs ${
            isDarkMode ? "text-gray-500" : "text-[#8a7a66]"
          }`}>
            {formatTime(new Date(message.timestamp))}
          </span>
        </div>
        
        <div className={`prose prose-sm max-w-none ${
          isDarkMode ? "prose-invert" : "prose-stone"
        }`}>
          {message.content}
        </div>
        
        {message.diagramVersions && message.diagramVersions.length > 0 && (
          <div className="mt-4">
            <h4 className={`text-sm font-medium mb-2 ${
              isDarkMode ? "text-gray-300" : "text-[#6a5c4c]"
            }`}>
              Generated Diagrams:
            </h4>
            <div className="flex flex-wrap gap-2">
              {message.diagramVersions.map((version, idx) => (
                <button
                  key={idx}
                  onClick={() => onDiagramVersionSelect(version)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    isDarkMode 
                      ? "bg-gray-700 hover:bg-gray-600 text-white" 
                      : "bg-[#c8bba8] hover:bg-[#b8ab98] text-[#6a5c4c]"
                  }`}
                >
                  Version {idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {message.role === 'assistant' && message.error && (
          <div className="mt-4">
            <div className={`p-3 rounded-lg text-sm ${
              isDarkMode 
                ? "bg-red-900/30 text-red-300" 
                : "bg-red-100 text-red-700"
            }`}>
              <p className="font-medium">Error generating diagram</p>
              <p className="mt-1">{message.error}</p>
              <button
                onClick={onRetry}
                className={`mt-2 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  isDarkMode 
                    ? "bg-red-800 hover:bg-red-700 text-white" 
                    : "bg-red-200 hover:bg-red-300 text-red-800"
                }`}
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage; 