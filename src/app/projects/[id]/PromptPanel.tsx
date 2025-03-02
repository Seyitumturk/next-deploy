'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import { ChatMessageData } from './chatMessage/types';
import { ChatMessage } from './chatMessage';
import FileUploadOptions from './FileUploadOptions';
import { ChatBubbleLeftEllipsisIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { EyeIcon } from '@heroicons/react/24/outline';
import { PaperAirplaneIcon, ArrowDownCircleIcon } from '@heroicons/react/24/solid';

// Add Monaco editor type definition to the global Window interface
declare global {
  interface Window {
    monaco: any;
  }
}

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
  onRetry?: () => void;
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
        ? "bg-[#282424] text-blue-300 border border-[#343030]"
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
  onRetry,
}) => {
  // State for website URL input
  const [showWebsiteInput, setShowWebsiteInput] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  
  // Create a separate ref for the mobile chat container
  const mobileChatContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Add a ref to track the editor instance
  const editorRef = useRef<any>(null);
  
  // Add state to track if refs are initialized
  const [refsInitialized, setRefsInitialized] = useState(false);

  // Add a useEffect to update editor theme when dark mode or editor mode changes
  useEffect(() => {
    if (editorRef.current && editorMode === 'code') {
      // Get the Monaco instance
      const monaco = window.monaco;
      if (monaco) {
        // Update editor theme
        monaco.editor.setTheme(isDarkMode ? 'vs-dark' : 'vs');
        
        // Try to update the editor's background color directly
        try {
          const editorElement = document.querySelector('.monaco-editor');
          if (editorElement) {
            (editorElement as HTMLElement).style.backgroundColor = isDarkMode ? '#111827' : '#e8dccc';
          }
        } catch (err) {
          console.error('Error updating editor background:', err);
        }
      }
    }
  }, [isDarkMode, editorMode]);

  // Add a useEffect to check if refs are initialized
  useEffect(() => {
    // Check if refs are properly initialized
    const areRefsReady = !!chatContainerRef && !!mobileChatContainerRef;
    if (areRefsReady) {
      setRefsInitialized(true);
      console.log("Chat container refs initialized");
    }
  }, [chatContainerRef, mobileChatContainerRef]);

  // GUARANTEED scroll to bottom function - memoized with useCallback
  const guaranteedScrollToBottom = React.useCallback(() => {
    console.log("ATTEMPTING SCROLL TO BOTTOM"); // Debug log
    
    // Function for direct DOM scrolling
    const scrollNow = () => {
      // Scroll desktop container
      if (chatContainerRef && chatContainerRef.current) {
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
      if (mobileChatContainerRef && mobileChatContainerRef.current) {
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
  }, [chatContainerRef, mobileChatContainerRef]);
  
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
    if (chatHistory && chatHistory.length > 0) {
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
    // Don't proceed if the ref isn't defined or if its current property is null
    if (!mobileChatContainerRef || !mobileChatContainerRef.current) {
      console.log("Mobile chat container ref not available yet");
      return;
    }
    
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
  }, [mobileChatContainerRef, guaranteedScrollToBottom]); // Include guaranteedScrollToBottom in dependencies

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
    // Don't attempt to scroll if refs aren't initialized
    if (!refsInitialized) {
      console.log("Refs not initialized yet, skipping initial scroll");
      return;
    }

    // Initial scroll to bottom when component mounts
    console.log("Component mounted, attempting initial scroll");
    guaranteedScrollToBottom();
    
    // Also set a timeout to scroll after initial render
    const timer = setTimeout(() => {
      guaranteedScrollToBottom();
    }, 300);
    
    // Clean up timeouts
    return () => {
      clearTimeout(timer);
    };
  }, [guaranteedScrollToBottom, refsInitialized]);

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
    if (isGenerating && chatHistory && chatHistory.length > 0) {
      // Only scroll to bottom if needed - don't add additional typing indicators here
      // We already have typing indicators in the chat history or at the end of the chat
      if (chatContainerRef || mobileChatContainerRef) {
        guaranteedScrollToBottom();
      }
    }
  }, [isGenerating, chatHistory, guaranteedScrollToBottom, chatContainerRef, mobileChatContainerRef]);

  // Define conditional textarea classes without scrollbar classes
  const promptTextAreaClass = `w-full rounded-xl border px-4 pb-4 pt-3 pr-14 text-sm focus:ring-2 focus:ring-primary/50 focus:border-transparent resize-none ${
    documentSummary ? 'h-[120px]' : 'h-[72px]'
  } transition-all duration-200 ease-in-out focus:placeholder:text-transparent overflow-y-auto break-words overflow-x-hidden no-scrollbar ${
    isDarkMode 
      ? "border-[#343030]/60 bg-[#282424]/70 backdrop-blur-sm text-white placeholder:text-gray-500" 
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
            ? "bg-[#201c1c]/85 border-[#343030]/60" 
            : "bg-[#e8dccc]/90 border-[#b8a990] shadow-sm"
        }`}
        style={{
          position: 'absolute',
          height: 'calc(100% - 4rem)', // updated height calculation - removed gradient line height
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
                  ? "bg-[#282424] text-white hover:bg-[#343030]"
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
                onClick={() => {
                  const newMode = editorMode === 'chat' ? 'code' : 'chat';
                  setEditorMode(newMode);
                  // If switching to code mode, ensure editor theme is set correctly after a short delay
                  if (newMode === 'code') {
                    setTimeout(() => {
                      if (window.monaco) {
                        window.monaco.editor.setTheme(isDarkMode ? 'vs-dark' : 'vs');
                        // Also try to update the editor background directly
                        try {
                          const editorElement = document.querySelector('.monaco-editor');
                          if (editorElement) {
                            (editorElement as HTMLElement).style.backgroundColor = isDarkMode ? '#111827' : '#e8dccc';
                          }
                        } catch (err) {
                          console.error('Error updating editor background:', err);
                        }
                      }
                    }, 50);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg transition-colors text-xs font-medium flex items-center space-x-2 ${
                  isDarkMode 
                    ? "bg-[#282424] hover:bg-[#343030] text-gray-300"
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
                  isDarkMode ? "hover:bg-[#282424]" : "hover:bg-[#d8cbb8]"
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
              className="h-full overflow-y-auto scroll-smooth chat-scroll-container relative"
              style={{ 
                scrollBehavior: 'smooth',
                height: 'calc(100% - 120px)',
                minHeight: chatHistory && chatHistory.length > 0 ? '300px' : '60px',
              }}
            >
              {/* Welcome Message */}
              {(!chatHistory || chatHistory.length === 0) && (
                <div className="absolute top-0 left-0 right-0 flex items-start p-1 mt-1">
                  <div
                    className={`flex-1 mx-2 rounded-lg py-1.5 px-3 shadow-sm ${
                      isDarkMode 
                        ? "bg-[#282424]/80 backdrop-blur-sm border border-[#343030]/60" 
                        : "bg-[#c8bba8] border border-[#b8a990]"
                    }`}
                    style={{ maxHeight: "50px", overflow: "hidden" }}
                  >
                    <p
                      className={`text-xs ${isDarkMode ? "text-gray-300" : "text-[#4a3c2c] font-medium"}`}
                    >
                      Hello! Describe what you'd like to create or modify in your diagram.
                    </p>
                  </div>
                </div>
              )}

              {/* Chat History */}
              {chatHistory && chatHistory.length > 0 && chatHistory.map((message, index) => {
                // Debug logging for all user messages with diagram versions
                if (message.role === 'user' && message.diagramVersion) {
                  const versionLength = message.diagramVersion?.length || 0;
                  const msgId = message.messageId || `no-id-${index}`;
                  console.log(`User message with diagram version found [${msgId}]: ${versionLength} chars`);
                }
                
                // Check if this is the first user message
                const isFirstMsg = index === 0 || 
                  (index > 0 && 
                   message.role === 'user' && 
                   chatHistory.slice(0, index).every(m => m.role !== 'user'));
                
                const safeTimestamp = message.timestamp || Date.now();

                // Create clean copy of diagram version to avoid reference issues
                let messageVersion = undefined;
                if (message.diagramVersion) {
                  try {
                    // Safely clone diagram version (which is a string)
                    messageVersion = String(message.diagramVersion);
                  } catch (e) {
                    console.error('Error cloning diagram version', e);
                  }
                }

                // Create clean copy of diagram_img to avoid reference issues
                let messageDiagramImg = undefined;
                if (message.diagram_img) {
                  try {
                    // Safely clone diagram_img (which is a string)
                    messageDiagramImg = String(message.diagram_img);
                  } catch (e) {
                    console.error('Error cloning diagram_img', e);
                  }
                }

                return (
                  <div key={`${message.messageId || index}-${message.content.substring(0, 10)}`} className="message-container">
                    <ChatMessage
                      message={{
                        ...message,
                        // Ensure we're passing a clean copy of the diagram version, not a reference
                        diagramVersion: messageVersion,
                        // Ensure we're passing the diagram_img
                        diagram_img: messageDiagramImg,
                        // Just use current timestamp if there's an issue
                        timestamp: Date.now()
                      }} 
                      onDiagramVersionSelect={onDiagramVersionSelect}
                      onRetry={onRetry}
                      isDarkMode={!!isDarkMode}
                      isFirstUserMessage={!!isFirstMsg}
                      messageIndex={index}
                      onReaction={(messageIndex: number, reaction: string) => {
                        console.log(`Adding reaction ${reaction} to message ${messageIndex}`);
                        // This would be implemented in the parent component
                        // Since we can't modify chatHistory directly, this would need to be
                        // implemented in the parent component
                      }}
                    />
                  </div>
                );
              })}
              
              {/* Add typing indicator at the end when generating */}
              {isGenerating && !chatHistory.some(msg => msg.isTyping) && (
                <div className="flex justify-start mb-4 animate-fadeIn">
                  <div className={`max-w-[85%] rounded-2xl py-3 px-4 ${
                    isDarkMode 
                      ? "bg-[#282424]/80 backdrop-blur-sm text-white shadow-md" 
                      : "bg-[#c8bba8] text-[#4a3c2c] shadow-sm"
                  }`}>
                    <div className="flex space-x-2 items-center h-5">
                      <div 
                        className={`w-2 h-2 rounded-full border-0 ${isDarkMode ? 'bg-blue-400' : 'bg-primary'}`}
                        style={{ 
                          animation: 'typingAnimationPanel 1.4s infinite ease-in-out',
                          animationDelay: '0ms' 
                        }}
                      ></div>
                      <div 
                        className={`w-2 h-2 rounded-full border-0 ${isDarkMode ? 'bg-blue-400' : 'bg-primary'}`}
                        style={{ 
                          animation: 'typingAnimationPanel 1.4s infinite ease-in-out',
                          animationDelay: '160ms' 
                        }}
                      ></div>
                      <div 
                        className={`w-2 h-2 rounded-full border-0 ${isDarkMode ? 'bg-blue-400' : 'bg-primary'}`}
                        style={{ 
                          animation: 'typingAnimationPanel 1.4s infinite ease-in-out',
                          animationDelay: '320ms' 
                        }}
                      ></div>
                    </div>
                    <style jsx>{`
                      @keyframes typingAnimationPanel {
                        0% { 
                          transform: translateY(0px);
                          opacity: 0.3;
                        }
                        50% { 
                          transform: translateY(-4px);
                          opacity: 1;
                        }
                        100% { 
                          transform: translateY(0px);
                          opacity: 0.3;
                        }
                      }
                    `}</style>
                  </div>
                </div>
              )}
            </div>
            
            {/* Prompt Form */}
            <div className={`p-4 border-t ${isDarkMode ? "border-gray-700/60" : "border-[#b8a990]"}`}>
              <form onSubmit={(e) => handleGenerateAndCollapse(e)} className="w-full relative">
                {isGenerating && <GeneratingIndicator isDarkMode={isDarkMode} message={generatingMessage} />}
                
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Type a message..."
                  className={promptTextAreaClass}
                  disabled={isGenerating}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerateAndCollapse(null);
                    }
                  }}
                />
                
                {/* Upload button */}
                <div className="absolute right-14 bottom-3.5">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowFileUpload(!showFileUpload)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkMode
                          ? "hover:bg-gray-700 text-gray-400 hover:text-gray-300"
                          : "hover:bg-[#d8cbb8] text-[#8a7a66] hover:text-[#6a5c4c]"
                      } ${isGenerating ? "opacity-40 cursor-not-allowed" : ""}`}
                      disabled={isGenerating}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* File Upload Menu */}
                    {showFileUpload && (
                      <FileUploadOptions 
                        handleFileUpload={wrappedHandleFileUpload}
                        handleImageUpload={wrappedHandleImageUpload}
                        processWebsite={processWebsite}
                        isDarkMode={isDarkMode}
                        isProcessingFile={isProcessingFile || false}
                        isProcessingImage={isProcessingImage || false}
                        showFileUpload={showFileUpload}
                        setShowFileUpload={setShowFileUpload}
                      />
                    )}
                  </div>
                </div>
                
                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isGenerating || !prompt.trim()}
                  className={`absolute right-3 bottom-3.5 p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? "bg-[#282424] hover:bg-[#343030] text-blue-400 hover:text-blue-300"
                      : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#5a4c3c] hover:text-[#4a3c2c]"
                  } ${(!prompt.trim() || isGenerating) ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <div 
              className={`h-full overflow-y-auto scroll-smooth ${
                isDarkMode ? "bg-gray-900" : "bg-[#e8dccc]"
              }`}
              style={{
                backgroundColor: isDarkMode ? '#111827' : '#e8dccc'
              }}
            >
              <div className="p-4">
                <h3 className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-[#6a5c4c]"}`}>
                  Mermaid Diagram Code
                </h3>
                
                <Editor
                  height="calc(100vh - 12rem)"
                  width="100%"
                  language="javascript"
                  value={currentDiagram}
                  onChange={(value) => {
                    if (value !== undefined && handleCodeChange) {
                      setCurrentDiagram(value);
                      handleCodeChange(value);
                    }
                  }}
                  options={{
                    ...monacoOptions,
                    theme: isDarkMode ? 'vs-dark' : 'vs',
                    backgroundColor: isDarkMode ? '#111827' : '#e8dccc'
                  }}
                  onMount={(editor) => {
                    editorRef.current = editor;
                    setIsEditorReady(true);
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default PromptPanel;