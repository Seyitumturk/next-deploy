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
      // Call the onDiagramVersionSelect handler that updates the diagram
      await onDiagramVersionSelect(message.diagramVersion);
      // No other actions - just let the diagram render without changing to code editor
    }
  };

  // Determine message styling based on role
  const getMessageStyles = () => {
    const baseStyles = "px-4 py-3 rounded-lg mb-2 mt-3 max-w-full break-words";
    
    if (message.role === 'user') {
      return `${baseStyles} ${
        isDarkMode 
          ? 'bg-[#282424] text-white border border-[#343030]' 
          : 'bg-[#c8bba8] text-[#4a3c2c] border border-[#b8a990]'
      }`;
    } else if (message.role === 'assistant') {
      return `${baseStyles} ${
        isDarkMode 
          ? 'bg-[#201c1c]/80 text-white border border-primary-dark/30' 
          : 'bg-[#d8cbb8] text-[#4a3c2c] border border-[#b8a990]'
      }`;
    } else if (message.role === 'document') {
      return `${baseStyles} ${
        isDarkMode 
          ? 'bg-[#282424]/80 text-white border border-secondary-dark/30' 
          : 'bg-[#c8bba8] text-[#4a3c2c] border border-[#b8a990]'
      }`;
    } else if (message.isSystemNotification) {
      return `${baseStyles} ${
        isDarkMode 
          ? 'bg-[#2a2620]/80 text-gray-300 border border-[#3a3630]/50' 
          : 'bg-[#f8ece0] text-[#6a5c4c] italic border border-[#e8dccc]'
      }`;  
    } else {
      return `${baseStyles} ${
        isDarkMode 
          ? 'bg-[#201c1c] text-gray-300 border border-[#282424]' 
          : 'bg-[#e8dccc] text-[#6a5c4c] italic border border-[#b8a990]'
      }`;
    }
  };

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-8 px-2 mt-6 chat-message-${message.role} relative group`}>
      {/* Message content */}
      <div className="flex flex-col max-w-[90%] sm:max-w-[80%]">
        <div className={`shadow-sm chat-message-hover ${getMessageStyles()}`}>
          {message.isTyping ? (
            <TypingIndicator isDarkMode={isDarkMode} isRetrying={message.isRetrying} />
          ) : (
            <MessageContent 
              message={message}
              isExpanded={isExpanded}
              isDarkMode={isDarkMode}
              showDiagramPreview={showDiagramPreview}
              setShowDiagramPreview={setShowDiagramPreview}
              onDiagramVersionSelect={handleDiagramVersionSelect}
              onRetry={onRetry}
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
        
        {/* Message metadata with timestamp - positioned at the bottom of the message */}
        {!message.isSystemNotification && (
          <div className={`flex items-center text-xs ${
            message.role === 'assistant' ? 'self-start' : 'self-end'
          } mt-1 px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
            isDarkMode ? 'text-gray-400 bg-[#201c1c]/50' : 'text-gray-500 bg-[#e8dccc]/50'
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
        )}
      </div>
    </div>
  );
}; 