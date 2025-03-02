import { useState, useEffect, useRef, useCallback } from 'react';
import useLocalStorage from '@/lib/useLocalStorage';
import { EditorProps, MermaidTheme } from './types';
import { ChatMessageData } from '../chatMessage/types';

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
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showPromptPanel, setShowPromptPanel] = useState(true);
  const [svgOutput, _setSvgOutput] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [versionId, setVersionId] = useState<string>('');
  const [isVersionSelectionInProgress, setIsVersionSelectionInProgress] = useState<boolean>(false);
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
  
  // Add a ref to always track the latest SVG to ensure it's available for saves
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

  // Create a wrapper for setSvgOutput that also updates the ref
  const setSvgOutput = useCallback((value: React.SetStateAction<string>) => {
    if (typeof value === 'function') {
      _setSvgOutput(prevSvg => {
        const newSvg = value(prevSvg);
        if (newSvg && newSvg.length > 0) {
          latestSvgRef.current = newSvg;
          console.log(`[setSvgOutput] Updated latestSvgRef with SVG, length: ${newSvg.length}`);
        }
        return newSvg;
      });
    } else {
      // It's a direct string value
      if (value && value.length > 0) {
        latestSvgRef.current = value;
        console.log(`[setSvgOutput] Updated latestSvgRef with SVG, length: ${value.length}`);
      }
      _setSvgOutput(value);
    }
  }, []);

  // Function to persist history changes to the database
  const persistHistory = async (historyData: {
    prompt?: string;
    diagram: string;
    diagram_img?: string;
    updateType: 'chat' | 'code' | 'reversion';
  }) => {
    try {
      console.log(`[persistHistory] Persisting diagram to database, projectId: ${projectId}`);
      const response = await fetch('/api/project-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          ...historyData
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save history: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`[persistHistory] History saved successfully:`, data);
      return true;
    } catch (error) {
      console.error(`[persistHistory] Error saving history:`, error);
      return false;
    }
  };

  const {
    renderDiagram,
    handleCodeChange,
    changeTheme,
  } = useDiagramRendering({
    currentDiagram,
    setCurrentDiagram,
    setSvgOutput,
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

  // Add new states for retry functionality
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [retryAttempt, setRetryAttempt] = useState<number>(0);
  const [lastErrorMessage, setLastErrorMessage] = useState<string>('');
  const MAX_AUTO_RETRIES = 1; // Auto-retry only once

  // Modify the handleGenerateDiagram function to enhance error handling and retry logic
  const handleGenerateDiagram = async (e: React.FormEvent<HTMLFormElement> | null, initialPrompt?: string, isRetry: boolean = false, failureReason?: string) => {
    if (e) e.preventDefault();
    
    // Clear any previous errors
    setError('');
    
    // Get the prompt value
    const promptToUse = initialPrompt || prompt;
    
    // Store last prompt for retry functionality
    setLastPrompt(promptToUse);
    
    // Don't proceed if no prompt or if currently generating or retrying
    if (!promptToUse || isGenerating) {
      return;
    }
    
    // Update retry state
    if (isRetry) {
      setIsRetrying(true);
      setRetryAttempt(prev => prev + 1);
    } else {
      setRetryAttempt(0);
      setIsRetrying(false);
    }

    setIsGenerating(true);
    
    // Add user message to chat
    const userMessage: ChatMessageData = {
      role: 'user',
      content: promptToUse,
      timestamp: new Date(),
    };
    
    // Add typing indicator message
    const typingMessage: ChatMessageData = {
      role: 'assistant',
      content: 'Generating your diagram...',
      timestamp: new Date(),
      isTyping: true,
      isRetrying: isRetry,
    };
    
    // Only add user message if it's not a retry attempt
    if (!isRetry) {
      setMessages(prev => [...prev, userMessage, typingMessage]);
    } else {
      // If it's a retry, add a retry notification and a new typing indicator
      const retryNotification: ChatMessageData = {
        role: 'system',
        content: 'Retrying diagram generation with a fresh approach...',
        timestamp: new Date(),
        isSystemNotification: true,
      };
      
      // Replace the last typing message with the retry notification and a new typing indicator
      setMessages(prev => {
        // Filter out the previous typing message
        const withoutTyping = prev.filter(msg => !msg.isTyping);
        // Add the retry notification and a new typing indicator
        return [...withoutTyping, retryNotification, typingMessage];
      });
    }

    try {
      // Use currentMessagesForContext to prepare chat history
      // but skip the last two messages (user prompt and typing indicator)
      // so we don't duplicate them in the request
      const currentMessagesForContext = isRetry 
        ? messages.filter(msg => !msg.isRetrying && !msg.isTyping) // Filter out retry notifications and typing indicators
        : messages.slice(0, -2);

      // Configure request options
      const options: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          textPrompt: promptToUse,
          diagramType,
          projectId,
          clientSvg: svgOutput,
          chatHistory: currentMessagesForContext,
          isRetry: isRetry,
          clearCache: isRetry, // Clear cache on retry attempts
          failureReason: failureReason || lastErrorMessage, // Pass the failure reason to the API
        }),
      };

      console.log(`[handleGenerateDiagram] Calling /api/diagrams API endpoint with projectId: ${projectId}, diagramType: ${diagramType}`);
      console.log(`[handleGenerateDiagram] Including SVG in request: ${!!svgOutput}, SVG length: ${svgOutput?.length || 0}`);
      
      // Call API to generate diagram with streaming response
      const response = await fetch('/api/diagrams', options);

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
        let hasError = false;
        let errorMessage = '';
        let needsRetry = false;
        
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
                  
                  // Check for errors first
                  if (data.error) {
                    hasError = true;
                    errorMessage = data.errorMessage || 'Failed to generate diagram';
                    needsRetry = data.needsRetry || false;
                    isComplete = data.isComplete || false;
                    
                    // If we have a partial diagram, save it for reference
                    if (data.mermaidSyntax) {
                      receivedDiagram = data.mermaidSyntax;
                    }
                    
                    if (isComplete) {
                      throw new Error(errorMessage);
                    }
                    continue;
                  }
                  
                  // If we got mermaid syntax, update the diagram
                  if (data.mermaidSyntax) {
                    receivedDiagram = data.mermaidSyntax;
                    // Update current diagram in real-time if we have syntax
                    setCurrentDiagram(receivedDiagram);
                    // Render the updated diagram immediately
                    const renderSuccess = await renderDiagram(receivedDiagram);
                    console.log(`[handleGenerateDiagram] Diagram rendered successfully: ${renderSuccess}, SVG length after render: ${svgOutput?.length || 0}`);
                    
                    // Track successful renders for improved save reliability
                    if (renderSuccess && svgOutput && svgOutput.length > 0) {
                      console.log(`[handleGenerateDiagram] Successfully rendered diagram with SVG length: ${svgOutput.length}`);
                      latestSvgRef.current = svgOutput; // Explicitly update the ref for safety
                    }
                    
                    // If we still don't have SVG output after rendering, try rendering again with increased delay
                    if ((!svgOutput || svgOutput.length === 0) && renderSuccess) {
                      console.log(`[handleGenerateDiagram] Initial render didn't produce SVG, rendering again`);
                      setTimeout(async () => {
                        const reRenderSuccess = await renderDiagram(receivedDiagram);
                        console.log(`[handleGenerateDiagram] Re-render result: ${reRenderSuccess}, SVG length: ${svgOutput?.length || 0}`);
                        if (reRenderSuccess && svgOutput && svgOutput.length > 0) {
                          latestSvgRef.current = svgOutput;
                        }
                      }, 500); // Increased from 200ms to 500ms for better reliability
                    }
                  }
                  
                  if (data.explanation) {
                    explanation = data.explanation;
                  }
                  
                  if (data.isComplete && data.gptResponseId) {
                    console.log(`[handleGenerateDiagram] Stream complete, gptResponseId: ${data.gptResponseId}`);
                    isComplete = true;
                    
                    // Immediately save the current SVG if available
                    const immediateCurrentSvg = svgOutput || latestSvgRef.current;
                    if (immediateCurrentSvg && immediateCurrentSvg.length > 0) {
                      console.log(`[handleGenerateDiagram] Saving immediate SVG, length: ${immediateCurrentSvg.length}`);
                      try {
                        const saveSvgResponse = await fetch('/api/diagrams/save-svg', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            projectId,
                            gptResponseId: data.gptResponseId,
                            svg: immediateCurrentSvg
                          }),
                        });
                        console.log(`[handleGenerateDiagram] Immediate SVG save response: ${saveSvgResponse.status}`);
                      } catch (error) {
                        console.error('[handleGenerateDiagram] Error saving immediate SVG:', error);
                      }
                    }
                    
                    // Wait a moment for final rendering to complete, then save the SVG again
                    setTimeout(async () => {
                      // Get the most recent SVG output
                      const currentSvg = svgOutput || latestSvgRef.current;
                      
                      // Perform one final render attempt if needed
                      if (!currentSvg || currentSvg.length === 0) {
                        console.log(`[handleGenerateDiagram] No SVG available at stream completion, attempting final render`);
                        if (receivedDiagram && receivedDiagram.length > 0) {
                          const finalRenderSuccess = await renderDiagram(receivedDiagram);
                          console.log(`[handleGenerateDiagram] Final render attempt result: ${finalRenderSuccess}, svg length now: ${svgOutput?.length || 0}`);
                          // Update latest SVG ref after final render
                          if (svgOutput && svgOutput.length > 0) {
                            latestSvgRef.current = svgOutput;
                          }
                        }
                      }
                      
                      // Now try to save whatever SVG we have
                      const svgToSave = svgOutput || latestSvgRef.current;
                      if (svgToSave && svgToSave.length > 0) {
                        console.log(`[handleGenerateDiagram] Saving SVG separately after stream completion, SVG length: ${svgToSave.length}`);
                        try {
                          const saveSvgResponse = await fetch('/api/diagrams/save-svg', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              projectId,
                              gptResponseId: data.gptResponseId,
                              svg: svgToSave
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
                          // Force one last render attempt before final save
                          if (receivedDiagram) {
                            await renderDiagram(receivedDiagram);
                          }
                          
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
                        }, 1500); // Increased from 1000ms to 1500ms for better reliability
                      }
                    }, 2500); // Increased from 2000ms to 2500ms for better reliability
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e, line);
                  // Only propagate critical errors, not parsing issues at the end of stream
                  if (!isRetry && line.includes('error') && !isComplete) {
                    throw new Error('Failed to parse diagram data');
                  } else {
                    // For errors at the end of streaming, just log them but don't propagate
                    // This prevents unnecessary retries when the diagram is actually valid
                    console.log('[handleGenerateDiagram] Non-critical parse error, continuing');
                  }
                }
              }
            }
          }
        }
        
        // Use the received diagram
        const newDiagram = receivedDiagram;
        console.log(`[handleGenerateDiagram] Received final diagram code, length: ${newDiagram.length}`);
        console.log(`[handleGenerateDiagram] Current SVG output length: ${svgOutput?.length || 0}`);
        
        // Only proceed with saving if we have a valid diagram
        if (!newDiagram || newDiagram.trim().length === 0) {
          throw new Error('Generated diagram is empty');
        }
        
        // Remove typing indicator and add real AI response
        const aiMessage: ChatMessageData = {
          role: 'assistant',
          content: explanation || 'Here is your updated diagram.',
          timestamp: new Date(),
          diagramVersion: newDiagram,
        };
        
        // Remove all typing indicators and add the real response
        setMessages(prev => prev.filter(msg => !msg.isTyping).concat(aiMessage));
        
        // Update history in database only for successful diagrams
        console.log(`[handleGenerateDiagram] Calling updateHistory with promptToUse: ${promptToUse.substring(0, 30)}..., newDiagram length: ${newDiagram.length}, type: chat`);
        await updateHistory({
          prompt: promptToUse,
          diagram: newDiagram,
          diagram_img: svgOutput || latestSvgRef.current,
          updateType: 'chat'
        });
        
        // Persist history to database
        await persistHistory({
          prompt: promptToUse,
          diagram: newDiagram,
          diagram_img: svgOutput || latestSvgRef.current,
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
        
        // Remove all typing indicators and add the real response
        setMessages(prev => prev.filter(msg => !msg.isTyping).concat(aiMessage));
        
        // Update history in database
        console.log(`[handleGenerateDiagram] Calling updateHistory with promptToUse: ${promptToUse.substring(0, 30)}..., newDiagram length: ${newDiagram.length}, type: chat`);
        await updateHistory({
          prompt: promptToUse,
          diagram: newDiagram,
          diagram_img: svgOutput || latestSvgRef.current,
          updateType: 'chat'
        });
        
        // Persist history to database
        await persistHistory({
          prompt: promptToUse,
          diagram: newDiagram,
          diagram_img: svgOutput || latestSvgRef.current,
          updateType: 'chat'
        });
        
        // Clear prompt
        setPrompt('');
        
        // Render the diagram
        renderDiagram(newDiagram);
      }
    } catch (err: any) {
      console.error(`[handleGenerateDiagram] Error generating diagram:`, err);
      const errorMsg = err.message || 'An error occurred';
      
      // Check if we have a successful diagram despite the error
      let hasValidDiagram = false;
      let validDiagram = '';
      
      // We need to check if the current diagram renders correctly
      try {
        // If we got to the point where we have a diagram and SVG
        if (svgOutput && svgOutput.length > 0 && currentDiagram && currentDiagram.length > 0) {
          console.log(`[handleGenerateDiagram] Got error but we have SVG output (${svgOutput.length} bytes) and diagram code (${currentDiagram.length} bytes)`);
          hasValidDiagram = true;
          validDiagram = currentDiagram;
        } 
        // Or if we can render the current diagram successfully
        else if (currentDiagram && currentDiagram.length > 0) {
          const testRenderSuccess = await renderDiagram(currentDiagram);
          if (testRenderSuccess && svgOutput && svgOutput.length > 0) {
            console.log(`[handleGenerateDiagram] Got error but rendering test succeeded, SVG: ${svgOutput.length} bytes`);
            hasValidDiagram = true;
            validDiagram = currentDiagram;
          }
        }
        
        // If we have a valid diagram, save it to history despite the error
        if (hasValidDiagram) {
          console.log(`[handleGenerateDiagram] Saving valid diagram to history despite error`);
          
          // Update messages to show we're using the valid diagram
          const aiMessage: ChatMessageData = {
            role: 'assistant',
            content: 'Here is your diagram. (Note: There was a minor issue but I found a valid diagram to display)',
            timestamp: new Date(),
            diagramVersion: validDiagram,
          };
          
          // Remove all typing indicators and add the real response
          setMessages(prev => prev.filter(msg => !msg.isTyping).concat(aiMessage));
          
          // Save to history
          await updateHistory({
            prompt: promptToUse,
            diagram: validDiagram,
            diagram_img: svgOutput || latestSvgRef.current,
            updateType: 'chat'
          });
          
          // Persist history to database
          await persistHistory({
            prompt: promptToUse,
            diagram: validDiagram,
            diagram_img: svgOutput || latestSvgRef.current,
            updateType: 'chat'
          });
          
          // Also save SVG separately to ensure it's stored properly
          try {
            const saveSvgResponse = await fetch('/api/diagrams/save-svg', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                projectId,
                svg: svgOutput || latestSvgRef.current
              }),
            });
            console.log(`[handleGenerateDiagram] Emergency SVG save response: ${saveSvgResponse.status}`);
          } catch (svgError) {
            console.error('[handleGenerateDiagram] Failed to save SVG in error recovery:', svgError);
          }
          
          // Clear prompt since we successfully handled this
          setPrompt('');
          
          // Return early without showing error
          return;
        }
      } catch (renderErr) {
        console.error('Error during render test:', renderErr);
      }
      
      // Regular error handling for actual errors
      setError(errorMsg);
      setLastErrorMessage(errorMsg);
      
      // If this is not yet a retry attempt, try again automatically
      if (!isRetry && retryAttempt < MAX_AUTO_RETRIES) {
        console.log('[handleGenerateDiagram] First attempt failed, retrying automatically...');
        
        // Add retry notification for the user
        const retryingMessage: ChatMessageData = {
          role: 'system',
          content: 'There was an issue with diagram generation. Retrying automatically...',
          timestamp: new Date(),
          isSystemNotification: true,
        };
        
        // Update messages to show the retry notification
        setMessages(prev => prev.filter(msg => !msg.isTyping).concat(retryingMessage));
        
        // Add a small delay before retrying
        setTimeout(() => {
          handleGenerateDiagram(null, promptToUse, true, errorMsg);
        }, 1500);
        return; // Early return to avoid adding error message here
      }
      
      // This was already a retry attempt or we hit another error, show error message
      const errorMessage: ChatMessageData = {
        role: 'assistant',
        content: isRetry 
          ? 'I\'m having trouble creating this diagram. Please try a clearer prompt or a different diagram type.' 
          : 'Sorry, I encountered an error while generating your diagram. You can try again with the retry button.',
        timestamp: new Date(),
        error: errorMsg,
        hasRetryButton: true, // Add a flag to indicate this message should show a retry button
      };
      
      // Remove all typing indicators and add the error message
      setMessages(prev => prev.filter(msg => !msg.isTyping).concat(errorMessage));
    } finally {
      setIsGenerating(false);
      setIsRetrying(false);
    }
  };

  // Enhanced function to handle manual retry from the UI
  const handleRetry = () => {
    if (lastPrompt) {
      // Reset error state
      setError('');
      setMessages(prev => {
        // Remove the last error message
        const filteredMessages = prev.filter(msg => !msg.error);
        
        // Add a system message about retry
        const retryMessage: ChatMessageData = {
          role: 'system',
          content: 'Retrying with a fresh approach...',
          timestamp: new Date(),
          isSystemNotification: true,
        };
        
        return [...filteredMessages, retryMessage];
      });
      
      // Trigger generation with fresh cache and pass the last error message
      handleGenerateDiagram(null, lastPrompt, true, lastErrorMessage);
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
      
      // Don't switch to code editor mode, stay in chat mode
      
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
    console.log(`[Initial Setup] Starting with initialHistory length: ${initialHistory?.length || 0}`);
    
    if (currentDiagram) {
      console.log(`[Initial Setup] Have currentDiagram, length: ${currentDiagram.length}`);
      
      // If we have initialHistory with diagram_img for the current diagram, use it immediately
      if (initialHistory && initialHistory.length > 0 && initialHistory[0]?.diagram_img) {
        console.log(`[Initial Setup] Using SVG from history immediately, length: ${initialHistory[0].diagram_img.length}`);
        setSvgOutput(initialHistory[0].diagram_img);
        latestSvgRef.current = initialHistory[0].diagram_img;
      } else {
        // If no SVG in history, render the diagram to generate it
        console.log(`[Initial Setup] No SVG in history, rendering diagram to generate SVG`);
        renderDiagram(currentDiagram);
      }
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
    handleRetry,
  };
}

export default useDiagramEditor; 