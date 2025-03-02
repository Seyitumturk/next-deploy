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
      {/* Retry button removed to avoid duplication with the button in MessageContent */}
      
      {/* Apply diagram version button removed - now only using the one in MessageContent.tsx */}
      
      {/* Removed reaction buttons */}
    </div>
  );
}; 