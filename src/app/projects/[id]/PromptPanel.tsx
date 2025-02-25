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
  handleImageUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  processWebsite: (url: string) => void;
  isProcessingFile: boolean;
  isProcessingImage?: boolean;
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
  downloadSVG?: () => void;
  downloadPNG?: (transparent?: boolean) => void;
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

// Mobile-specific Monaco editor options
const mobileMonacoOptions = {
  ...monacoOptions,
  fontSize: 16, // Larger font for better readability on mobile
  lineNumbers: 'off' as const, // Save space by hiding line numbers
  padding: { top: 12, bottom: 12 },
  scrollbar: {
    ...monacoOptions.scrollbar,
    verticalScrollbarSize: 10, // Larger scrollbar for touch
    horizontalScrollbarSize: 10
  },
  folding: false, // Disable code folding on mobile
  glyphMargin: false, // Hide glyph margin to save space
  lineDecorationsWidth: 0, // Minimize decorations width
  renderLineHighlight: 'none' as const, // Disable line highlighting to simplify UI
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
  handleImageUpload,
  processWebsite,
  isProcessingFile,
  isProcessingImage,
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
  downloadSVG,
  downloadPNG,
}) => {
  // State for website URL input
  const [showWebsiteInput, setShowWebsiteInput] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  
  // Handle website URL submission
  const handleWebsiteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (websiteUrl.trim()) {
      processWebsite(websiteUrl.trim());
      setWebsiteUrl('');
      setShowWebsiteInput(false);
    }
  };
  
  // Custom handler for generating diagram that also collapses the panel on mobile
  const handleGenerateAndCollapse = (e: React.FormEvent<HTMLFormElement> | null, initialPrompt?: string) => {
    handleGenerateDiagram(e, initialPrompt);
    // On mobile, collapse the panel after submitting
    if (window.innerWidth < 768) {
      setTimeout(() => {
        setShowPromptPanel(false);
      }, 300); // Small delay for better UX
    }
  };
  
  // Define conditional textarea classes without scrollbar classes
  const promptTextAreaClass = `w-full rounded-xl border px-4 pb-4 pt-3 pr-14 text-sm focus:ring-2 focus:ring-primary/50 focus:border-transparent resize-none ${
    documentSummary ? 'min-h-[120px]' : 'min-h-[72px]'
  } max-h-[200px] transition-all duration-200 ease-in-out focus:placeholder:text-transparent overflow-y-auto break-words overflow-x-hidden no-scrollbar ${
    isDarkMode 
      ? "border-gray-700 bg-gray-800/70 text-white placeholder:text-gray-500" 
      : "border-[#b8a990] bg-[#e8dccc]/70 text-[#6a5c4c] placeholder:text-[#8a7a66]"
  } ${documentSummary && prompt ? 'ring-2 ring-primary/50 border-transparent' : ''}`;

  // Add a ref for the textarea
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Focus and highlight the textarea when document content is added
  React.useEffect(() => {
    if (documentSummary && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      
      // Expand the textarea to show more content
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${newHeight}px`;
      
      // Close the file upload dropdown
      setShowFileUpload(false);
    }
  }, [documentSummary, setShowFileUpload]);

  // Auto-scroll to bottom when chat history changes
  React.useEffect(() => {
    if (chatContainerRef.current && chatHistory.length > 0) {
      const chatContainer = chatContainerRef.current;
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [chatHistory, chatContainerRef]);

  // Wrap the file upload handlers to close the dropdown
  const wrappedHandleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e);
    setShowFileUpload(false);
  };
  
  const wrappedHandleImageUpload = handleImageUpload 
    ? (e: React.ChangeEvent<HTMLInputElement>) => {
        handleImageUpload(e);
        setShowFileUpload(false);
      }
    : undefined;

  return (
    <>
      {/* Desktop Prompt Panel */}
      <div
        className={`hidden md:flex w-96 flex-col backdrop-blur-md border-r transform transition-transform duration-300 ease-in-out ${
          isDarkMode 
            ? "bg-gray-900/90 border-gray-700" 
            : "bg-[#e8dccc]/90 border-[#b8a990] shadow-sm"
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
          isDarkMode ? "border-gray-800" : "border-[#b8a990]"
        }`}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isDarkMode 
                  ? "bg-gray-800 text-white hover:bg-gray-700" 
                  : "bg-[#d8cbb8] text-[#6a5c4c] hover:bg-[#c8bba8] border border-[#b8a990]"
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
                    : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c] border border-[#b8a990]"
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </span>

                {/* Mobile vertical toggle icon */}
                <span className="md:hidden">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isVisible ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} />
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
              className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
            >
              {/* Welcome Message */}
              <div className="flex items-start space-x-3">
                <div
                  className={`flex-1 rounded-2xl p-4 shadow-sm ${
                    isDarkMode ? "bg-gray-800/50" : "bg-[#d8cbb8]/50 border border-[#b8a990]"
                  }`}
                >
                  <p
                    className={isDarkMode ? "text-gray-300" : "text-[#4a3c2c] font-medium"}
                  >
                    Hello! I'm your AI assistant. Describe what you'd like to create or modify in your diagram, and I'll help you bring it to life.
                  </p>
                </div>
              </div>
              {/* Chat History */}
              {chatHistory.map((message, index) => (
                <ChatMessage 
                  key={index} 
                  message={message} 
                  onDiagramVersionSelect={onDiagramVersionSelect}
                  onRetry={() => {
                    handleGenerateAndCollapse(null);
                  }}
                  isDarkMode={isDarkMode}
                />
              ))}
            </div>
            {/* Chat Input Area */}
            <div className={`p-4 border-t ${isDarkMode ? "border-gray-800" : "border-[#b8a990]"}`}>
              <FileUploadOptions
                showFileUpload={showFileUpload}
                setShowFileUpload={setShowFileUpload}
                isProcessingFile={isProcessingFile}
                isProcessingImage={isProcessingImage}
                handleFileUpload={wrappedHandleFileUpload}
                handleImageUpload={wrappedHandleImageUpload}
                processWebsite={processWebsite}
                isDarkMode={isDarkMode}
              />
              <form onSubmit={(e) => handleGenerateAndCollapse(e)} className="relative">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    // Reset height to auto first to handle content removal
                    e.target.style.height = 'auto';
                    // Then set to scrollHeight to expand with content
                    const newHeight = Math.min(e.target.scrollHeight, 200);
                    e.target.style.height = `${newHeight}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (prompt.trim() && !isGenerating) {
                        handleGenerateAndCollapse(null);
                      }
                    }
                  }}
                  className={promptTextAreaClass}
                  placeholder={documentSummary 
                    ? "Edit the extracted information or add additional instructions..." 
                    : "Describe your diagram modifications... (Press Enter to send, Shift+Enter for new line)"}
                  disabled={isGenerating}
                  style={{ height: documentSummary ? '120px' : '72px' }}
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
            <div className={`p-4 border-t ${isDarkMode ? "border-gray-800" : "border-[#b8a990]"}`}>
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
        className={`md:hidden fixed bottom-0 left-0 right-0 flex flex-col transform transition-transform duration-500 ease-in-out ${
          isDarkMode 
            ? "bg-gray-900 border-t border-gray-800" 
            : "bg-[#e8dccc] border-t border-[#b8a990]"
        }`}
        style={{
          height: isVisible ? '50vh' : '0',
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
          zIndex: 20,
        }}
      >
        {/* Mobile header with toggle */}
        <div className={`h-12 p-4 border-b flex items-center justify-between ${
          isDarkMode ? "border-gray-800" : "border-[#b8a990]"
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
              aria-label={isVisible ? "Collapse panel" : "Expand panel"}
            >
              {isVisible ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile content */}
        <div className="flex-1 overflow-y-auto">
          {editorMode === 'chat' ? (
            <div 
              ref={chatContainerRef}
              className="p-4 space-y-4 h-full overflow-y-auto scroll-smooth"
            >
              {/* Welcome Message */}
              {chatHistory.length === 0 && (
                <div className="flex items-start space-x-3">
                  <div
                    className={`flex-1 rounded-2xl p-4 shadow-sm ${
                      isDarkMode ? "bg-gray-800/50" : "bg-[#d8cbb8]/50 border border-[#b8a990]"
                    }`}
                  >
                    <p
                      className={isDarkMode ? "text-gray-300" : "text-[#4a3c2c] font-medium"}
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
                    handleGenerateAndCollapse(null);
                  }}
                  isDarkMode={isDarkMode}
                />
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex-1" style={{ minHeight: '30vh' }}>
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
                    ...mobileMonacoOptions,
                    theme: isDarkMode ? 'vs-dark' : 'vs',
                  }}
                />
              </div>
              <div className={`p-4 border-t ${isDarkMode ? "border-gray-800" : "border-[#b8a990]"}`}>
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

        {/* Mobile input area */}
        {editorMode === 'chat' && (
          <div className={`p-4 border-t ${isDarkMode ? "border-gray-800" : "border-[#b8a990]"}`}>
            {/* Desktop file upload options */}
            <div className="hidden md:block">
              <FileUploadOptions
                showFileUpload={showFileUpload}
                setShowFileUpload={setShowFileUpload}
                isProcessingFile={isProcessingFile}
                isProcessingImage={isProcessingImage}
                handleFileUpload={wrappedHandleFileUpload}
                handleImageUpload={wrappedHandleImageUpload}
                processWebsite={processWebsite}
                isDarkMode={isDarkMode}
              />
            </div>
            <form onSubmit={(e) => handleGenerateAndCollapse(e)} className="relative">
              <textarea
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  // Reset height to auto first to handle content removal
                  e.target.style.height = 'auto';
                  // Then set to scrollHeight to expand with content
                  const newHeight = Math.min(e.target.scrollHeight, 200);
                  e.target.style.height = `${newHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (prompt.trim() && !isGenerating) {
                      handleGenerateAndCollapse(null);
                    }
                  }
                }}
                className={promptTextAreaClass}
                placeholder={documentSummary 
                  ? "Edit the extracted information or add additional instructions..." 
                  : "Describe your diagram modifications..."}
                disabled={isGenerating}
                style={{ height: documentSummary ? '120px' : '72px' }}
              />
              
              {/* Mobile minimalistic file upload button */}
              <div className="md:hidden absolute right-10 bottom-2">
                <button
                  type="button"
                  onClick={() => setShowFileUpload(!showFileUpload)}
                  className={`p-2 rounded-full transition-colors group relative ${
                    isDarkMode 
                      ? "text-gray-400 hover:text-gray-300 hover:bg-gray-800/70" 
                      : "text-[#8a7a66] hover:text-[#6a5c4c] hover:bg-[#d8cbb8]/50"
                  } ${isProcessingFile || isProcessingImage ? 'animate-pulse' : ''}`}
                >
                  {isProcessingFile || isProcessingImage ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                  )}
                  <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs font-medium bg-gray-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Import Options
                  </span>
                </button>
                
                {/* Mobile file upload dropdown */}
                {showFileUpload && (
                  <div className="absolute bottom-full right-0 mb-2 w-64 rounded-lg shadow-lg overflow-hidden transform transition-all duration-200 ease-in-out origin-bottom-right">
                    <div className={`${
                      isDarkMode 
                        ? "bg-gray-800 border border-gray-700" 
                        : "bg-white border border-[#d8cbb8]"
                    } rounded-lg shadow-xl`}>
                      <div className={`px-3 py-2 border-b ${
                        isDarkMode ? "border-gray-700" : "border-[#d8cbb8]"
                      }`}>
                        <h3 className={`text-xs font-medium ${
                          isDarkMode ? "text-gray-300" : "text-[#6a5c4c]"
                        }`}>
                          Import Options
                        </h3>
                      </div>
                      <div className="p-2 space-y-1">
                        <button
                          type="button"
                          onClick={() => document.getElementById('pdf-upload')?.click()}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center space-x-2 ${
                            isDarkMode 
                              ? "hover:bg-gray-700 text-white" 
                              : "hover:bg-[#f5f0e8] text-[#6a5c4c]"
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <path d="M9 15v-2h6v2"></path>
                            <path d="M12 13v5"></path>
                          </svg>
                          <span>PDF Document</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => document.getElementById('powerpoint-upload')?.click()}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center space-x-2 ${
                            isDarkMode 
                              ? "hover:bg-gray-700 text-white" 
                              : "hover:bg-[#f5f0e8] text-[#6a5c4c]"
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <rect x="8" y="12" width="8" height="6"></rect>
                          </svg>
                          <span>PowerPoint Document</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => document.getElementById('word-upload')?.click()}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center space-x-2 ${
                            isDarkMode 
                              ? "hover:bg-gray-700 text-white" 
                              : "hover:bg-[#f5f0e8] text-[#6a5c4c]"
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="8" y1="12" x2="16" y2="12"></line>
                            <line x1="8" y1="16" x2="14" y2="16"></line>
                          </svg>
                          <span>Word Document</span>
                        </button>
                        
                        {handleImageUpload && (
                          <button
                            type="button"
                            onClick={() => document.getElementById('image-upload')?.click()}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center space-x-2 ${
                              isDarkMode 
                                ? "hover:bg-gray-700 text-white" 
                                : "hover:bg-[#f5f0e8] text-[#6a5c4c]"
                            }`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                              <circle cx="8.5" cy="8.5" r="1.5"></circle>
                              <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                            <span>Image</span>
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            setShowWebsiteInput(true);
                            setShowFileUpload(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center space-x-2 ${
                            isDarkMode 
                              ? "hover:bg-gray-700 text-white" 
                              : "hover:bg-[#f5f0e8] text-[#6a5c4c]"
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="2" y1="12" x2="22" y2="12"></line>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                          </svg>
                          <span>Website URL</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
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
            
            {/* Hidden file inputs */}
            <input
              type="file"
              id="pdf-upload"
              accept=".pdf"
              onChange={wrappedHandleFileUpload}
              className="hidden"
            />
            <input
              type="file"
              id="powerpoint-upload"
              accept=".ppt,.pptx"
              onChange={wrappedHandleFileUpload}
              className="hidden"
            />
            <input
              type="file"
              id="word-upload"
              accept=".doc,.docx"
              onChange={wrappedHandleFileUpload}
              className="hidden"
            />
            {handleImageUpload && (
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                onChange={wrappedHandleImageUpload}
                className="hidden"
              />
            )}
            
            {/* Website URL input for mobile */}
            {showWebsiteInput && (
              <div className="mt-2">
                <form onSubmit={handleWebsiteSubmit} className="flex space-x-2">
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="Enter website URL"
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                      isDarkMode 
                        ? "border-gray-700 bg-gray-800 text-white placeholder:text-gray-500" 
                        : "border-[#d8cbb8] bg-[#e8dccc]/70 text-[#6a5c4c] placeholder:text-[#8a7a66]"
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={!websiteUrl.trim()}
                    className={`px-3 py-2 rounded-lg ${
                      isDarkMode 
                        ? "bg-gray-800 hover:bg-gray-700 text-white disabled:bg-gray-800 disabled:text-gray-600" 
                        : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c] disabled:bg-[#e8dccc] disabled:text-[#a89c88]"
                    } transition-colors disabled:cursor-not-allowed`}
                  >
                    Import
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
        {editorMode === 'code' && (
          <div className={`p-4 border-t ${isDarkMode ? "border-gray-800" : "border-[#b8a990]"}`}>
            <button
              onClick={() => onRenderDiagram(currentDiagram)}
              className="w-full py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
            >
              Render Diagram
            </button>
          </div>
        )}
      </div>
      
      {/* Floating chat button when panel is collapsed (mobile only) */}
      {!isVisible && (
        <button
          onClick={() => setShowPromptPanel(true)}
          className={`md:hidden fixed bottom-4 right-4 p-3 rounded-full shadow-lg transition-all transform hover:scale-105 z-30 ${
            isDarkMode 
              ? "bg-primary text-white" 
              : "bg-primary text-white"
          }`}
          aria-label="Open chat"
        >
          <ChatBubbleLeftEllipsisIcon className="h-6 w-6" />
        </button>
      )}
    </>
  );
};

export default PromptPanel; 