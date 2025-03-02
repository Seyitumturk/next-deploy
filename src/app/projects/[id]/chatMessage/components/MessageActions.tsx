import React, { useState } from 'react';
import { ChatMessageData } from '../types';

// Removing reaction emojis
// const REACTIONS = ['👍', '❤️', '🎉', '💡', '🤔'];

interface MessageActionsProps {
  message: ChatMessageData;
  onDiagramVersionSelect: () => Promise<void>;
  onRetry: () => void;
  isDarkMode: boolean;
  // Removing onReaction
  // onReaction?: (messageIndex: number, reaction: string) => void;
  messageIndex: number;
  showDiagramPreview: boolean;
  setShowDiagramPreview: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  message,
  onDiagramVersionSelect,
  onRetry,
  isDarkMode,
  // onReaction,
  messageIndex,
  showDiagramPreview,
  setShowDiagramPreview
}) => {
  // Toggle diagram preview
  const toggleDiagramPreview = () => {
    setShowDiagramPreview(prev => !prev);
  };

  return (
    <div className="flex flex-wrap items-center mt-1 text-xs space-x-2">
      {/* Retry button for error messages */}
      {message.error && message.hasRetryButton && (
        <button
          onClick={onRetry}
          className={`px-2 py-1 rounded inline-flex items-center ${
            isDarkMode 
              ? 'bg-red-800 text-white hover:bg-red-700' 
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          Retry
        </button>
      )}
      
      {/* Apply diagram version button - small version for actions bar */}
      {message.diagramVersion && !message.error && (
        <button
          onClick={onDiagramVersionSelect}
          className={`px-2 py-1 rounded inline-flex items-center ${
            isDarkMode 
              ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-800/30' 
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          }`}
        >
          <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
          </svg>
          Apply diagram
        </button>
      )}
      
      {/* Removed reaction buttons */}
    </div>
  );
}; 