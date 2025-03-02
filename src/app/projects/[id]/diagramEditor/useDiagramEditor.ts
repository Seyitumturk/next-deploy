import { useState, useEffect, useRef } from 'react';
import useLocalStorage from '@/lib/useLocalStorage';
import { EditorProps, MermaidTheme } from './types';
import { ChatMessageData, ChatMessageUtils } from '../chatMessage';

// Import specialized hooks
import useHistory from './hooks/useHistory';
import useDiagramRendering from './hooks/useDiagramRendering';
import useDiagramExport from './hooks/useDiagramExport';
import useZoomAndPan from './hooks/useZoomAndPan';
import useFileProcessing from './hooks/useFileProcessing';
import useImageProcessing from './hooks/useImageProcessing';

function useDiagramEditor({ projectId, projectTitle, diagramType, initialDiagram, user, history: initialHistory }: EditorProps) {
  // --- Core state ---
  const [prompt, setPrompt] = useState('');
  const [lastPrompt, setLastPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showPromptPanel, setShowPromptPanel] = useState(true);
  const [svgOutput, setSvgOutput] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [versionId, setVersionId] = useState<string>('');
  const [isVersionSelectionInProgress, setIsVersionSelectionInProgress] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [editorMode, setEditorMode] = useState<'chat' | 'code'>('chat');
  const [documentSummary, setDocumentSummary] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // --- Theme state ---
  const [currentTheme, setCurrentTheme] = useLocalStorage<MermaidTheme>('mermaid-theme', 'default');
  const [isDarkMode, setIsDarkMode] = useLocalStorage('dark-mode', false);

  // --- Loading and error states ---
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // Add a state to track when chat history is loading
  const [isChatHistoryLoading, setIsChatHistoryLoading] = useState(false);
  
  // Add a ref to track the current SVG output for saving
  const latestSvgRef = useRef<string>('');

  // --- Refs ---
  const diagramRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // --- Module imports ---
  const { 
    currentDiagram, 
    setCurrentDiagram, 
    diagramHistory, 
    setDiagramHistory,
    updateHistory
  } = useHistory({ initialDiagram, initialHistory });

  const {
    renderDiagram,
    handleCodeChange,
    changeTheme,
  } = useDiagramRendering({
    currentDiagram,
    setCurrentDiagram,
    setSvgOutput: (svg: string | ((prevSvg: string) => string)) => {
      // Handle both string and function updates and keep our ref updated
      if (typeof svg === 'function') {
        setSvgOutput(prevSvg => {
          const newSvg = svg(prevSvg);
          latestSvgRef.current = newSvg;
          return newSvg;
        });
      } else {
        // It's a direct string value
        latestSvgRef.current = svg;
        setSvgOutput(svg);
      }
    },
    setVersionId,
    setRenderError,
    currentTheme,
    setCurrentTheme,
    diagramType
  });

  const {
    scale, 
    setScale, 
    position, 
    setPosition,
    isDragging,
    setIsDragging,
    handleMouseDown
  } = useZoomAndPan();

  const {
    downloadSVG,
    downloadPNG,
  } = useDiagramExport({
    projectTitle,
    svgRef,
    svgOutput,
    setIsDownloading,
    diagramType
  });

  const {
    processDocument: originalProcessDocument,
    processWebsite,
    handleFileUpload
  } = useFileProcessing({
    setPrompt,
    setError
  });

  // Wrap the processDocument function to update documentSummary
  const processDocument = async (text: string) => {
    setDocumentSummary(text);
    return originalProcessDocument(text);
  };

  const {
    processImage,
    handleImageUpload
  } = useImageProcessing({
    setIsUploadingImage,
    setPrompt,
    setError
  });

  // --- Handle generate diagram ---
  const handleGenerateDiagram = async (e: React.FormEvent<HTMLFormElement> | null, initialPrompt?: string) => {
    if (e) e.preventDefault();
    
    const promptToUse = initialPrompt || prompt;
    if (!promptToUse.trim()) return;
    
    console.log(`[handleGenerateDiagram] Processing prompt: "${promptToUse.substring(0, 50)}${promptToUse.length > 50 ? '...' : ''}"`);
    console.log(`[handleGenerateDiagram] Current diagram exists: ${!!currentDiagram}, SVG exists: ${!!svgOutput}, SVG length: ${svgOutput?.length || 0}`);
    
    setIsGenerating(true);
    setError('');
    setLastPrompt(promptToUse);
    
    // Add user message
    const userMessage: ChatMessageData = {
      role: 'user',
      content: promptToUse,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Add AI typing indicator message
    const typingMessage: ChatMessageData = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true,
    };
    
    setMessages(prev => [...prev, typingMessage]);

    try {
      // Get current messages for context
      const currentMessages = [...messages, userMessage];

      console.log(`[handleGenerateDiagram] Calling /api/diagrams API endpoint with projectId: ${projectId}, diagramType: ${diagramType}`);
      console.log(`[handleGenerateDiagram] Including SVG in request: ${!!svgOutput}, SVG length: ${svgOutput?.length || 0}`);
      
      // Call API to generate diagram with streaming response
      const response = await fetch('/api/diagrams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          textPrompt: promptToUse,
          diagramType,
          clientSvg: svgOutput || '',
          chatHistory: currentMessages,
        }),
      });

      console.log(`[handleGenerateDiagram] API response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to generate diagram: ${response.status}`);
      }

      // Check if response is a stream
      const contentType = response.headers.get('content-type');
      console.log(`[handleGenerateDiagram] Response content type: ${contentType}`);
      
      if (contentType && contentType.includes('text/event-stream')) {
        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Response body is not readable');
        
        const decoder = new TextDecoder();
        let receivedDiagram = '';
        let explanation = '';
        let isComplete = false;
        
        while (!isComplete) {
          const { done, value } = await reader.read();
          
          if (done) {
            isComplete = true;
            break;
          }
          
          // Process the chunk
          const chunk = decoder.decode(value, { stream: true });
          
          // Properly handle SSE format - split by double newlines for event boundaries
          // and then by single newlines for data lines
          const events = chunk.split(/\n\n+/);
          
          for (const event of events) {
            if (!event.trim()) continue;
            
            // Extract data lines from the event
            const lines = event.split('\n');
            
            for (const line of lines) {
              if (line.trim().startsWith('data:')) {
                try {
                  // Extract JSON from "data: {json}"
                  const jsonStr = line.trim().substring(5).trim();
                  if (!jsonStr) continue;
                  
                  const data = JSON.parse(jsonStr);
                  
                  // If we got mermaid syntax, update the diagram
                  if (data.mermaidSyntax) {
                    receivedDiagram = data.mermaidSyntax;
                    // Update current diagram in real-time if we have syntax
                    setCurrentDiagram(receivedDiagram);
                    // Render the updated diagram immediately
                    const renderSuccess = await renderDiagram(receivedDiagram);
                    console.log(`[handleGenerateDiagram] Diagram rendered successfully: ${renderSuccess}, SVG length after render: ${svgOutput?.length || 0}`);
                    
                    // If we still don't have SVG output after rendering, try rendering again
                    if ((!svgOutput || svgOutput.length === 0) && renderSuccess) {
                      console.log(`[handleGenerateDiagram] Initial render didn't produce SVG, rendering again`);
                      setTimeout(() => {
                        renderDiagram(receivedDiagram);
                      }, 200);
                    }
                  }
                  
                  if (data.explanation) {
                    explanation = data.explanation;
                  }
                  
                  if (data.isComplete && data.gptResponseId) {
                    console.log(`[handleGenerateDiagram] Stream complete, gptResponseId: ${data.gptResponseId}`);
                    isComplete = true;
                    
                    // Wait a moment for final rendering to complete, then save the SVG
                    setTimeout(async () => {
                      // Use the latest SVG from our ref to ensure we have the most recent version
                      const currentSvg = latestSvgRef.current || svgOutput;
                      
                      if (currentSvg && currentSvg.length > 0) {
                        console.log(`[handleGenerateDiagram] Saving SVG separately after stream completion, SVG length: ${currentSvg.length}`);
                        try {
                          const saveSvgResponse = await fetch('/api/diagrams/save-svg', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              projectId,
                              gptResponseId: data.gptResponseId,
                              svg: currentSvg
                            }),
                          });
                          console.log(`[handleGenerateDiagram] SVG save response status: ${saveSvgResponse.status}`);
                          
                          if (saveSvgResponse.ok) {
                            console.log('[handleGenerateDiagram] SVG saved successfully');
                          } else {
                            console.error('[handleGenerateDiagram] Failed to save SVG:', await saveSvgResponse.text());
                          }
                        } catch (error) {
                          console.error('[handleGenerateDiagram] Error saving SVG:', error);
                        }
                      } else {
                        console.log('[handleGenerateDiagram] No SVG available to save after stream completion, trying again in 1 second');
                        
                        // Try one more time after another delay
                        setTimeout(async () => {
                          const finalSvg = latestSvgRef.current || svgOutput;
                          if (finalSvg && finalSvg.length > 0) {
                            console.log(`[handleGenerateDiagram] Second attempt - Saving SVG after delay, length: ${finalSvg.length}`);
                            try {
                              const saveSvgResponse = await fetch('/api/diagrams/save-svg', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  projectId,
                                  gptResponseId: data.gptResponseId,
                                  svg: finalSvg
                                }),
                              });
                              console.log(`[handleGenerateDiagram] Second attempt SVG save response: ${saveSvgResponse.status}`);
                            } catch (error) {
                              console.error('[handleGenerateDiagram] Error in second attempt to save SVG:', error);
                            }
                          } else {
                            console.error('[handleGenerateDiagram] Still no SVG available after second attempt');
                          }
                        }, 1000);
                      }
                    }, 2000); // Increased delay to 2 seconds
                  }
                  
                  if (data.error) {
                    throw new Error(data.error);
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e, line);
                }
              }
            }
          }
        }
        
        // Use the received diagram
        const newDiagram = receivedDiagram;
        console.log(`[handleGenerateDiagram] Received final diagram code, length: ${newDiagram.length}`);
        console.log(`[handleGenerateDiagram] Current SVG output length: ${svgOutput?.length || 0}`);
        
        // Remove typing indicator and add real AI response
        const aiMessage: ChatMessageData = {
          role: 'assistant',
          content: explanation || 'Here is your updated diagram.',
          timestamp: new Date(),
          diagramVersion: newDiagram,
        };
        
        setMessages(prev => prev.filter(msg => !msg.isTyping).concat(aiMessage));
        
        // Update history in database
        console.log(`[handleGenerateDiagram] Calling updateHistory with promptToUse: ${promptToUse.substring(0, 30)}..., newDiagram length: ${newDiagram.length}, type: chat`);
        await updateHistory({
          prompt: promptToUse,
          diagram: newDiagram,
          diagram_img: svgOutput,
          updateType: 'chat'
        });
        
        // Clear prompt
        setPrompt('');
      } else {
        // Fallback to regular JSON response if not streaming
        const data = await response.json();
        console.log(`[handleGenerateDiagram] Received non-streaming response, contains mermaidSyntax: ${!!data.mermaidSyntax}, contains extractedSyntax: ${!!data.extractedSyntax}`);
        
        // Update diagram and chat history
        const newDiagram = data.mermaidSyntax || data.extractedSyntax;
        setCurrentDiagram(newDiagram);
        
        // Remove typing indicator and add real AI response
        const aiMessage: ChatMessageData = {
          role: 'assistant',
          content: data.explanation || 'Here is your updated diagram.',
          timestamp: new Date(),
          diagramVersion: newDiagram,
        };
        
        setMessages(prev => prev.filter(msg => !msg.isTyping).concat(aiMessage));
        
        // Update history in database
        console.log(`[handleGenerateDiagram] Calling updateHistory with promptToUse: ${promptToUse.substring(0, 30)}..., newDiagram length: ${newDiagram.length}, type: chat`);
        await updateHistory({
          prompt: promptToUse,
          diagram: newDiagram,
          diagram_img: svgOutput,
          updateType: 'chat'
        });
        
        // Clear prompt
        setPrompt('');
        
        // Render the diagram
        renderDiagram(newDiagram);
      }
    } catch (err: any) {
      console.error(`[handleGenerateDiagram] Error generating diagram:`, err);
      setError(err.message || 'An error occurred');
      
      // Remove typing indicator and add error message
      const errorMessage: ChatMessageData = {
        role: 'assistant',
        content: 'Sorry, I encountered an error while generating your diagram.',
        timestamp: new Date(),
        error: err.message,
      };
      
      setMessages(prev => prev.filter(msg => !msg.isTyping).concat(errorMessage));
    } finally {
      setIsGenerating(false);
    }
  };

  // Use a wrapper around handleDiagramVersionSelect to maintain backward compatibility
  const handleDiagramVersionSelect = async (version: string): Promise<void> => {
    try {
      setIsVersionSelectionInProgress(true);
      
      // Use the selected version as the current diagram
      setCurrentDiagram(version);
      
      // Render the selected version
      await renderDiagram(version);
      
    } catch (error) {
      console.error('Error selecting diagram version:', error);
      setError('Failed to load diagram version');
    } finally {
      setIsVersionSelectionInProgress(false);
    }
  };

  // Function to load chat history
  const loadChatHistory = async () => {
    try {
      setIsChatHistoryLoading(true);
      
      const response = await fetch(`/api/project-history/messages?projectId=${projectId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to load chat history: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.chatMessages && data.chatMessages.length > 0) {
        // Convert dates to Date objects
        const formattedMessages = data.chatMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        
        setMessages(formattedMessages);
      }
    } catch (err) {
      console.error('Error loading chat history:', err);
      // Don't show an error to the user, just log it
    } finally {
      setIsChatHistoryLoading(false);
    }
  };

  // Initial setup effect
  useEffect(() => {
    if (currentDiagram) {
      renderDiagram(currentDiagram);
    }
    
    // Load chat history
    loadChatHistory();
  }, []);

  return {
    // State
    prompt,
    setPrompt,
    lastPrompt,
    isGenerating,
    error,
    showPromptPanel,
    setShowPromptPanel,
    svgOutput,
    messages,
    chatHistory: messages,
    currentDiagram,
    setCurrentDiagram,
    diagramHistory,
    currentTheme,
    isDarkMode,
    setIsDarkMode,
    renderError,
    isDownloading,
    isUploadingImage,
    scale,
    position,
    isDragging,
    dragStart,
    setDragStart,
    versionId,
    isVersionSelectionInProgress,
    setIsVersionSelectionInProgress,
    isEditorReady,
    setIsEditorReady,
    editorMode,
    setEditorMode,
    documentSummary,
    showFileUpload,
    setShowFileUpload,
    isProcessingFile,
    isProcessingImage: isUploadingImage,
    showExportMenu,
    setShowExportMenu,
    isLoading,
    isChatHistoryLoading,
    
    // Refs
    diagramRef,
    svgRef,
    chatContainerRef,
    
    // Functions
    renderDiagram,
    handleCodeChange,
    handleGenerateDiagram,
    downloadSVG,
    downloadPNG,
    changeTheme,
    processDocument,
    processWebsite,
    handleFileUpload,
    processImage,
    handleImageUpload,
    handleMouseDown,
    setIsDragging,
    setPosition,
    setScale,
    updateHistory,
    handleDiagramVersionSelect,
  };
}

export default useDiagramEditor; 