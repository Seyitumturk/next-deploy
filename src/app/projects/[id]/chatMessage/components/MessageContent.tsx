import React, { useState } from 'react';
import { ChatMessageData } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow, prism } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { mermaidToPlantUml } from './utils';

interface MessageContentProps {
  message: ChatMessageData;
  isExpanded: boolean;
  isDarkMode: boolean;
  showDiagramPreview: boolean;
  setShowDiagramPreview: React.Dispatch<React.SetStateAction<boolean>>;
}

// Character limit for preview
const PREVIEW_CHAR_LIMIT = 300;

export const MessageContent: React.FC<MessageContentProps> = ({
  message,
  isExpanded,
  isDarkMode,
  showDiagramPreview,
  setShowDiagramPreview
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

  // Render error message if present
  if (message.error) {
    return (
      <div className="text-red-500">
        <p className="font-medium mb-1">Error:</p>
        <p>{message.error}</p>
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

  // Render diagram preview if available and requested
  if ((message.diagramVersion || message.diagram_img) && showDiagramPreview) {
    return (
      <div>
        <div className="mb-2">{message.content}</div>
        <div className="mt-3 border rounded p-2 bg-gray-50">
          <div className="text-xs text-gray-500 mb-1">Diagram Preview:</div>
          {message.diagramVersion && (
            <pre className="text-xs overflow-x-auto p-2 bg-gray-100 rounded">
              {message.diagramVersion.length > 500 
                ? `${message.diagramVersion.substring(0, 500)}...` 
                : message.diagramVersion}
            </pre>
          )}
          {message.diagram_img && (
            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1">SVG Image:</div>
              <div className="svg-preview" dangerouslySetInnerHTML={{ __html: message.diagram_img }} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render markdown content
  return (
    <div className="w-full">
      {/* Show diagram version indicator */}
      {(hasDiagramVersion || hasDiagramImg) && message.role === 'assistant' && (
        <div className={`mb-3 text-xs inline-flex items-center px-2 py-1 rounded-full ${
          isDarkMode ? 'bg-primary-dark/20 text-primary-dark' : 'bg-primary/10 text-primary'
        }`}>
          <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          <span>Diagram Updated</span>
        </div>
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
                    isDarkMode ? 'bg-gray-800' : 'bg-gray-100' 
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

      {message.error && (
        <div className={`mt-2 p-2 text-sm rounded border ${
          isDarkMode ? 'bg-red-900/30 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          <span className="font-medium">Error:</span> {message.error}
        </div>
      )}
    </div>
  );
}; 