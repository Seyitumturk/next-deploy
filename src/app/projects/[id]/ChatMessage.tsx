'use client';

import React, { useState, useEffect, memo } from 'react';
import { EyeIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

export interface ChatMessageData {
  role: 'user' | 'assistant' | 'system' | 'document';
  content: string;
  timestamp: Date;
  diagramVersion?: string;
  error?: string;
  isTyping?: boolean;
  reactions?: string[];
  documentSource?: string;
}

export interface ChatMessageProps {
  message: ChatMessageData;
  onDiagramVersionSelect: (version: string) => Promise<void>;
  onRetry: () => void;
  isDarkMode?: boolean;
  isFirstUserMessage?: boolean;
  onReaction?: (messageIndex: number, reaction: string) => void;
  messageIndex?: number;
  onCollapseMessage?: () => void;
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

// Typing indicator component
const TypingIndicator = ({ isDarkMode }: { isDarkMode: boolean }) => (
  <div className={`flex space-x-1 items-center h-5 ${isDarkMode ? 'opacity-70' : 'opacity-60'}`}>
    <div className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-blue-400' : 'bg-primary'} animate-bounce`} style={{ animationDelay: '0ms' }}></div>
    <div className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-blue-400' : 'bg-primary'} animate-bounce`} style={{ animationDelay: '150ms' }}></div>
    <div className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-blue-400' : 'bg-primary'} animate-bounce`} style={{ animationDelay: '300ms' }}></div>
  </div>
);

// Common reaction emojis
const REACTIONS = ['👍', '❤️', '🎉', '💡', '🤔'];

// Character limit for preview
const PREVIEW_CHAR_LIMIT = 300;

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  onDiagramVersionSelect,
  onRetry,
  isDarkMode = false,
  isFirstUserMessage = false,
  onReaction,
  messageIndex = -1,
  onCollapseMessage
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showVersionNotification, setShowVersionNotification] = useState(false);
  const isSystem = message.role === 'system';
  const isDocument = message.role === 'document';
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isError = message.role === 'system' && message.content.startsWith('Error:');
  
  // Check if message is long enough to be collapsible
  const isLongMessage = message.content.length > PREVIEW_CHAR_LIMIT;
  const preview = isLongMessage ? message.content.slice(0, PREVIEW_CHAR_LIMIT) + '...' : message.content;

  // For error messages
  if (isError) {
    return (
      <div className="flex justify-start mb-3 animate-fadeIn">
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.93 11H9m0 0l-1.5 1.5M9 11l-1.5-1.5M4.93 11a8 8 0 118 8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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

  // For system messages, show a simple notification style message
  if (isSystem && !isError) {
    const isProcessingMessage = message.content.includes('Processing') || 
                               message.content.includes('processing') || 
                               message.content.includes('Analyzing');
    
    return (
      <div className="flex justify-center mb-3 animate-fadeIn">
        <div className={`rounded-full py-1.5 px-4 text-xs font-medium ${
          isDarkMode 
            ? isProcessingMessage 
              ? "bg-blue-900/30 text-blue-300 border border-blue-800/30" 
              : "bg-gray-800 text-gray-300 border border-gray-700"
            : isProcessingMessage 
              ? "bg-blue-100 text-blue-700 border border-blue-200" 
              : "bg-gray-100 text-gray-700 border border-gray-200"
        }`}>
          {isProcessingMessage ? (
            <div className="flex items-center space-x-2">
              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{message.content}</span>
            </div>
          ) : (
            message.content
          )}
        </div>
      </div>
    );
  }

  // For document messages, show a preview of the content with modern expandable UI
  if (isDocument) {
    const isProcessingDocument = message.content.includes('Processing') || 
                                message.content.includes('processing') || 
                                message.content.includes('Analyzing');
    
    // For document messages, don't show all the extracted text
    const documentPreview = "Document processed. Use the input box below to ask questions about this document.";
    
    return (
      <div className="flex justify-start mb-4 animate-fadeIn">
        <div className={`max-w-[85%] rounded-lg p-4 transition-all duration-300 ${
          isDarkMode 
            ? "bg-blue-900/20 border border-blue-800/30" 
            : "bg-blue-50 border border-blue-200"
        } ${isExpanded ? 'shadow-md' : 'shadow-sm'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className={`flex items-center space-x-2 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
              {isProcessingDocument ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                </svg>
              )}
              <span className="text-sm font-medium">
                {isProcessingDocument 
                  ? 'Processing Document...' 
                  : (message.documentSource ? `Document: ${message.documentSource}` : 'Document Content')}
              </span>
            </div>
            
            {/* Add collapse button for document messages */}
            {onCollapseMessage && !isProcessingDocument && (
              <button
                onClick={onCollapseMessage}
                className={`ml-2 p-1 rounded-full transition-colors ${
                  isDarkMode 
                    ? "text-blue-400 hover:text-blue-300 hover:bg-blue-900/30" 
                    : "text-blue-500 hover:text-blue-600 hover:bg-blue-100"
                }`}
                title="Collapse"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {isProcessingDocument ? (
            <div className="flex items-center justify-center py-4">
              <div className="flex flex-col items-center">
                <svg className="animate-spin h-8 w-8 mb-2 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                  {message.content}
                </p>
              </div>
            </div>
          ) : (
            <div className={`overflow-hidden transition-all duration-300`}>
              <p className={`text-sm whitespace-pre-wrap ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                {documentPreview}
              </p>
            </div>
          )}
          
          {!isProcessingDocument && (
            <div className="mt-2 flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {formatTime(new Date(message.timestamp))}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Update the diagram version button click handler
  const handleDiagramVersionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
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
      onDiagramVersionSelect(message.diagramVersion)
        .then(() => {
          // Show the notification
          setShowVersionNotification(true);
          
          // Hide it after animation completes (3s)
          setTimeout(() => {
            setShowVersionNotification(false);
          }, 3000);
        })
        .catch(error => {
          console.error('Error reverting to diagram version:', error);
        });
    } catch (error) {
      console.error('Error calling onDiagramVersionSelect:', error);
    }
  };

  // Handle reaction click
  const handleReactionClick = (reaction: string) => {
    if (onReaction && messageIndex >= 0) {
      onReaction(messageIndex, reaction);
      setShowReactions(false);
    }
  };

  // Return original message format for non-document messages
  return (
    <div 
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 ${isUser ? 'animate-slideInRight' : 'animate-slideInLeft'}`}
      onMouseEnter={() => isAssistant && setShowReactions(true)}
      onMouseLeave={() => setShowReactions(false)}
    >
      <div className={`max-w-[85%] rounded-2xl py-3 px-4 relative ${
        isUser 
          ? (isDarkMode 
              ? "bg-gray-800/90 backdrop-blur-sm text-white border border-gray-700/60 shadow-md" 
              : "bg-[#e8dccc] text-[#4a3c2c] border border-[#b8a990] shadow-sm")
          : (isDarkMode 
              ? "bg-gray-800/80 backdrop-blur-sm text-white border border-gray-700/60 shadow-md" 
              : "bg-[#d8cbb8] text-[#4a3c2c] border border-[#b8a990] shadow-sm")
      } hover:shadow-lg transition-shadow duration-200`}>
        {message.isTyping ? (
          <TypingIndicator isDarkMode={isDarkMode} />
        ) : (
          <>
            <div className="flex justify-between items-start">
              {/* For user messages, implement collapsible content */}
              {isUser && isLongMessage ? (
                <div className="flex-1">
                  <p className={`text-sm whitespace-pre-wrap break-words ${isUser ? '' : 'font-medium'}`}>
                    {isExpanded ? message.content : preview}
                  </p>
                  {isLongMessage && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className={`flex items-center space-x-1 text-xs mt-2 px-2 py-1 rounded-full transition-colors ${
                        isDarkMode 
                          ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700/50" 
                          : "text-[#8a7a66] hover:text-[#6a5c4c] hover:bg-[#d8cbb8]/50"
                      }`}
                    >
                      <span>{isExpanded ? 'Show Less' : 'Show More'}</span>
                      {isExpanded ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <p className={`text-sm whitespace-pre-wrap break-words ${isUser ? '' : 'font-medium'} flex-1`}>
                  {message.content}
                </p>
              )}
              
              {/* Add collapse button for user messages */}
              {isUser && onCollapseMessage && (
                <button
                  onClick={onCollapseMessage}
                  className={`ml-2 p-1 rounded-full transition-colors ${
                    isDarkMode 
                      ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700/50" 
                      : "text-[#8a7a66] hover:text-[#6a5c4c] hover:bg-[#d8cbb8]/50"
                  }`}
                  title="Collapse"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            <div className="mt-1 text-xs opacity-70 flex justify-between items-center">
              <span>{formatTime(new Date(message.timestamp))}</span>
              
              {/* Display reactions if any */}
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex space-x-1">
                  {message.reactions.map((reaction, idx) => (
                    <span key={idx} className="text-sm animate-pulse-subtle">{reaction}</span>
                  ))}
                </div>
              )}
            </div>
            
            {/* Reaction buttons for assistant messages */}
            {isAssistant && showReactions && onReaction && messageIndex >= 0 && (
              <div className="absolute -bottom-8 left-0 bg-white dark:bg-gray-800 rounded-full shadow-md p-1 flex space-x-1 border border-gray-200 dark:border-gray-700 transition-opacity duration-200 animate-fadeIn z-10">
                {REACTIONS.map((reaction) => (
                  <button
                    key={reaction}
                    onClick={() => handleReactionClick(reaction)}
                    className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    {reaction}
                  </button>
                ))}
              </div>
            )}
            
            {/* Add button to view/revert to this version if it has a diagram version - only for user messages */}
            {isUser && message.diagramVersion && (
              <div className="mt-2 pt-2 border-t border-gray-600/30 dark:border-gray-500/30 flex justify-end">
                <button
                  onClick={handleDiagramVersionClick}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center space-x-1 ${
                    isDarkMode
                      ? "bg-gray-700/50 hover:bg-gray-700/70 text-gray-200"
                      : "bg-[#d8cbb8]/70 hover:bg-[#d8cbb8] text-[#4a3c2c]"
                  } hover:scale-105 transition-transform duration-200`}
                  title="View this version"
                >
                  <EyeIcon className="h-3.5 w-3.5 mr-1" />
                  <span>View this version</span>
                </button>
              </div>
            )}
            
            {/* Gentle notification when version is viewed */}
            {showVersionNotification && (
              <div className="absolute -bottom-6 left-0 right-0 flex justify-center">
                <div className={`px-2 py-1 rounded-full text-xs animate-fadeInOut ${
                  isDarkMode 
                    ? "bg-gray-700/70 text-gray-300" 
                    : "bg-[#d8cbb8]/70 text-[#4a3c2c]"
                }`}>
                  Viewing this version
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Use React.memo to prevent unnecessary re-renders
export default memo(ChatMessage, (prevProps, nextProps) => {
  // Only re-render if these props change
  return (
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.isTyping === nextProps.message.isTyping &&
    prevProps.isDarkMode === nextProps.isDarkMode &&
    JSON.stringify(prevProps.message.reactions) === JSON.stringify(nextProps.message.reactions)
  );
}); 