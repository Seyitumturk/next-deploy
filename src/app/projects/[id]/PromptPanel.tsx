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

// Add this new component for the generating status indicator
const GeneratingIndicator = ({ isDarkMode, message = "Generating diagram..." }: { isDarkMode: boolean, message?: string }) => (
  <div className={`absolute -top-10 left-0 right-0 flex justify-center pointer-events-none animate-fadeIn`}>
    <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center space-x-2 shadow-md ${
      isDarkMode 
        ? "bg-gray-800 text-blue-300 border border-gray-700" 
        : "bg-[#d8cbb8] text-[#4a3c2c] border border-[#b8a990]"
    }`}>
      <svg className="h-3.5 w-3.5 animate-spin mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>{message}</span>
    </div>
  </div>
);

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
  
  // Create a separate ref for the mobile chat container
  const mobileChatContainerRef = useRef<HTMLDivElement | null>(null);
  
  // GUARANTEED scroll to bottom function - memoized with useCallback
  const guaranteedScrollToBottom = React.useCallback(() => {
    console.log("ATTEMPTING SCROLL TO BOTTOM"); // Debug log
    
    // Function for direct DOM scrolling
    const scrollNow = () => {
      // Scroll desktop container
      if (chatContainerRef.current) {
        try {
          // Force to the very bottom with smooth behavior
          const container = chatContainerRef.current;
          
          // Use smooth scrolling for better UX
          container.style.scrollBehavior = 'smooth';
          const scrollHeight = container.scrollHeight;
          container.scrollTop = scrollHeight;
          
          // Second approach: scroll the last child into view
          const lastChild = container.lastElementChild;
          if (lastChild) {
            lastChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
          
          console.log("SCROLLED DESKTOP TO:", container.scrollTop, "HEIGHT:", scrollHeight); // Debug log
        } catch (err) {
          console.error("Desktop scroll error:", err);
        }
      }
      
      // Scroll mobile container
      if (mobileChatContainerRef.current) {
        try {
          // Force to the very bottom with smooth behavior
          const container = mobileChatContainerRef.current;
          
          // Use smooth scrolling for better UX
          container.style.scrollBehavior = 'smooth';
          const scrollHeight = container.scrollHeight;
          container.scrollTop = scrollHeight;
          
          // Second approach: scroll the last child into view
          const lastChild = container.lastElementChild;
          if (lastChild) {
            lastChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
          
          console.log("SCROLLED MOBILE TO:", container.scrollTop, "HEIGHT:", scrollHeight); // Debug log
        } catch (err) {
          console.error("Mobile scroll error:", err);
        }
      }
    };
    
    // Execute once immediately
    scrollNow();
    
    // Schedule one more scroll with a short delay to ensure it works after any rendering
    window.setTimeout(scrollNow, 100);
  }, [chatContainerRef]);
  
  // Add state for the generating message
  const [generatingMessage, setGeneratingMessage] = useState("Generating diagram...");
  
  // Update the custom handler for generating diagram
  const handleGenerateAndCollapse = (e: React.FormEvent<HTMLFormElement> | null, initialPrompt?: string) => {
    // First scroll to bottom before handling the generation
    guaranteedScrollToBottom();
    
    // Set a more specific message based on the prompt
    if (prompt.toLowerCase().includes("flowchart")) {
      setGeneratingMessage("Creating flowchart...");
    } else if (prompt.toLowerCase().includes("sequence")) {
      setGeneratingMessage("Building sequence diagram...");
    } else if (prompt.toLowerCase().includes("class")) {
      setGeneratingMessage("Designing class diagram...");
    } else if (prompt.toLowerCase().includes("entity")) {
      setGeneratingMessage("Mapping entity relationships...");
    } else {
      setGeneratingMessage("Generating diagram...");
    }
    
    // Then handle the diagram generation
    handleGenerateDiagram(e, initialPrompt);
    
    // Scroll again after submission
    guaranteedScrollToBottom();
    
    // On mobile, collapse the panel after submitting
    if (window.innerWidth < 768) {
      setTimeout(() => {
        setShowPromptPanel(false);
      }, 300); // Small delay for better UX
    }
  };
  
  // Add a useEffect to handle document text extraction
  useEffect(() => {
    if (documentSummary) {
      // When document text is extracted, adjust the textarea height
      if (textareaRef.current) {
        // Set a fixed height for the textarea when document content is added
        textareaRef.current.style.height = '120px';
      }
      
      // Close the file upload dropdown
      setShowFileUpload(false);
    }
  }, [documentSummary, setShowFileUpload]);

  // Add an additional useEffect specifically for chat history changes
  useEffect(() => {
    // When chat history changes, ensure we scroll to bottom
    if (chatHistory.length > 0) {
      console.log("CHAT HISTORY CHANGED, SCROLLING DOWN");
      guaranteedScrollToBottom();
    }
  }, [chatHistory, guaranteedScrollToBottom]);

  // Add a new effect to scroll to bottom when the user submits a message
  useEffect(() => {
    // Create a handler for the form submission
    const handleFormSubmit = () => {
      guaranteedScrollToBottom();
    };
    
    // Add an event listener for when the prompt form is submitted
    const promptForm = document.querySelector('form');
    if (promptForm) {
      promptForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Add an event listener for when Enter key is pressed in the textarea
    const textarea = textareaRef.current;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        guaranteedScrollToBottom();
      }
    };
    
    if (textarea) {
      textarea.addEventListener('keydown', handleKeyDown);
    }
    
    // Cleanup function
    return () => {
      if (promptForm) {
        promptForm.removeEventListener('submit', handleFormSubmit);
      }
      if (textarea) {
        textarea.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [guaranteedScrollToBottom]);

  // Add a useEffect to set up a MutationObserver for the mobile chat container
  useEffect(() => {
    if (!mobileChatContainerRef.current) return;
    
    console.log("Setting up MutationObserver for mobile chat container");
    
    // Create a MutationObserver to watch for changes to the chat container
    const observer = new MutationObserver((mutations) => {
      // Only scroll if mutations include added nodes (new messages)
      const hasAddedNodes = mutations.some(mutation => 
        mutation.type === 'childList' && mutation.addedNodes.length > 0
      );
      
      if (hasAddedNodes) {
        console.log("Content changed in mobile chat container, scrolling to bottom");
        // Use setTimeout to ensure DOM is fully updated before scrolling
        setTimeout(() => {
          guaranteedScrollToBottom();
        }, 0);
        
        // Additional scroll after a short delay to handle any async rendering
        setTimeout(() => {
          guaranteedScrollToBottom();
        }, 100);
      }
    });
    
    // Start observing the container for changes with more comprehensive options
    observer.observe(mobileChatContainerRef.current, {
      childList: true,      // Watch for added/removed nodes
      subtree: true,        // Watch children too
      characterData: true,  // Watch for text changes
      attributes: true,     // Watch for attribute changes
    });
    
    // Cleanup function
    return () => {
      observer.disconnect();
    };
  }, [mobileChatContainerRef.current, guaranteedScrollToBottom]); // Include guaranteedScrollToBottom in dependencies

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

  // Add an initial scroll effect when component mounts
  useEffect(() => {
    // Initial scroll to bottom when component mounts
    guaranteedScrollToBottom();
    
    // Also set a timeout to scroll after initial render
    const timer = setTimeout(guaranteedScrollToBottom, 300);
    
    // Clean up timeouts
    return () => {
      clearTimeout(timer);
    };
  }, [guaranteedScrollToBottom]);

  // Add a useEffect to handle scrolling when the panel becomes visible
  useEffect(() => {
    if (isVisible) {
      console.log("Panel became visible, scrolling to bottom");
      // Use setTimeout to ensure the panel is fully visible before scrolling
      const timer = setTimeout(() => {
        guaranteedScrollToBottom();
      }, 300); // Wait for transition to complete
      
      // Clean up the timeout
      return () => clearTimeout(timer);
    }
  }, [isVisible, guaranteedScrollToBottom]);

  // Add a useEffect to handle window resize events
  useEffect(() => {
    const handleResize = () => {
      // Scroll to bottom when window is resized
      guaranteedScrollToBottom();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [guaranteedScrollToBottom]);

  // Add a typing indicator to the last message if generating
  useEffect(() => {
    if (isGenerating && chatHistory.length > 0) {
      // Add a typing indicator message at the end of chat history
      const lastMessage = chatHistory[chatHistory.length - 1];
      if (lastMessage.role !== 'assistant' || !lastMessage.isTyping) {
        // We would add a typing indicator here, but since we can't modify chatHistory directly,
        // we'll show the indicator in the UI instead
        guaranteedScrollToBottom();
      }
    }
  }, [isGenerating, chatHistory, guaranteedScrollToBottom]);

  // Define conditional textarea classes without scrollbar classes
  const promptTextAreaClass = `w-full rounded-xl border px-4 pb-4 pt-3 pr-14 text-sm focus:ring-2 focus:ring-primary/50 focus:border-transparent resize-none ${
    documentSummary ? 'h-[120px]' : 'h-[72px]'
  } transition-all duration-200 ease-in-out focus:placeholder:text-transparent overflow-y-auto break-words overflow-x-hidden no-scrollbar ${
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

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
          display: 'flex',
          flexDirection: 'column',
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
              className="p-4 space-y-4 h-full overflow-y-auto scroll-smooth chat-scroll-container relative"
              style={{ 
                scrollBehavior: 'smooth',
                height: 'calc(100% - 120px)',
                minHeight: '300px',
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
                  message === firstUserMessageWithDiagram ? true : false;
                
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
                    onReaction={(messageIndex, reaction) => {
                      // This would be implemented in the parent component
                      console.log(`Reaction ${reaction} added to message ${messageIndex}`);
                      
                      // Here we would update the chatHistory with the reaction
                      // Since we can't modify chatHistory directly, this would need to be
                      // implemented in the parent component
                    }}
                    messageIndex={index}
                    onCollapseMessage={() => {
                      // For user messages with document content, collapse and focus on input
                      if (message.role === 'user' || message.role === 'document') {
                        // Focus on the textarea
                        if (textareaRef.current) {
                          textareaRef.current.focus();
                        }
                        
                        // If this is a document message, we might want to clear it or handle differently
                        if (message.role === 'document' && documentSummary) {
                          // This would need to be implemented in the parent component
                          console.log('Document message collapsed');
                        }
                      }
                    }}
                  />
                );
              })}
              
              {/* Add typing indicator at the end when generating */}
              {isGenerating && (
                <div className="flex justify-start mb-4 animate-fadeIn">
                  <div className={`max-w-[85%] rounded-2xl py-3 px-4 ${
                    isDarkMode 
                      ? "bg-gray-800/80 backdrop-blur-sm text-white border border-gray-700/60 shadow-md" 
                      : "bg-[#d8cbb8] text-[#4a3c2c] border border-[#b8a990] shadow-sm"
                  }`}>
                    <div className={`flex space-x-1 items-center h-5 ${isDarkMode ? 'opacity-70' : 'opacity-60'}`}>
                      <div className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-blue-400' : 'bg-primary'} animate-bounce`} style={{ animationDelay: '0ms' }}></div>
                      <div className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-blue-400' : 'bg-primary'} animate-bounce`} style={{ animationDelay: '150ms' }}></div>
                      <div className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-blue-400' : 'bg-primary'} animate-bounce`} style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Chat Input Area - Fixed height */}
            <div 
              className={`p-4 border-t ${
                isDarkMode ? "border-gray-700/60" : "border-[#b8a990]"
              }`}
              style={{ flexShrink: 0 }}
            >
              {error && (
                <div className="mb-2 p-2 text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 rounded-md">
                  {error}
                </div>
              )}
              <form onSubmit={(e) => {
                e.preventDefault();
                guaranteedScrollToBottom(); // Scroll before form submission
                handleGenerateAndCollapse(e);
              }}>
                <div className="relative">
                  {/* Show generating indicator above the textarea */}
                  {isGenerating && (
                    <GeneratingIndicator isDarkMode={isDarkMode} message={generatingMessage} />
                  )}
                  
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        guaranteedScrollToBottom(); // Scroll before Enter key submission
                        handleGenerateAndCollapse(null);
                      }
                    }}
                    className={`${promptTextAreaClass} ${isGenerating ? 'opacity-70' : 'opacity-100'}`}
                    placeholder={isGenerating ? "Generating diagram..." : "Type your instructions here..."}
                    disabled={isGenerating}
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
                      title={isGenerating ? "Generating diagram..." : "Send Message"}
                    >
                      {isGenerating ? (
                        <div className="relative">
                          <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Always show file upload options below the textarea */}
                {showFileUpload && (
                  <div className="mt-2 rounded-lg overflow-hidden">
                    <FileUploadOptions
                      showFileUpload={showFileUpload}
                      setShowFileUpload={setShowFileUpload}
                      isProcessingFile={isProcessingFile}
                      isProcessingImage={isProcessingImage || false}
                      handleFileUpload={wrappedHandleFileUpload}
                      handleImageUpload={wrappedHandleImageUpload || (() => {})}
                      processWebsite={processWebsite}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                )}
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-[#e8dccc]"}`}>
              <div className={`h-full w-full ${isDarkMode ? "bg-gray-900" : "bg-[#e8dccc]"}`}>
                <Editor
                  height="100%"
                  defaultLanguage="mermaid"
                  value={currentDiagram}
                  onChange={(value) => {
                    if (value !== undefined) {
                      setCurrentDiagram(value);
                      if (handleCodeChange) {
                        // Show saving indicator
                        setIsSaving(true);
                        handleCodeChange(value);
                        // Hide saving indicator after a delay
                        setTimeout(() => {
                          setIsSaving(false);
                        }, 1500);
                      }
                    }
                  }}
                  onMount={() => {
                    if (typeof setIsEditorReady === 'function') {
                      setIsEditorReady(true);
                    } else {
                      console.warn('setIsEditorReady is not a function');
                    }
                  }}
                  options={{
                    ...monacoOptions,
                    theme: isDarkMode ? 'vs-dark' : 'vs',
                  }}
                />
              </div>
            </div>
            <div className={`p-4 border-t ${isDarkMode ? "border-gray-700/60" : "border-[#b8a990]"}`}>
              <div className={`flex items-center justify-between ${
                isDarkMode 
                  ? "text-gray-300" 
                  : "text-[#6a5c4c]"
              }`}>
                <div className="text-sm font-medium">Auto-saving enabled</div>
                <div className="flex items-center space-x-2">
                  {isGenerating ? (
                    <div className="flex items-center space-x-2 text-sm">
                      <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Rendering...</span>
                    </div>
                  ) : isSaving ? (
                    <div className="flex items-center space-x-2 text-sm animate-pulse">
                      <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving changes...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Changes auto-saved</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
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
      
      {/* Global generating indicator for mobile */}
      {isGenerating && !isVisible && (
        <div className="md:hidden fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fadeIn">
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center space-x-2 shadow-md ${
            isDarkMode 
              ? "bg-gray-800 text-blue-300 border border-gray-700" 
              : "bg-[#d8cbb8] text-[#4a3c2c] border border-[#b8a990]"
          }`}>
            <svg className="h-3.5 w-3.5 animate-spin mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{generatingMessage}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default PromptPanel; 