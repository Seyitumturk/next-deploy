'use client';

import React, { useState } from 'react';

export interface ChatMessageData {
  role: 'user' | 'assistant' | 'system' | 'document';
  content: string;
  timestamp: Date;
  diagramVersion?: string;
}

export interface ChatMessageProps {
  message: ChatMessageData;
  onDiagramVersionSelect?: (version: string) => void;
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onDiagramVersionSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSystem = message.role === 'system';
  const isDocument = message.role === 'document';
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isError = message.role === 'system' && message.content.startsWith('Error:');

  // For error messages
  if (isError) {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[80%] rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">{message.content.substring(6)}</span>
          </div>
          <div className="mt-2 text-xs text-red-400 dark:text-red-500">
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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-white dark:bg-white flex items-center justify-center hover:bg-secondary/10 transition-colors mr-3">
          <svg className="w-5 h-5 text-black dark:text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
        </div>
      )}
      <div className={`
        max-w-[80%] rounded-lg p-4 
        ${isSystem ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' :
          isUser ? 'bg-secondary/10 text-secondary dark:text-secondary-light' :
          'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}
      >
        {message.content.length > 150 && (
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500">
              {isUser ? 'Your prompt' : 'Assistant response'}
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
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
        )}
        <div className="text-sm">
          {message.content.length > 150 ? (
            isExpanded ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              <div>
                {message.content.slice(0, 150)}...
                <button
                  onClick={() => setIsExpanded(true)}
                  className="text-secondary hover:text-secondary-dark dark:text-secondary-light dark:hover:text-secondary ml-1 text-sm font-medium"
                >
                  Show more
                </button>
              </div>
            )
          ) : (
            message.content
          )}
        </div>
        {message.diagramVersion && onDiagramVersionSelect && (
          <div className="mt-2 space-y-2">
            <div className="text-xs text-gray-500">Changes applied to diagram:</div>
            <button 
              onClick={handleDiagramVersionClick}
              className="w-full px-3 py-2 bg-secondary/5 hover:bg-secondary/10 rounded-lg transition-colors text-xs text-secondary hover:text-secondary-dark flex items-center justify-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              <span>View this version</span>
            </button>
          </div>
        )}
        <div className="mt-1 text-xs text-gray-400">
          {formatTime(new Date(message.timestamp))}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage; 