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
  chatContainerRef: React.RefObject<HTMLDivElement>;
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
}) => {
  // Add local state to detect whether dark mode is active.
  const [isDarkModeLocal, setIsDarkModeLocal] = useState(
    typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    setIsDarkModeLocal(document.documentElement.classList.contains('dark'));
  }, []);

  // Define conditional textarea classes without scrollbar classes
  const promptTextAreaClass = `w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 pb-4 pt-3 pr-14 text-sm focus:ring-2 focus:ring-secondary/50 focus:border-transparent resize-none min-h-[72px] max-h-[200px] transition-all duration-200 ease-in-out ${!isDarkModeLocal ? "placeholder-black" : "placeholder:text-gray-400 dark:placeholder:text-gray-500"} focus:placeholder:text-transparent overflow-y-auto break-words overflow-x-hidden`;

  // Add a handler to revert to a previous diagram version.
  const handleDiagramVersionSelect = (version: string) => {
    setCurrentDiagram(version);
    onRenderDiagram(version);
  };

  return (
    <>
      {/* Desktop Prompt Panel */}
      <div
        className="hidden md:flex w-96 flex-col bg-[#e8dccc] dark:bg-gray-900/90 backdrop-blur-md border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out"
        style={{
          position: 'absolute',
          height: 'calc(100% - 3rem)', // subtract header height
          zIndex: 10,
          transform: isVisible ? 'translateX(0)' : 'translateX(-100%)',
          backgroundColor: !isDarkModeLocal ? "#e8dccc" : undefined,
        }}
      >
        {/* Chat Header */}
        <div className="h-12 p-4 border-b border-gray-200 dark:border-gray-800 flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-white flex items-center justify-center hover:bg-secondary/10 transition-colors">
                {editorMode === 'chat' ? (
                  <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-black dark:text-black" />
                ) : (
                  <CodeBracketIcon className="h-5 w-5 text-black dark:text-black" />
                )}
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {editorMode === 'chat' ? 'AI Assistant' : 'Code Editor'}
                </h2>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setEditorMode(editorMode === 'chat' ? 'code' : 'chat')}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center space-x-2"
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
                className="p-2 hover:bg-white/10 rounded-full transition-colors focus:outline-none"
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
                  className="flex-1 rounded-2xl p-4 shadow-sm"
                  style={!isDarkModeLocal ? { backgroundColor: "#e8dccc" } : {}}
                >
                  <p
                    className="text-gray-700 dark:text-gray-300"
                    style={!isDarkModeLocal ? { color: "#000000" } : {}}
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
                    onDiagramVersionSelect={handleDiagramVersionSelect}
                    onRetry={() => {
                      handleGenerateDiagram(null);
                    }}
                  />
                ))}
              </div>
            </div>
            {/* Chat Input Area */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              <FileUploadOptions
                showFileUpload={showFileUpload}
                setShowFileUpload={setShowFileUpload}
                isProcessingFile={isProcessingFile}
                handleFileUpload={handleFileUpload}
                processWebsite={processWebsite}
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
                  style={
                    !isDarkModeLocal
                      ? { backgroundColor: "#e8dccc", color: "#000000", height: '72px' }
                      : { height: '72px' }
                  }
                />
                <button
                  type="submit"
                  disabled={!prompt.trim() || isGenerating}
                  className="absolute right-2 bottom-2 p-2 text-secondary hover:text-secondary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-secondary" />
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
          // Code Editor Mode: show the latest Mermaid syntax code and update diagram on change
          <div className="flex-1 flex flex-col">
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="mermaid"
                value={currentDiagram}
                onChange={(value) => {
                  if (value) {
                    setCurrentDiagram(value);
                    onRenderDiagram(value);
                    handleCodeChange && handleCodeChange(value);
                  }
                }}
                onMount={() => setIsEditorReady(true)}
                options={monacoOptions}
                beforeMount={(monaco) => {
                  // Register Mermaid language and define theme
                  monaco.languages.register({ id: 'mermaid' });
                  monaco.languages.setMonarchTokensProvider('mermaid', {
                    tokenizer: {
                      root: [
                        [/^(graph|sequenceDiagram|classDiagram|stateDiagram)/, 'keyword'],
                        [/[A-Za-z]+(?=\s*[:{])/, 'type'],
                        [/[{}[\]]/, 'delimiter'],
                        [/[<>]/, 'delimiter'],
                        [/[-=]>/, 'arrow'],
                        [/".*?"/, 'string'],
                        [/'.*?'/, 'string'],
                        [/\|.*?\|/, 'label'],
                        [/\s*%%.+$/, 'comment'],
                        [/\s*\#.+$/, 'comment'],
                        [/[A-Za-z_]\w*/, 'identifier'],
                        [/[;,.]/, 'delimiter'],
                        [/->/, 'arrow'],
                        [/--/, 'arrow'],
                        [/\d+/, 'number'],
                      ],
                    },
                  });
                  monaco.editor.defineTheme('mermaid-dark', {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [
                      { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
                      { token: 'type', foreground: '4EC9B0' },
                      { token: 'string', foreground: 'CE9178' },
                      { token: 'identifier', foreground: '9CDCFE' },
                      { token: 'comment', foreground: '6A9955' },
                      { token: 'delimiter', foreground: 'D4D4D4' },
                      { token: 'arrow', foreground: 'D4D4D4' },
                      { token: 'number', foreground: 'B5CEA8' },
                      { token: 'label', foreground: 'DCDCAA' },
                    ],
                    colors: {
                      'editor.background': '#1E1E1E',
                    },
                  });
                }}
                theme="mermaid-dark"
                loading={
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
                  </div>
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Prompt Panel */}
      <div
        className="flex md:hidden w-full flex-col bg-[#e8dccc] dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out"
        style={{
          position: 'fixed',
          bottom: 0,
          height: '50vh',
          zIndex: 10,
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
          backgroundColor: !isDarkModeLocal ? "#e8dccc" : undefined,
        }}
      >
        {/* Chat Header */}
        <div className="h-12 p-4 border-b border-gray-200 dark:border-gray-800 flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-white flex items-center justify-center hover:bg-secondary/10 transition-colors">
                {editorMode === 'chat' ? (
                  <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-black dark:text-black" />
                ) : (
                  <CodeBracketIcon className="h-5 w-5 text-black dark:text-black" />
                )}
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {editorMode === 'chat' ? 'AI Assistant' : 'Code Editor'}
                </h2>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setEditorMode(editorMode === 'chat' ? 'code' : 'chat')}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center space-x-2"
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
                className="p-2 hover:bg-white/10 rounded-full transition-colors focus:outline-none"
                title={isVisible ? "Collapse Panel" : "Expand Panel"}
              >
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
                  className="flex-1 rounded-2xl p-4 shadow-sm"
                  style={!isDarkModeLocal ? { backgroundColor: "#e8dccc" } : {}}
                >
                  <p
                    className="text-gray-700 dark:text-gray-300"
                    style={!isDarkModeLocal ? { color: "#000000" } : {}}
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
                    onDiagramVersionSelect={handleDiagramVersionSelect}
                    onRetry={() => {
                      handleGenerateDiagram(null);
                    }}
                  />
                ))}
              </div>
            </div>
            {/* Chat Input Area */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              <FileUploadOptions
                showFileUpload={showFileUpload}
                setShowFileUpload={setShowFileUpload}
                isProcessingFile={isProcessingFile}
                handleFileUpload={handleFileUpload}
                processWebsite={processWebsite}
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
                  style={
                    !isDarkModeLocal
                      ? { backgroundColor: "#e8dccc", color: "#000000", height: '72px' }
                      : { height: '72px' }
                  }
                />
                <button
                  type="submit"
                  disabled={!prompt.trim() || isGenerating}
                  className="absolute right-2 bottom-2 p-2 text-secondary hover:text-secondary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-secondary" />
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
          // Code Editor Mode: show the latest Mermaid syntax code and update diagram on change
          <div className="flex-1 flex flex-col">
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="mermaid"
                value={currentDiagram}
                onChange={(value) => {
                  if (value) {
                    setCurrentDiagram(value);
                    onRenderDiagram(value);
                    handleCodeChange && handleCodeChange(value);
                  }
                }}
                onMount={() => setIsEditorReady(true)}
                options={monacoOptions}
                beforeMount={(monaco) => {
                  // Register Mermaid language and define theme
                  monaco.languages.register({ id: 'mermaid' });
                  monaco.languages.setMonarchTokensProvider('mermaid', {
                    tokenizer: {
                      root: [
                        [/^(graph|sequenceDiagram|classDiagram|stateDiagram)/, 'keyword'],
                        [/[A-Za-z]+(?=\s*[:{])/, 'type'],
                        [/[{}[\]]/, 'delimiter'],
                        [/[<>]/, 'delimiter'],
                        [/[-=]>/, 'arrow'],
                        [/".*?"/, 'string'],
                        [/'.*?'/, 'string'],
                        [/\|.*?\|/, 'label'],
                        [/\s*%%.+$/, 'comment'],
                        [/\s*\#.+$/, 'comment'],
                        [/[A-Za-z_]\w*/, 'identifier'],
                        [/[;,.]/, 'delimiter'],
                        [/->/, 'arrow'],
                        [/--/, 'arrow'],
                        [/\d+/, 'number'],
                      ],
                    },
                  });
                  monaco.editor.defineTheme('mermaid-dark', {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [
                      { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
                      { token: 'type', foreground: '4EC9B0' },
                      { token: 'string', foreground: 'CE9178' },
                      { token: 'identifier', foreground: '9CDCFE' },
                      { token: 'comment', foreground: '6A9955' },
                      { token: 'delimiter', foreground: 'D4D4D4' },
                      { token: 'arrow', foreground: 'D4D4D4' },
                      { token: 'number', foreground: 'B5CEA8' },
                      { token: 'label', foreground: 'DCDCAA' },
                    ],
                    colors: {
                      'editor.background': '#1E1E1E',
                    },
                  });
                }}
                theme="mermaid-dark"
                loading={
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
                  </div>
                }
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};
// adam
export default PromptPanel; 