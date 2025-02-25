'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import ChatMessage, { ChatMessageData } from './ChatMessage';
import FileUploadOptions from './FileUploadOptions';
import { ChatBubbleLeftEllipsisIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

export interface PromptPanelProps {
  handleCodeChange?: (code: string) => void;
  editorMode: 'chat' | 'code';
  setEditorMode: React.Dispatch<React.SetStateAction<'chat' | 'code'>>;
  chatHistory: ChatMessageData[];
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  isGenerating: boolean;
  error: string;
  handleGenerateDiagram: (e: React.FormEvent<HTMLFormElement> | null, initialPrompt?: string) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  processWebsite: (url: string) => void;
  isProcessingFile: boolean;
  documentSummary: string;
  showFileUpload: boolean;
  setShowFileUpload: React.Dispatch<React.SetStateAction<boolean>>;
  currentDiagram: string;
  setCurrentDiagram: React.Dispatch<React.SetStateAction<string>>;
  onRenderDiagram: (diagramText: string) => Promise<boolean>;
  setIsEditorReady: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPromptPanel: React.Dispatch<React.SetStateAction<boolean>>;
  isVisible: boolean;
  isDarkMode: boolean;
  onDiagramVersionSelect: (version: string) => Promise<void>;
}

const monacoOptions = {
  fontSize: 14,
  fontFamily: 'var(--font-geist-mono)',
  minimap: { enabled: false },
  lineNumbers: 'on' as const,
  roundedSelection: true,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  padding: { top: 16, bottom: 16 },
  tabSize: 2,
  wordWrap: 'on' as const,
  theme: 'vs-dark',
  scrollbar: {
    vertical: 'visible' as const,
    horizontal: 'visible' as const,
    useShadows: false,
    verticalScrollbarSize: 8,
    horizontalScrollbarSize: 8
  }
};

const PromptPanel: React.FC<PromptPanelProps> = ({
  handleCodeChange,
  editorMode,
  setEditorMode,
  chatHistory,
  chatContainerRef,
  prompt,
  setPrompt,
  isGenerating,
  error,
  handleGenerateDiagram,
  handleFileUpload,
  processWebsite,
  isProcessingFile,
  documentSummary,
  showFileUpload,
  setShowFileUpload,
  currentDiagram,
  setCurrentDiagram,
  onRenderDiagram,
  setIsEditorReady,
  setShowPromptPanel,
  isVisible,
  isDarkMode,
  onDiagramVersionSelect,
}) => {
  // Define conditional textarea classes without scrollbar classes
  const promptTextAreaClass = `w-full rounded-xl border px-4 pb-4 pt-3 pr-14 text-sm focus:ring-2 focus:ring-primary/50 focus:border-transparent resize-none min-h-[72px] max-h-[200px] transition-all duration-200 ease-in-out focus:placeholder:text-transparent overflow-y-auto break-words overflow-x-hidden no-scrollbar ${
    isDarkMode 
      ? "border-gray-700 bg-gray-800/70 text-white placeholder:text-gray-500" 
      : "border-[#d8cbb8] bg-[#e8dccc]/70 text-[#6a5c4c] placeholder:text-[#8a7a66]"
  }`;

  return (
    <>
      {/* Desktop Prompt Panel */}
      <div
        className={`hidden md:flex w-96 flex-col backdrop-blur-md border-r transform transition-transform duration-300 ease-in-out ${
          isDarkMode 
            ? "bg-gray-900/90 border-gray-700" 
            : "bg-[#e8dccc]/90 border-[#d8cbb8]"
        }`}
        style={{
          position: 'absolute',
          height: 'calc(100% - 4.25rem)', // subtract header height + gradient line
          zIndex: 10,
          transform: isVisible ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Chat Header */}
        <div className={`h-12 p-4 border-b flex items-center ${
          isDarkMode ? "border-gray-800" : "border-[#d8cbb8]"
        }`}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isDarkMode 
                  ? "bg-gray-800 text-white hover:bg-gray-700" 
                  : "bg-[#d8cbb8] text-[#6a5c4c] hover:bg-[#c8bba8]"
              }`}>
                {editorMode === 'chat' ? (
                  <ChatBubbleLeftEllipsisIcon className="h-5 w-5" />
                ) : (
                  <CodeBracketIcon className="h-5 w-5" />
                )}
              </div>
              <div>
                <h2 className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-[#6a5c4c]"}`}>
                  {editorMode === 'chat' ? 'AI Assistant' : 'Code Editor'}
                </h2>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setEditorMode(editorMode === 'chat' ? 'code' : 'chat')}
                className={`px-3 py-1.5 rounded-lg transition-colors text-xs font-medium flex items-center space-x-2 ${
                  isDarkMode 
                    ? "bg-gray-800 hover:bg-gray-700 text-gray-300" 
                    : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c]"
                }`}
                title={editorMode === 'chat' ? 'Switch to Code Editor' : 'Switch to Chat'}
              >
                {editorMode === 'chat' ? (
                  <>
                    <CodeBracketIcon className="h-4 w-4" />
                    <span>Code Editor</span>
                  </>
                ) : (
                  <>
                    <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
                    <span>Chat</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowPromptPanel(!isVisible)}
                className={`p-2 rounded-full transition-colors focus:outline-none ${
                  isDarkMode ? "hover:bg-gray-800" : "hover:bg-[#d8cbb8]"
                }`}
                title={isVisible ? "Collapse Panel" : "Expand Panel"}
              >
                {/* Desktop horizontal toggle icon */}
                <span className="hidden md:inline">
                  {isVisible ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={2} fill="none" />
                      <path d="M14 8l-4 4 4 4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={2} fill="none" />
                      <path d="M10 8l4 4-4 4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>

                {/* Mobile vertical toggle icon */}
                <span className="md:hidden">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={2} fill="none" />
                    <path d="M16 10l-4 4-4-4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Conditional Rendering Based on Editor Mode */}
        {editorMode === 'chat' ? (
          <>
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {/* Welcome Message */}
              <div className="flex items-start space-x-3">
                <div
                  className={`flex-1 rounded-2xl p-4 shadow-sm ${
                    isDarkMode ? "bg-gray-800/50" : "bg-[#d8cbb8]/50"
                  }`}
                >
                  <p
                    className={isDarkMode ? "text-gray-300" : "text-[#6a5c4c]"}
                  >
                    Hello! I'm your AI assistant. Describe what you'd like to create or modify in your diagram, and I'll help you bring it to life.
                  </p>
                </div>
              </div>
              {/* Chat History */}
              <div
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
                {chatHistory.map((message, index) => (
                  <ChatMessage 
                    key={index} 
                    message={message} 
                    onDiagramVersionSelect={onDiagramVersionSelect}
                    onRetry={() => {
                      handleGenerateDiagram(null);
                    }}
                    isDarkMode={isDarkMode}
                  />
                ))}
              </div>
            </div>
            {/* Chat Input Area */}
            <div className={`p-4 border-t ${isDarkMode ? "border-gray-800" : "border-[#d8cbb8]"}`}>
              <FileUploadOptions
                showFileUpload={showFileUpload}
                setShowFileUpload={setShowFileUpload}
                isProcessingFile={isProcessingFile}
                handleFileUpload={handleFileUpload}
                processWebsite={processWebsite}
                isDarkMode={isDarkMode}
              />
              <form onSubmit={(e) => handleGenerateDiagram(e)} className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (prompt.trim() && !isGenerating) {
                        handleGenerateDiagram(null);
                      }
                    }
                  }}
                  className={promptTextAreaClass}
                  placeholder="Describe your diagram modifications... (Press Enter to send, Shift+Enter for new line)"
                  disabled={isGenerating}
                  style={{ height: '72px' }}
                />
                <button
                  type="submit"
                  disabled={!prompt.trim() || isGenerating}
                  className="absolute right-2 bottom-2 p-2 text-primary hover:text-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="mermaid"
                value={currentDiagram}
                onChange={(value) => {
                  if (value !== undefined) {
                    setCurrentDiagram(value);
                    handleCodeChange?.(value);
                  }
                }}
                onMount={() => setIsEditorReady(true)}
                options={{
                  ...monacoOptions,
                  theme: isDarkMode ? 'vs-dark' : 'vs',
                }}
              />
            </div>
            <div className={`p-4 border-t ${isDarkMode ? "border-gray-800" : "border-[#d8cbb8]"}`}>
              <button
                onClick={() => onRenderDiagram(currentDiagram)}
                className={`w-full py-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? "bg-primary hover:bg-primary-dark text-white" 
                    : "bg-primary hover:bg-primary-dark text-white"
                }`}
              >
                Render Diagram
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Prompt Panel */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isDarkMode 
            ? "bg-gray-900 border-t border-gray-800" 
            : "bg-[#e8dccc] border-t border-[#d8cbb8]"
        }`}
        style={{
          height: isVisible ? '50vh' : '0',
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
          zIndex: 20,
        }}
      >
        {/* Mobile header with toggle */}
        <div className={`h-12 p-4 border-b flex items-center justify-between ${
          isDarkMode ? "border-gray-800" : "border-[#d8cbb8]"
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              isDarkMode 
                ? "bg-gray-800 text-white" 
                : "bg-[#d8cbb8] text-[#6a5c4c]"
            }`}>
              {editorMode === 'chat' ? (
                <ChatBubbleLeftEllipsisIcon className="h-5 w-5" />
              ) : (
                <CodeBracketIcon className="h-5 w-5" />
              )}
            </div>
            <h2 className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-[#6a5c4c]"}`}>
              {editorMode === 'chat' ? 'AI Assistant' : 'Code Editor'}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setEditorMode(editorMode === 'chat' ? 'code' : 'chat')}
              className={`px-3 py-1.5 rounded-lg transition-colors text-xs font-medium flex items-center space-x-2 ${
                isDarkMode 
                  ? "bg-gray-800 hover:bg-gray-700 text-gray-300" 
                  : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c]"
              }`}
            >
              {editorMode === 'chat' ? (
                <>
                  <CodeBracketIcon className="h-4 w-4" />
                  <span>Code</span>
                </>
              ) : (
                <>
                  <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
                  <span>Chat</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowPromptPanel(!isVisible)}
              className={`p-2 rounded-full transition-colors ${
                isDarkMode ? "hover:bg-gray-800" : "hover:bg-[#d8cbb8]"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile content */}
        <div className="flex-1 overflow-y-auto">
          {editorMode === 'chat' ? (
            <div className="p-4 space-y-4">
              {/* Welcome Message */}
              {chatHistory.length === 0 && (
                <div className="flex items-start space-x-3">
                  <div
                    className={`flex-1 rounded-2xl p-4 shadow-sm ${
                      isDarkMode ? "bg-gray-800/50" : "bg-[#d8cbb8]/50"
                    }`}
                  >
                    <p
                      className={isDarkMode ? "text-gray-300" : "text-[#6a5c4c]"}
                    >
                      Hello! I'm your AI assistant. Describe what you'd like to create or modify in your diagram, and I'll help you bring it to life.
                    </p>
                  </div>
                </div>
              )}
              {/* Chat History */}
              {chatHistory.map((message, index) => (
                <ChatMessage 
                  key={index} 
                  message={message} 
                  onDiagramVersionSelect={onDiagramVersionSelect}
                  onRetry={() => {
                    handleGenerateDiagram(null);
                  }}
                  isDarkMode={isDarkMode}
                />
              ))}
            </div>
          ) : (
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="mermaid"
                value={currentDiagram}
                onChange={(value) => {
                  if (value !== undefined) {
                    setCurrentDiagram(value);
                    handleCodeChange?.(value);
                  }
                }}
                onMount={() => setIsEditorReady(true)}
                options={{
                  ...monacoOptions,
                  theme: isDarkMode ? 'vs-dark' : 'vs',
                }}
              />
            </div>
          )}
        </div>

        {/* Mobile input area */}
        {editorMode === 'chat' && (
          <div className={`p-4 border-t ${isDarkMode ? "border-gray-800" : "border-[#d8cbb8]"}`}>
            <FileUploadOptions
              showFileUpload={showFileUpload}
              setShowFileUpload={setShowFileUpload}
              isProcessingFile={isProcessingFile}
              handleFileUpload={handleFileUpload}
              processWebsite={processWebsite}
              isDarkMode={isDarkMode}
            />
            <form onSubmit={(e) => handleGenerateDiagram(e)} className="relative">
              <textarea
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (prompt.trim() && !isGenerating) {
                      handleGenerateDiagram(null);
                    }
                  }
                }}
                className={promptTextAreaClass}
                placeholder="Describe your diagram modifications..."
                disabled={isGenerating}
                style={{ height: '72px' }}
              />
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="absolute right-2 bottom-2 p-2 text-primary hover:text-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
                  </svg>
                )}
              </button>
            </form>
          </div>
        )}
        {editorMode === 'code' && (
          <div className={`p-4 border-t ${isDarkMode ? "border-gray-800" : "border-[#d8cbb8]"}`}>
            <button
              onClick={() => onRenderDiagram(currentDiagram)}
              className="w-full py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
            >
              Render Diagram
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default PromptPanel; 