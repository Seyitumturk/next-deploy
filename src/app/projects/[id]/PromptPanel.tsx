'use client';

import React, { useState, useEffect, useRef } from 'react';
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
    // First handle the generation
    handleGenerateDiagram(e, initialPrompt);
    
    // GUARANTEED scroll to bottom using multiple approaches to ensure it works
    if (chatContainerRef.current) {
      // Force scroll immediately and repeatedly
      const forceScrollToBottom = () => {
        const container = chatContainerRef.current;
        if (!container) return;
        
        // Force smooth scrolling
        container.style.scrollBehavior = 'smooth';
        container.scrollTop = container.scrollHeight;
      };
      
      // Execute multiple times to guarantee it happens after DOM updates
      forceScrollToBottom();
      setTimeout(forceScrollToBottom, 50);
      setTimeout(forceScrollToBottom, 150);
      setTimeout(forceScrollToBottom, 300);
      setTimeout(forceScrollToBottom, 500);
      setTimeout(forceScrollToBottom, 1000);
    }
    
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
      ? "border-gray-700/60 bg-gray-800/70 backdrop-blur-sm text-white placeholder:text-gray-500" 
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

  // Advanced auto-scroll implementation to ensure chat always shows latest messages
  useEffect(() => {
    if (!chatContainerRef.current) return;
    
    const chatContainer = chatContainerRef.current;
    
    // Function to scroll to bottom with smooth animation
    const scrollToBottom = () => {
      // Calculate the difference between scroll position and scroll height
      const isCloseToBottom = 
        chatContainer.scrollHeight - chatContainer.clientHeight - chatContainer.scrollTop < 100;
      
      // Use smooth scrolling if already near bottom, otherwise jump to avoid jarring long scrolls
      chatContainer.style.scrollBehavior = isCloseToBottom ? 'smooth' : 'auto';
      chatContainer.scrollTop = chatContainer.scrollHeight;
      
      // Reset to smooth after jump scrolling
      if (!isCloseToBottom) {
        setTimeout(() => {
          chatContainer.style.scrollBehavior = 'smooth';
        }, 100);
      }
    };
    
    // Always scroll to bottom immediately when chat history changes or generation state changes
    scrollToBottom();
    
    // Use a MutationObserver to detect DOM changes in the chat container
    const observer = new MutationObserver(() => {
      scrollToBottom();
    });
    
    // Configure the observer to watch for any changes in the chat container
    observer.observe(chatContainer, {
      childList: true,  // Watch for added/removed elements
      subtree: true,    // Watch the entire subtree
      characterData: true, // Watch for text changes
    });
    
    // Scroll when window is resized (can affect layout)
    window.addEventListener('resize', scrollToBottom);
    
    // Add multiple timeouts for reliability with different content load times
    // This helps ensure scrolling works even with dynamically loaded content or images
    const timeoutIds = [50, 150, 300, 600].map(
      delay => setTimeout(scrollToBottom, delay)
    );
    
    // Clean up
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', scrollToBottom);
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [chatHistory, isGenerating, chatContainerRef]);

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
            ? "bg-gray-900/85 border-gray-700/60" 
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
          isDarkMode ? "border-gray-700/60" : "border-[#b8a990]"
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
              className="p-4 space-y-4 h-full overflow-y-auto scroll-smooth"
              style={{ 
                scrollBehavior: 'smooth',
                maxHeight: 'calc(100% - 60px)', /* Adjust based on your input height */
              }}
            >
              {/* Welcome Message */}
              {chatHistory.length === 0 && (
                <div className="flex items-start space-x-3">
                  <div
                    className={`flex-1 rounded-2xl p-4 shadow-sm ${
                      isDarkMode 
                        ? "bg-gray-800/80 backdrop-blur-sm border border-gray-700/60" 
                        : "bg-[#d8cbb8] border border-[#b8a990]"
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
              {chatHistory.map((message, index) => {
                // Find the first user message with a diagram version
                const firstUserMessageWithDiagram = chatHistory.find(
                  msg => msg.role === 'user' && msg.diagramVersion
                );
                
                // Check if this message is the first user message with a diagram
                const isFirstUserMessage = 
                  message.role === 'user' && 
                  message.diagramVersion && 
                  message === firstUserMessageWithDiagram;
                
                // Log warning if onDiagramVersionSelect is missing but message has diagram
                if (message.diagramVersion && !onDiagramVersionSelect) {
                  console.warn('Warning: Message has diagram version but onDiagramVersionSelect is missing', {
                    messageIndex: index,
                    hasVersion: Boolean(message.diagramVersion)
                  });
                }
                
                return (
                  <ChatMessage 
                    key={index} 
                    message={message} 
                    onDiagramVersionSelect={onDiagramVersionSelect}
                    onRetry={() => {
                      handleGenerateAndCollapse(null);
                    }}
                    isDarkMode={isDarkMode}
                    isFirstUserMessage={isFirstUserMessage}
                  />
                );
              })}
            </div>
            {/* Chat Input Area */}
            <div className={`p-4 border-t ${
              isDarkMode ? "border-gray-700/60" : "border-[#b8a990]"
            }`}>
              {error && (
                <div className="mb-2 p-2 text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 rounded-md">
                  {error}
                </div>
              )}
              {/* File upload options for desktop */}
              {showFileUpload && (
                <div className="mb-2">
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
              )}
              <form onSubmit={handleGenerateAndCollapse}>
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleGenerateAndCollapse(null);
                      }
                    }}
                    className={promptTextAreaClass}
                    placeholder="Type your instructions here..."
                    disabled={isGenerating}
                    style={{
                      height: documentSummary ? '120px' : '72px',
                    }}
                  />
                  <div className="absolute right-2.5 bottom-2.5 flex space-x-1">
                    <button
                      type="button"
                      onClick={() => setShowFileUpload(!showFileUpload)}
                      className={`p-2 rounded-full transition-colors ${
                        isDarkMode 
                          ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700" 
                          : "text-[#8a7a66] hover:text-[#6a5c4c] hover:bg-[#d8cbb8]"
                      }`}
                      title="Upload Document or Image"
                      disabled={isGenerating}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>
                    <button
                      type="submit"
                      className={`p-2 rounded-full transition-colors ${
                        isGenerating || !prompt.trim() && !documentSummary
                          ? (isDarkMode ? "text-gray-600 bg-gray-800 cursor-not-allowed" : "text-[#b8a990] bg-[#e8dccc] cursor-not-allowed") 
                          : (isDarkMode ? "text-white bg-gray-700 hover:bg-gray-600" : "text-[#4a3c2c] bg-[#d8cbb8] hover:bg-[#c8bba8]")
                      }`}
                      disabled={isGenerating || (!prompt.trim() && !documentSummary)}
                      title="Send Message"
                    >
                      {isGenerating ? (
                        <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
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
            <div className={`p-4 border-t ${isDarkMode ? "border-gray-700/60" : "border-[#b8a990]"}`}>
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
            ? "bg-gray-900/90 backdrop-blur-md border-t border-gray-700/60" 
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
          isDarkMode ? "border-gray-700/60" : "border-[#b8a990]"
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
              style={{ 
                scrollBehavior: 'smooth',
                maxHeight: 'calc(100% - 60px)', /* Adjust based on your input height */
              }}
            >
              {/* Welcome Message */}
              {chatHistory.length === 0 && (
                <div className="flex items-start space-x-3">
                  <div
                    className={`flex-1 rounded-2xl p-4 shadow-sm ${
                      isDarkMode 
                        ? "bg-gray-800/80 backdrop-blur-sm border border-gray-700/60" 
                        : "bg-[#d8cbb8] border border-[#b8a990]"
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
              {chatHistory.map((message, index) => {
                // Find the first user message with a diagram version
                const firstUserMessageWithDiagram = chatHistory.find(
                  msg => msg.role === 'user' && msg.diagramVersion
                );
                
                // Check if this message is the first user message with a diagram
                const isFirstUserMessage = 
                  message.role === 'user' && 
                  message.diagramVersion && 
                  message === firstUserMessageWithDiagram;
                
                return (
                  <ChatMessage
                    key={index}
                    message={message}
                    onDiagramVersionSelect={onDiagramVersionSelect}
                    onRetry={() => handleGenerateAndCollapse(null)}
                    isDarkMode={isDarkMode}
                    isFirstUserMessage={isFirstUserMessage}
                  />
                );
              })}
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
              <div className={`p-4 border-t ${isDarkMode ? "border-gray-700/60" : "border-[#b8a990]"}`}>
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
          <div className={`p-4 border-t ${isDarkMode ? "border-gray-700/60" : "border-[#b8a990]"}`}>
            <form onSubmit={handleGenerateAndCollapse}>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerateAndCollapse(null);
                    }
                  }}
                  className={promptTextAreaClass}
                  placeholder="Type your instructions here..."
                  disabled={isGenerating}
                  style={{
                    height: documentSummary ? '120px' : '72px',
                  }}
                />
                <div className="absolute right-2.5 bottom-2.5 flex space-x-1">
                  <button
                    type="button"
                    onClick={() => setShowFileUpload(!showFileUpload)}
                    className={`p-2 rounded-full transition-colors ${
                      isDarkMode 
                        ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700" 
                        : "text-[#8a7a66] hover:text-[#6a5c4c] hover:bg-[#d8cbb8]"
                    }`}
                    title="Upload Document or Image"
                    disabled={isGenerating}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <button
                    type="submit"
                    className={`p-2 rounded-full transition-colors ${
                      isGenerating || !prompt.trim() && !documentSummary
                        ? (isDarkMode ? "text-gray-600 bg-gray-800 cursor-not-allowed" : "text-[#b8a990] bg-[#e8dccc] cursor-not-allowed") 
                        : (isDarkMode ? "text-white bg-gray-700 hover:bg-gray-600" : "text-[#4a3c2c] bg-[#d8cbb8] hover:bg-[#c8bba8]")
                    }`}
                    disabled={isGenerating || (!prompt.trim() && !documentSummary)}
                    title="Send Message"
                  >
                    {isGenerating ? (
                      <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
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
          <div className={`p-4 border-t ${isDarkMode ? "border-gray-700/60" : "border-[#b8a990]"}`}>
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