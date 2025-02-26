'use client';

import React, { useState, useEffect } from 'react';
import { UserIcon, SparklesIcon } from '@heroicons/react/24/outline';

export interface ChatMessageData {
  role: 'user' | 'assistant' | 'system' | 'document';
  content: string;
  timestamp: Date;
  diagramVersion?: string;
  error?: string;
}

export interface ChatMessageProps {
  message: ChatMessageData;
  onDiagramVersionSelect: (version: string) => Promise<void>;
  onRetry: () => void;
  isDarkMode?: boolean;
  isFirstUserMessage?: boolean;
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
  isDarkMode = false,
  isFirstUserMessage = false
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
        <div className="max-w-xs rounded-md p-3 bg-red-100 dark:bg-red-800 border border-red-200 dark:border-red-700">
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
        <div className={`max-w-[80%] rounded-lg p-4 ${
          isDarkMode 
            ? "bg-blue-900/20 border border-blue-800/30" 
            : "bg-blue-50 border border-blue-200"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className={`flex items-center space-x-2 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
              <span className="text-sm font-medium">Document Content</span>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`transition-colors ${
                isDarkMode 
                  ? "text-blue-400 hover:text-blue-300" 
                  : "text-blue-500 hover:text-blue-600"
              }`}
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
          <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-96' : 'max-h-24'}`}>
            <p className={`text-sm whitespace-pre-wrap ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              {isExpanded ? message.content : preview}
            </p>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {formatTime(new Date(message.timestamp))}
          </div>
        </div>
      </div>
    );
  }

  // Update the diagram version button click handler
  const handleDiagramVersionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Diagram version click handler called with version:', message.diagramVersion);
    
    if (!message.diagramVersion) {
      console.error('No diagram version available for this message');
      return;
    }
    
    if (!onDiagramVersionSelect) {
      console.error('No onDiagramVersionSelect handler provided - this function is required for reverting diagrams');
      return;
    }
    
    try {
      // Call the handler with the diagram version
      console.log('Calling onDiagramVersionSelect with version:', message.diagramVersion);
      onDiagramVersionSelect(message.diagramVersion)
        .then(() => {
          console.log('Successfully reverted to diagram version');
        })
        .catch(error => {
          console.error('Error reverting to diagram version:', error);
        });
    } catch (error) {
      console.error('Error calling onDiagramVersionSelect:', error);
    }
  };

  // Return original message format for non-document messages
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {isUser ? (
        <div className={`max-w-[80%] rounded-2xl py-3 px-4 ${
          isDarkMode 
            ? "bg-gray-800/90 backdrop-blur-sm text-white border border-gray-700/60 shadow-md" 
            : "bg-[#e8dccc] text-[#4a3c2c] border border-[#b8a990] shadow-sm"
        }`}>
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          <div className="mt-1 text-xs opacity-70 text-right">
            {formatTime(new Date(message.timestamp))}
          </div>
          
          {/* Add button to revert to this version if it has a diagram version */}
          {message.diagramVersion && (
            <div className="mt-2 pt-2 border-t border-gray-600/30 dark:border-gray-500/30 flex justify-end">
              <button
                onClick={handleDiagramVersionClick}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  isDarkMode
                    ? "bg-gray-700/50 hover:bg-gray-700/70 text-gray-200"
                    : "bg-[#d8cbb8]/70 hover:bg-[#d8cbb8] text-[#4a3c2c]"
                }`}
              >
                Revert to this version
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={`max-w-[80%] rounded-2xl py-3 px-4 ${
          isDarkMode 
            ? "bg-gray-800/80 backdrop-blur-sm text-white border border-gray-700/60 shadow-md" 
            : "bg-[#d8cbb8] text-[#4a3c2c] border border-[#b8a990] shadow-sm"
        }`}>
          <p className="text-sm whitespace-pre-wrap break-words font-medium">{message.content}</p>
          <div className="mt-1 text-xs opacity-70">
            {formatTime(new Date(message.timestamp))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage; 