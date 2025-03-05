import React, { useState } from 'react';
import { ChatMessageData } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow, prism } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { mermaidToPlantUml } from './utils';

// Get access to streaming state from useDiagramEditor
declare global {
  interface Window {
    GLOBAL_STREAMING_ACTIVE?: boolean;
  }
}

interface MessageContentProps {
  message: ChatMessageData;
  isExpanded: boolean;
  isDarkMode: boolean;
  showDiagramPreview: boolean;
  setShowDiagramPreview: React.Dispatch<React.SetStateAction<boolean>>;
  onDiagramVersionSelect?: () => Promise<void>;
  onRetry?: () => void;
}

// Character limit for preview
const PREVIEW_CHAR_LIMIT = 300;

export const MessageContent: React.FC<MessageContentProps> = ({
  message,
  isExpanded,
  isDarkMode,
  showDiagramPreview,
  setShowDiagramPreview,
  onDiagramVersionSelect,
  onRetry
}) => {
  const [isCodeExpanded, setIsCodeExpanded] = useState<Record<number, boolean>>({});
  
  // Handle code block expansion
  const toggleCodeExpansion = (index: number) => {
    setIsCodeExpanded(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Format content for display
  const getDisplayContent = () => {
    if (!isExpanded) {
      // Show truncated content when collapsed
      return message.content.length > PREVIEW_CHAR_LIMIT
        ? `${message.content.substring(0, PREVIEW_CHAR_LIMIT)}...`
        : message.content;
    }
    return message.content;
  };

  // Determine if message has diagram version
  const hasDiagramVersion = Boolean(message.diagramVersion);
  // Determine if message has SVG image
  const hasDiagramImg = Boolean(message.diagram_img);

  // Check if message contains markdown code blocks
  const hasCodeBlock = message.content.includes('```');

  // Render system notifications with styled appearance
  if (message.isSystemNotification) {
    return (
      <div className={`py-2 text-center italic ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {message.content}
      </div>
    );
  }

  // Hard block ANY error display during streaming
  const isStreamingActive = typeof window !== 'undefined' && window.GLOBAL_STREAMING_ACTIVE === true;
  
  // Render error message with retry button if needed - with streaming protection
  if (message.error && !message.isTemporaryError && !isStreamingActive) {
    return (
      <div>
        <div className={`p-3 rounded-md ${
          isDarkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-600'
        }`}>
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span className="font-medium">Unable to create diagram</span>
          </div>
          <p className="ml-7 text-sm mb-2">{message.content}</p>
          
          <div className="ml-7 text-sm">
            {!message.hasRetryButton ? (
              <p>We'll automatically retry once to create a simpler diagram...</p>
            ) : (
              <div>
                <p className="mb-2">Try writing a clearer prompt or selecting a different diagram type.</p>
                {onRetry && (
                  <button 
                    onClick={onRetry}
                    className={`flex items-center px-4 py-2 mt-2 text-sm font-medium rounded-md 
                      ${isDarkMode 
                        ? 'bg-primary-dark hover:bg-primary-dark/90 text-white' 
                        : 'bg-primary hover:bg-primary/90 text-white shadow-sm shadow-primary/20'}`}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Try Again
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render document source if present
  if (message.role === 'document' && message.documentSource) {
    return (
      <div>
        <p className="font-medium mb-1">Document: {message.documentSource}</p>
        <div className="mt-2">{message.content}</div>
      </div>
    );
  }

  // Special handling for typing indicator with retry status
  if (message.isTyping && message.isRetrying) {
    return (
      <div className="py-3">
        <div className="flex items-center mb-2">
          <div className="relative mr-2">
            <div className="w-6 h-6 flex items-center justify-center">
              <div className="absolute w-5 h-5 border-2 rounded-full border-blue-500 border-t-transparent animate-spin"></div>
              <div className="absolute w-3 h-3 border-2 rounded-full border-blue-300 border-t-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
            </div>
          </div>
          <span className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
            Generating diagram
          </span>
        </div>
      </div>
    );
  }

  // Normal typing indicator
  if (message.isTyping) {
    return (
      <div className="py-3">
        <div className="flex items-center mb-2">
          <div className="relative mr-2">
            <div className="w-6 h-6 border-2 rounded-full border-b-transparent border-primary animate-spin"></div>
          </div>
          <span className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
            Generating diagram
          </span>
        </div>
      </div>
    );
  }

  // Render markdown content
  return (
    <div className="w-full">
      {/* Show diagram version indicator as a clickable button */}
      {(hasDiagramVersion || hasDiagramImg) && message.role === 'assistant' && (
        <button 
          onClick={onDiagramVersionSelect}
          className={`mb-3 text-xs inline-flex items-center px-2 py-1 rounded-full cursor-pointer ${
            isDarkMode ? 'bg-primary-dark/20 text-primary-dark hover:bg-primary-dark/30' : 'bg-primary/10 text-primary hover:bg-primary/20'
          }`}
        >
          <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          <span>Apply this diagram</span>
        </button>
      )}

      {/* Content */}
      <div className={`whitespace-pre-wrap ${
        !isExpanded && message.content.length > 280 ? 'line-clamp-4' : ''
      }`}>
        {hasCodeBlock ? (
          <>
            {message.content.split('```').map((part, i) => {
              if (i % 2 === 0) {
                return <p key={i} className="mb-2">{part}</p>;
              } else {
                const [language, ...code] = part.split('\n');
                return (
                  <pre key={i} className={`p-3 rounded my-2 overflow-x-auto ${
                    isDarkMode ? 'bg-gray-800' : 'bg-[#e8dccc]' 
                  }`}>
                    <code className={`language-${language || 'text'}`}>
                      {code.join('\n')}
                    </code>
                  </pre>
                );
              }
            })}
          </>
        ) : (
          <p>{message.content}</p>
        )}
      </div>
    </div>
  );
}; 