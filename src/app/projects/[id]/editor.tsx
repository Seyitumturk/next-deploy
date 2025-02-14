'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import mermaid from 'mermaid';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { PPTXLoader } from "@langchain/community/document_loaders/fs/pptx";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

interface EditorProps {
  projectId: string;
  projectTitle: string;
  diagramType: string;
  initialDiagram?: string;
  user: {
    credits: number;
    initials: string;
  };
}

export default function DiagramEditor({ 
  projectId, 
  projectTitle,
  diagramType, 
  initialDiagram,
  user 
}: EditorProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showPromptPanel, setShowPromptPanel] = useState(true);
  const [svgOutput, setSvgOutput] = useState<string>('');
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentDiagram, setCurrentDiagram] = useState(initialDiagram || '');
  const [streamBuffer, setStreamBuffer] = useState('');
  const svgRef = useRef<HTMLDivElement>(null);
  const bufferTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const diagramRef = useRef<HTMLDivElement>(null);
  const [editorMode, setEditorMode] = useState<'chat' | 'code'>('chat');
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [documentSummary, setDocumentSummary] = useState<string>('');

  useEffect(() => {
    if (initialDiagram) {
      setCurrentDiagram(initialDiagram);
      renderDiagram(initialDiagram);
    }
  }, [initialDiagram]);

  // Enhanced rendering with error handling and retries
  const renderDiagram = async (diagramText: string): Promise<boolean> => {
    const maxRetries = 3;
    let currentTry = 0;

    while (currentTry < maxRetries) {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'loose',
          fontFamily: 'var(--font-geist-sans)',
        });
        
        const { svg } = await mermaid.render('diagram-' + Date.now(), diagramText);
        setSvgOutput(svg);
        return true;
      } catch (err) {
        console.error(`Failed to render diagram (attempt ${currentTry + 1}/${maxRetries}):`, err);
        currentTry++;
        if (currentTry < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    return false;
  };

  // Buffered update function for smoother streaming
  const updateDiagramWithBuffer = (newContent: string) => {
    setStreamBuffer(newContent);
    
    // Clear existing timeout
    if (bufferTimeoutRef.current) {
      clearTimeout(bufferTimeoutRef.current);
    }

    // Set new timeout for rendering
    bufferTimeoutRef.current = setTimeout(async () => {
      setCurrentDiagram(newContent);
      await renderDiagram(newContent);
    }, 100); // Adjust buffer time as needed
  };

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0003; // Reduced sensitivity for smoother zoom
    const rect = diagramRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate mouse position relative to diagram
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setScale(prevScale => {
      const newScale = Math.min(Math.max(prevScale * Math.exp(delta), 0.1), 5);
      
      // Adjust position to zoom towards mouse cursor
      const scaleChange = newScale / prevScale;
      const newPosition = {
        x: position.x - (mouseX - rect.width / 2) * (scaleChange - 1),
        y: position.y - (mouseY - rect.height / 2) * (scaleChange - 1)
      };
      
      setPosition(newPosition);
      return newScale;
    });
  }, [position]);

  // Handle mouse drag for panning with smoother movement
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      // Increased damping factor slightly for faster movement while maintaining smoothness
      const dampingFactor = 0.75; // Changed from 0.6 to 0.75
      const targetX = e.clientX - dragStart.x;
      const targetY = e.clientY - dragStart.y;
      
      setPosition(prev => ({
        x: prev.x + (targetX - prev.x) * dampingFactor,
        y: prev.y + (targetY - prev.y) * dampingFactor,
      }));
    }
  }, [isDragging, dragStart]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  }, [position]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add event listeners
  useEffect(() => {
    const diagram = diagramRef.current;
    if (!diagram) return;

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      handleWheel(e);
    };

    diagram.addEventListener('wheel', wheelHandler, { passive: false });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      diagram.removeEventListener('wheel', wheelHandler);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleWheel, handleMouseMove, handleMouseUp]);

  const getFormattedDate = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getFormattedFileName = (extension: string, transparent: boolean = false) => {
    const date = getFormattedDate();
    const formattedTitle = projectTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const formattedType = diagramType.toLowerCase().replace('_', '-');
    const transparentSuffix = transparent ? '-transparent' : '';
    
    return `${formattedTitle}-${formattedType}-diagram-${date}${transparentSuffix}.${extension}`;
  };

  const downloadSVG = () => {
    if (!svgRef.current) return;
    
    // Get the SVG element and clone it
    const svgElement = svgRef.current.querySelector('svg');
    if (!svgElement) return;
    
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
    
    // Add font-family definitions to the SVG
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
      * {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
    `;
    clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);
    
    // Ensure SVG has proper dimensions and viewBox
    const bbox = svgElement.getBBox();
    clonedSvg.setAttribute('width', bbox.width.toString());
    clonedSvg.setAttribute('height', bbox.height.toString());
    clonedSvg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    
    // Add font-family to all text elements
    clonedSvg.querySelectorAll('text').forEach(textElement => {
      textElement.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    });
    
    // Convert to string with proper XML declaration and CSS
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([
      '<?xml version="1.0" standalone="no"?>\r\n',
      '<?xml-stylesheet type="text/css" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" ?>\r\n',
      svgData
    ], { type: 'image/svg+xml;charset=utf-8' });
    
    const url = URL.createObjectURL(svgBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getFormattedFileName('svg');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadPNG = async (transparent: boolean = false) => {
    if (!svgRef.current) return;
    
    // Get the SVG element
    const svgElement = svgRef.current.querySelector('svg');
    if (!svgElement) return;
    
    // Create a clone of the SVG
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
    
    // Add font-family to all text elements
    clonedSvg.querySelectorAll('text').forEach(textElement => {
      textElement.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    });
    
    // Add font preloading
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
      * {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
    `;
    clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);
    
    // Get the bounding box
    const bbox = svgElement.getBBox();
    
    // Set dimensions (multiply by 2 for higher resolution)
    const scale = 2;
    const width = Math.ceil(bbox.width * scale);
    const height = Math.ceil(bbox.height * scale);
    
    clonedSvg.setAttribute('width', width.toString());
    clonedSvg.setAttribute('height', height.toString());
    clonedSvg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    
    // Convert SVG to string
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    
    // Wait for font to load
    await document.fonts.load('12px "Inter"');
    
    const svgUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    
    // Create Image
    const img = new Image();
    img.src = svgUrl;
    
    await new Promise((resolve) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // If not transparent, draw white background
        if (!transparent) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Set font smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw the image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to PNG
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = getFormattedFileName('png', transparent);
        link.href = pngUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        resolve(true);
      };
    });
  };

  async function handleGenerateDiagram(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!prompt.trim() && !documentSummary) return;

    setIsGenerating(true);
    setError('');

    try {
      // Combine document summary with user's input for the final prompt
      const finalPrompt = documentSummary 
        ? `Based on this document content: ${documentSummary}\n\n${prompt ? `Additional modifications: ${prompt}` : ''}`
        : prompt;

      // Initial request without SVG
      const response = await fetch('/api/diagrams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          diagramType,
          textPrompt: finalPrompt,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate diagram');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const messages = chunk
          .split('\n\n')
          .filter(msg => msg.trim().startsWith('data: '))
          .map(msg => JSON.parse(msg.replace('data: ', '')));

        for (const message of messages) {
          if (message.mermaidSyntax) {
            updateDiagramWithBuffer(message.mermaidSyntax);
            
            if (message.isComplete) {
              // Final update
              setCurrentDiagram(message.mermaidSyntax);
              await renderDiagram(message.mermaidSyntax);
              
              // Now get the SVG after it's been rendered
              const currentSvg = svgRef.current?.innerHTML || '';
              console.log('Final SVG:', currentSvg ? currentSvg.substring(0, 100) + '...' : 'No SVG available');

              // Send a follow-up request to save the SVG
              const svgResponse = await fetch('/api/diagrams/save-svg', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  projectId,
                  gptResponseId: message.gptResponseId,
                  svg: currentSvg,
                }),
              });

              if (!svgResponse.ok) {
                console.error('Failed to save SVG');
              }

              // Only clear the user's additional input, keep the document summary
              if (prompt) setPrompt('');
              router.refresh();
              break;
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsGenerating(false);
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCurrentDiagram(newCode);
    renderDiagram(newCode);
  };

  // Add editor options
  const monacoOptions = {
    fontSize: 14,
    fontFamily: 'var(--font-geist-mono)',
    minimap: { enabled: false },
    lineNumbers: 'on',
    roundedSelection: true,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    padding: { top: 16, bottom: 16 },
    tabSize: 2,
    wordWrap: 'on',
    theme: 'vs-dark',
    scrollbar: {
      vertical: 'visible',
      horizontal: 'visible',
      useShadows: false,
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8
    }
  };

  // First, let's create a helper function to read file content
  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  // Then update the processDocument function
  const processDocument = async (file: File) => {
    setIsProcessingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/process-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process document');
      }

      const { text } = await response.json();

      // Split text into chunks
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const chunks = await textSplitter.splitText(text);

      // Generate diagram from content
      const diagramPrompt = `Based on this content, create a ${diagramType} diagram that best represents the main concepts and their relationships:\n\n${chunks.join('\n')}`;
      setPrompt(diagramPrompt);
      
      // Trigger diagram generation
      handleGenerateDiagram(new Event('submit') as any);

    } catch (error) {
      console.error('Error processing document:', error);
      setError('Failed to process document. Please try again.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Update the button handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('diagramType', diagramType);

      const response = await fetch('/api/process-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process document');
      }

      const { summary, message } = await response.json();
      setDocumentSummary(summary);
      setPrompt(''); // Clear the prompt for user's additional input
      
      // Show success message to user
      setError(message);

    } catch (error) {
      console.error('Error processing document:', error);
      setError(error instanceof Error ? error.message : 'Failed to process document');
    } finally {
      setIsProcessingFile(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Keep only the new modern header */}
      <header className="h-12 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="h-full px-4 flex items-center justify-between">
          {/* Left side - Logo and Project Info */}
          <div className="flex items-center space-x-4">
            <Link href="/projects" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <img src="/logo-green.svg" alt="Chartable Logo" className="h-6 w-6" />
              <span className="font-semibold text-gray-900 dark:text-white">{projectTitle}</span>
            </Link>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {diagramType.charAt(0).toUpperCase() + diagramType.slice(1).replace('_', ' ')} Diagram
            </span>
          </div>

          {/* Right side - Credits and User */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Credits: <span className="font-mono">{user.credits}</span>
                </span>
              </div>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-secondary to-accent-2 flex items-center justify-center text-white text-sm font-medium shadow-lg shadow-secondary/20">
                {user.initials}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Modernized Chat Panel */}
        <div 
          className={`w-96 flex flex-col bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out ${
            showPromptPanel ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{
            position: 'absolute',
            height: 'calc(100% - 3rem)', // Subtract header height
            zIndex: 10
          }}
        >
          {/* Chat Header */}
          <div className="h-12 p-4 border-b border-gray-200 dark:border-gray-800 flex items-center">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-secondary to-accent-2 flex items-center justify-center text-white">
                  {editorMode === 'chat' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  )}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    {editorMode === 'chat' ? 'AI Assistant' : 'Code Editor'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {editorMode === 'chat' ? 'Helping you create diagrams' : 'Edit Mermaid syntax directly'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPromptPanel(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* Conditional render chat or code editor */}
          {editorMode === 'chat' ? (
            // Existing chat UI
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Welcome Message */}
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                </div>
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                  <p className="text-gray-700 dark:text-gray-300">
                    Hello! I'm your AI assistant. Describe what you'd like to create or modify in your diagram, and I'll help you bring it to life.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Code Editor
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setEditorMode('chat')}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 
                      rounded-lg transition-colors text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center space-x-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <span>Switch to Chat</span>
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <Editor
                  height="100%"
                  defaultLanguage="mermaid"
                  value={currentDiagram}
                  onChange={(value) => {
                    if (value) {
                      setCurrentDiagram(value);
                      renderDiagram(value);
                    }
                  }}
                  onMount={() => setIsEditorReady(true)}
                  options={monacoOptions}
                  beforeMount={(monaco) => {
                    // Register Mermaid language
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

                    // Add basic Mermaid theme
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

          {/* Show chat input only in chat mode */}
          {editorMode === 'chat' && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              {/* File Upload Options */}
              <div className="mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => document.getElementById('pdf-upload')?.click()}
                    disabled={isProcessingFile}
                    className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 
                      hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-600 dark:text-gray-300"
                  >
                    {isProcessingFile ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 18H17V16H7V18M17 14H7V12H17V14M7 10H11V8H7V10M20.1 3H3.9C3.4 3 3 3.4 3 3.9V20.1C3 20.5 3.4 21 3.9 21H20.1C20.5 21 21 20.5 21 20.1V3.9C21 3.4 20.5 3 20.1 3M19 19H5V5H19V19Z" />
                      </svg>
                    )}
                    <span>PDF</span>
                  </button>

                  <button
                    onClick={() => document.getElementById('docx-upload')?.click()}
                    disabled={isProcessingFile}
                    className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 
                      hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-600 dark:text-gray-300"
                  >
                    {isProcessingFile ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6,2H14L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M13,3.5V9H18.5L13,3.5M7,13V15H17V13H7M7,17V19H17V17H7Z" />
                      </svg>
                    )}
                    <span>Word</span>
                  </button>

                  <button
                    onClick={() => document.getElementById('pptx-upload')?.click()}
                    disabled={isProcessingFile}
                    className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 
                      hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-600 dark:text-gray-300"
                  >
                    {isProcessingFile ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6,2H14L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M13,3.5V9H18.5L13,3.5M8,11V13H16V11H8M8,15V17H16V15H8Z" />
                      </svg>
                    )}
                    <span>PowerPoint</span>
                  </button>

                  {/* Hidden File Inputs */}
                  <input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <input
                    id="docx-upload"
                    type="file"
                    accept=".docx"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <input
                    id="pptx-upload"
                    type="file"
                    accept=".pptx"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>

              {/* Existing code for error message */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Rest of the chat input form */}
              <form onSubmit={handleGenerateDiagram} className="space-y-4">
                <div className="relative flex items-end">
                  <textarea
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      e.target.style.height = 'inherit';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                    }}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 
                      px-4 pb-4 pt-3 pr-14 text-sm focus:ring-2 focus:ring-secondary/50 focus:border-transparent resize-none 
                      min-h-[72px] max-h-[200px] transition-all duration-200
                      placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:placeholder:text-transparent
                      overflow-y-auto
                      [&::-webkit-scrollbar]:w-2
                      [&::-webkit-scrollbar-track]:bg-transparent
                      [&::-webkit-scrollbar-thumb]:bg-gray-200
                      [&::-webkit-scrollbar-thumb]:rounded-full
                      dark:[&::-webkit-scrollbar-thumb]:bg-gray-700
                      hover:[&::-webkit-scrollbar-thumb]:bg-gray-300
                      dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600
                      align-bottom"
                    placeholder="Describe your diagram modifications..."
                    disabled={isGenerating}
                    style={{ height: '72px' }}
                  />
                  <button
                    type="submit"
                    disabled={isGenerating || !prompt.trim()}
                    className="absolute right-3 bottom-4 p-2.5 rounded-lg text-secondary hover:text-secondary-dark disabled:opacity-50 transition-colors"
                  >
                    {isGenerating ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 rotate-90 transform" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                      </svg>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Main Diagram Area - will expand when sidebar is hidden */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          showPromptPanel ? 'ml-96' : 'ml-0'
        }`}>
          {/* Control Bar */}
          <div className="h-12 glass-panel border-b backdrop-blur-xl px-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {!showPromptPanel && (
                <button
                  onClick={() => setShowPromptPanel(true)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  title="Show AI Assistant"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
              <div className="h-6 border-r border-gray-200 dark:border-gray-700 mx-2" />
              <div className="flex items-center space-x-1 bg-white/10 dark:bg-gray-800/50 rounded-lg p-1">
                <button onClick={() => setScale(s => Math.min(s + 0.1, 5))} className="p-1.5 hover:bg-white/10 rounded-md transition-colors" title="Zoom In">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </button>
                <button onClick={() => setScale(s => Math.max(s - 0.1, 0.1))} className="p-1.5 hover:bg-white/10 rounded-md transition-colors" title="Zoom Out">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
                <button 
                  onClick={() => {
                    setScale(1);
                    setPosition({ x: 0, y: 0 });
                  }} 
                  className="p-1.5 hover:bg-white/10 rounded-md transition-colors" 
                  title="Reset View"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className="px-2 text-sm text-gray-500 dark:text-gray-400">
                  {Math.round(scale * 100)}%
                </div>
              </div>
            </div>

            {/* Download Options */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-white/10 dark:bg-gray-800/50 rounded-lg p-1">
                <button
                  onClick={downloadSVG}
                  className="px-3 py-1.5 text-sm hover:bg-white/10 rounded-md transition-colors flex items-center space-x-1"
                  title="Download SVG"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span>SVG</span>
                </button>
                <button
                  onClick={() => downloadPNG(false)}
                  className="px-3 py-1.5 text-sm hover:bg-white/10 rounded-md transition-colors flex items-center space-x-1"
                  title="Download PNG with white background"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span>PNG</span>
                </button>
                <button
                  onClick={() => downloadPNG(true)}
                  className="px-3 py-1.5 text-sm hover:bg-white/10 rounded-md transition-colors flex items-center space-x-1"
                  title="Download PNG with transparent background"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span>Transparent</span>
                </button>
              </div>
            </div>
          </div>

          {/* Diagram Area */}
          <div 
            className="flex-1 overflow-hidden relative"
            ref={diagramRef}
            onMouseDown={handleMouseDown}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <div 
              className="absolute inset-0 w-full h-full flex items-center justify-center"
              style={{
                transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
                transition: isDragging ? 'transform 0.08s cubic-bezier(0.4, 0, 0.2, 1)' : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform',
              }}
            >
              {isGenerating && !svgOutput && (
                <div className="absolute inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg flex items-center space-x-3">
                    <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Generating diagram...</span>
                  </div>
                </div>
              )}
              {svgOutput ? (
                <div
                  ref={svgRef}
                  dangerouslySetInnerHTML={{ __html: svgOutput }}
                  className="w-full h-full flex items-center justify-center"
                />
              ) : (
                <div className="text-gray-400 flex flex-col items-center glass-panel rounded-2xl p-8">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-secondary to-accent-2 flex items-center justify-center text-white mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-300">No diagram yet</p>
                  <p className="text-sm text-gray-400">Use the AI Assistant to generate one</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 