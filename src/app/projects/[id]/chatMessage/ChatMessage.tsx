'use client';

import React, { useState } from 'react';
import { TypingIndicator } from './components/TypingIndicator';
import { MessageContent } from './components/MessageContent';
import { MessageActions } from './components/MessageActions';
import { formatTime } from './utils/formatUtils';
import { ChatMessageData, ChatMessageProps } from './types';

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onDiagramVersionSelect,
  onRetry,
  isDarkMode = false,
  isFirstUserMessage = false,
  onReaction,
  messageIndex = 0,
  onCollapseMessage
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDiagramPreview, setShowDiagramPreview] = useState(false);
  
  // Toggle message expansion
  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
    if (onCollapseMessage && isExpanded) {
      onCollapseMessage();
    }
  };

  // Handle diagram version selection
  const handleDiagramVersionSelect = async () => {
    if (message.diagramVersion) {
      await onDiagramVersionSelect(message.diagramVersion);
    }
  };

  // Determine message styling based on role
  const getMessageStyles = () => {
    const baseStyles = "px-4 py-3 rounded-lg mb-2 max-w-full break-words";
    
    if (message.role === 'user') {
      return `${baseStyles} ${
        isDarkMode 
          ? 'bg-gray-800 text-white border border-gray-700' 
          : 'bg-gray-100 text-gray-800 border border-gray-200'
      }`;
    } else if (message.role === 'assistant') {
      return `${baseStyles} ${
        isDarkMode 
          ? 'bg-gray-900/80 text-white border border-primary-dark/30' 
          : 'bg-white border border-primary/30 text-gray-800'
      }`;
    } else if (message.role === 'document') {
      return `${baseStyles} ${
        isDarkMode 
          ? 'bg-gray-800/80 text-white border border-secondary-dark/30' 
          : 'bg-white border border-secondary/30 text-gray-800'
      }`;
    } else {
      return `${baseStyles} ${
        isDarkMode 
          ? 'bg-gray-900 text-gray-300 border border-gray-800' 
          : 'bg-gray-50 text-gray-500 italic border border-gray-200'
      }`;
    }
  };

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-3 px-2 chat-message-${message.role}`}>
      <div className="flex flex-col max-w-[90%] sm:max-w-[80%]">
        {/* Message header with timestamp and expand/collapse controls */}
        <div className={`flex items-center mb-1 text-xs ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <span className="font-medium">{message.role.charAt(0).toUpperCase() + message.role.slice(1)}</span>
          <span className="mx-1">•</span>
          <span>{formatTime(new Date(message.timestamp))}</span>
          
          {message.role === 'assistant' && !message.isTyping && (
            <button 
              onClick={toggleExpansion}
              className={`ml-2 hover:text-gray-600 focus:outline-none ${
                isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
              }`}
              aria-label={isExpanded ? "Collapse message" : "Expand message"}
            >
              {isExpanded ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          )}
        </div>
        
        {/* Message content */}
        <div className={`shadow-sm chat-message-hover ${getMessageStyles()}`}>
          {message.isTyping ? (
            <TypingIndicator isDarkMode={isDarkMode} />
          ) : (
            <MessageContent 
              message={message}
              isExpanded={isExpanded}
              isDarkMode={isDarkMode}
              showDiagramPreview={showDiagramPreview}
              setShowDiagramPreview={setShowDiagramPreview}
            />
          )}
        </div>
        
        {/* Message actions (only for non-typing assistant messages) */}
        {message.role === 'assistant' && !message.isTyping && (
          <MessageActions 
            message={message}
            onDiagramVersionSelect={handleDiagramVersionSelect}
            onRetry={onRetry}
            isDarkMode={isDarkMode}
            messageIndex={messageIndex}
            showDiagramPreview={showDiagramPreview}
            setShowDiagramPreview={setShowDiagramPreview}
          />
        )}
      </div>
    </div>
  );
}; 