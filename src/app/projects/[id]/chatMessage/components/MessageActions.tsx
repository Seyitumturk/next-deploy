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
      {message.error && (
        <button
          onClick={onRetry}
          className={`px-2 py-1 rounded ${
            isDarkMode 
              ? 'bg-red-800 text-white hover:bg-red-700' 
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          Retry
        </button>
      )}
      
      {/* Apply diagram version button */}
      {message.diagramVersion && (
        <>
          <button
            onClick={onDiagramVersionSelect}
            className={`px-2 py-1 rounded ${
              isDarkMode 
                ? 'bg-blue-800 text-white hover:bg-blue-700' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            Apply this diagram
          </button>
          
          <button
            onClick={toggleDiagramPreview}
            className={`px-2 py-1 rounded ${
              isDarkMode 
                ? 'bg-gray-800 text-white hover:bg-gray-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showDiagramPreview ? 'Hide code' : 'Show code'}
          </button>
        </>
      )}
      
      {/* Removed reaction buttons */}
    </div>
  );
}; 