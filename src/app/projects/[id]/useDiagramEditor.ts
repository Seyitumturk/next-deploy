import { useState, useEffect, useRef, useCallback } from 'react';
import mermaid from 'mermaid';
import type { ChatMessageData } from './ChatMessage';
import React from 'react';

export interface EditorProps {
  projectId: string;
  projectTitle: string;
  diagramType: string;
  initialDiagram?: string;
  user: {
    credits: number;
    initials: string;
  };
  history: {
    _id: string;
    prompt?: string;
    diagram: string;
    diagram_img?: string;
    updateType: 'chat' | 'code' | 'reversion';
    updatedAt: string;
  }[];
}

function useDiagramEditor({ projectId, projectTitle, diagramType, initialDiagram, user: _user, history }: EditorProps) {
  // --- state definitions ---
  const [prompt, setPrompt] = useState('');
  const [lastPrompt, setLastPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showPromptPanel, setShowPromptPanel] = useState(true);
  const [svgOutput, setSvgOutput] = useState<string>('');
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentDiagram, setCurrentDiagram] = useState(() => {
    // First try to get the latest diagram from history
    const latestHistoryItem = history[0];
    if (latestHistoryItem?.diagram) {
      console.log(">> useDiagramEditor: Loading diagram from history:", latestHistoryItem.diagram);
      return latestHistoryItem.diagram;
    }
    console.log(">> useDiagramEditor: No history diagram, loading initialDiagram:", initialDiagram);
    return initialDiagram || '';
  });
  const svgRef = useRef<HTMLDivElement>(null);
  const bufferTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const diagramRef = useRef<HTMLDivElement>(null);
  const [editorMode, setEditorMode] = useState<'chat' | 'code'>('chat');
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [documentSummary, setDocumentSummary] = useState<string>('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessageData[]>(() => {
    const uniqueHistory = history
      .filter(item => item.updateType === 'chat' && item.prompt)
      .reduce((acc, item) => {
        if (item.prompt && !item.prompt.includes('Current diagram:') && 
            !item.prompt.includes('Previous conversation:') && 
            !item.prompt.includes('Requested changes:')) {
          const isDuplicate = acc.some(
            msg => 
              msg.content === item.prompt &&
              Math.abs(new Date(msg.timestamp).getTime() - new Date(item.updatedAt).getTime()) < 1000
          );
          
          if (!isDuplicate) {
            acc.push({
              role: 'user',
              content: item.prompt,
              timestamp: new Date(item.updatedAt),
              diagramVersion: item.diagram
            });
          }
        }
        return acc;
      }, [] as ChatMessageData[]);
    return uniqueHistory.reverse();
  });
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // --- auto-scroll chat on update ---
  useEffect(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      const scrollOptions: ScrollIntoViewOptions = {
        behavior: 'smooth',
        block: 'end'
      };
      const scrollTarget = document.createElement('div');
      container.appendChild(scrollTarget);
      scrollTarget.scrollIntoView(scrollOptions);
      container.removeChild(scrollTarget);
    }
  }, [chatHistory, isGenerating]);

  // --- Moved renderDiagram above useEffect and wrapped it in a useCallback ---
  const renderDiagram = React.useCallback(async (diagramText: string): Promise<boolean> => {
    const maxRetries = 3;
    let currentTry = 0;
    while (currentTry < maxRetries) {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'loose',
          fontFamily: 'var(--font-geist-sans)',
          logLevel: 0,
          deterministicIds: true,
          sequence: { useMaxWidth: false },
          er: { useMaxWidth: false },
          flowchart: { useMaxWidth: false },
          gantt: { useMaxWidth: false },
          journey: { useMaxWidth: false }
        });
        
        // --- Updated: Use a container with proper dimensions for gantt rendering ---
        const container = document.createElement('div');
        // Previously: 
        // container.style.cssText = 'position: absolute; visibility: hidden; width: 0; height: 0; overflow: hidden;';
        // Updated container style to allow mermaid to compute layout correctly:
        container.style.cssText = 'position: absolute; top: -9999px; left: -9999px; width: 1200px; height: auto; overflow: hidden;';
        document.body.appendChild(container);
        // --- End of container style update ---

        // --- Begin: Remove markdown code fences if present ---
        let diagramToRender = diagramText;
        if (diagramToRender.trim().startsWith("```")) {
          const lines = diagramToRender.split("\n");
          // Remove first line if it starts with ```
          if (lines[0].startsWith("```")) {
            lines.shift();
          }
          // Remove last line if it ends with ```
          if (lines[lines.length - 1].trim().endsWith("```")) {
            lines.pop();
          }
          diagramToRender = lines.join("\n");
        }
        // --- End: Remove markdown code fences ---

        // --- Begin: Sanitize gantt diagram text ---
        if (diagramToRender.trim().toLowerCase().startsWith('gantt')) {
          // Replace any instance of the word "parallel" with "after"
          diagramToRender = diagramToRender.replace(/\bparallel\b/gi, 'after');
        }
        // --- End: Sanitize gantt diagram text ---

        const { svg } = await mermaid.render('diagram-' + Date.now(), diagramToRender, container);
        document.body.removeChild(container);
        
        // Process the SVG to make it responsive: remove fixed dimensions and set to full container width/height
        let newSvg = svg;
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(svg, "image/svg+xml");
          const svgElement = xmlDoc.documentElement;
          // Remove fixed width and height so the SVG can scale
          svgElement.removeAttribute('width');
          svgElement.removeAttribute('height');
          // Set the dimensions to 100% to let it adapt to the container size
          svgElement.setAttribute('width', '100%');
          svgElement.setAttribute('height', '100%');
          newSvg = new XMLSerializer().serializeToString(svgElement);
        } catch (error) {
          console.error("Error processing SVG for responsive display:", error);
        }
        setSvgOutput(newSvg);

        // Save SVG asynchronously (do not block UI)
        fetch('/api/diagrams/save-svg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, svg }),
        }).catch(console.error);

        return true;
      } catch (err) {
        currentTry++;
        if (currentTry === maxRetries) {
          console.error('Diagram rendering failed:', err);
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    return false;
  }, [projectId]);

  // Now use renderDiagram in the useEffect
  useEffect(() => {
    const loadLatestDiagram = async () => {
      if (history.length > 0) {
        const latestHistoryItem = history[0];
        console.log('>> useDiagramEditor: loadLatestDiagram - history[0]:', latestHistoryItem);
        
        // Always set the current diagram from history if available
        if (latestHistoryItem?.diagram) {
          console.log('>> useDiagramEditor: Setting diagram from history:', latestHistoryItem.diagram);
          setCurrentDiagram(latestHistoryItem.diagram);
        } else {
          console.log('>> useDiagramEditor: No diagram found in latest history');
        }

        // Handle SVG display
        if (latestHistoryItem?.diagram_img) {
          console.log('>> useDiagramEditor: Found diagram_img, setting svgOutput');
          setSvgOutput(latestHistoryItem.diagram_img);
        } else if (latestHistoryItem?.diagram) {
          try {
            const renderSuccess = await renderDiagram(latestHistoryItem.diagram);
            if (!renderSuccess) {
              // Optionally log error if needed
            }
          } catch (error) {
            console.error('Error rendering initial diagram:', error);
          }
        }
      }
    };

    loadLatestDiagram();
  }, [history, renderDiagram]);

  // --- buffered update during streaming ---
  const updateDiagramWithBuffer = (newContent: string) => {
    setCurrentDiagram(newContent);
    renderDiagram(newContent).catch(console.error);
  };

  // --- mouse wheel zoom ---
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0003;
    const rect = diagramRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setScale(prevScale => {
      const newScale = Math.min(Math.max(prevScale * Math.exp(delta), 0.1), 5);
      const scaleChange = newScale / prevScale;
      const newPosition = {
        x: position.x - (mouseX - rect.width / 2) * (scaleChange - 1),
        y: position.y - (mouseY - rect.height / 2) * (scaleChange - 1)
      };
      setPosition(newPosition);
      return newScale;
    });
  }, [position]);

  // --- mouse move panning ---
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const dampingFactor = 0.75;
      const targetX = e.clientX - dragStart.x;
      const targetY = e.clientY - dragStart.y;
      setPosition(prev => ({
        x: prev.x + (targetX - prev.x) * dampingFactor,
        y: prev.y + (targetY - prev.y) * dampingFactor,
      }));
    }
  }, [isDragging, dragStart]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
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

  // --- attach event listeners ---
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

  // --- helpers for file naming ---
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

  // --- download functions ---
  const downloadSVG = () => {
    if (!svgRef.current) return;
    const svgElement = svgRef.current.querySelector('svg');
    if (!svgElement) return;
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
      * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    `;
    clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);
    const bbox = svgElement.getBBox();
    clonedSvg.setAttribute('width', bbox.width.toString());
    clonedSvg.setAttribute('height', bbox.height.toString());
    clonedSvg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    clonedSvg.querySelectorAll('text').forEach(textElement => {
      textElement.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    });
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
    const svgElement = svgRef.current.querySelector('svg');
    if (!svgElement) return;
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
    clonedSvg.querySelectorAll('text').forEach(textElement => {
      textElement.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    });
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
      * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    `;
    clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);
    const bbox = svgElement.getBBox();
    const pngScale = 2;
    const width = Math.ceil(bbox.width * pngScale);
    const height = Math.ceil(bbox.height * pngScale);
    clonedSvg.setAttribute('width', width.toString());
    clonedSvg.setAttribute('height', height.toString());
    clonedSvg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    await document.fonts.load('12px "Inter"');
    const svgUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    const img = new Image();
    img.src = svgUrl;
    await new Promise((resolve) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        if (!transparent) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
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

  // --- generate diagram via API ---
  const handleGenerateDiagram = async (e: React.FormEvent<HTMLFormElement> | null, initialPrompt?: string) => {
    if (e) e.preventDefault();
    // Use the prompt if available; otherwise, fall back to the last used prompt.
    const promptText = initialPrompt || (prompt.trim() ? prompt : lastPrompt);
    if (!promptText.trim() && !documentSummary) return;
    // Store the prompt for later retries.
    setLastPrompt(promptText);
    // Clear the input box immediately after sending the diagram request
    setPrompt('');
    setIsGenerating(true);
    setError('');
    setSvgOutput('');  // Clean up previous SVG output before retrying
    try {
      // Add the chat message before generating diagram
      setChatHistory(prev => [...prev, {
        role: 'user',
        content: promptText,
        timestamp: new Date(),
        diagramVersion: currentDiagram // initial version may be empty or outdated
      }]);
      const currentVersion = currentDiagram;
      const currentSvg = svgRef.current?.querySelector('svg')?.outerHTML || '';
      
      // Updated aiPrompt using string concatenation
      const aiPrompt = `Current diagram:
\`\`\`mermaid
${currentVersion}
\`\`\`

${documentSummary ? "Document context: " + documentSummary + "\n\n" : ""}Previous conversation:
${chatHistory.slice(-3).map(msg => msg.role + ": " + msg.content).join('\n')}

Requested changes: ${promptText}`;
      
      const response = await fetch('/api/diagrams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          diagramType,
          textPrompt: aiPrompt,
          currentDiagram: currentVersion,
          clientSvg: currentSvg
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to generate diagram');
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let finalDiagram: string | null = null;
      if (!reader) throw new Error('Failed to get response reader');
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
              finalDiagram = message.mermaidSyntax;
            }
          }
        }
      }
      if (finalDiagram) {
        // ---- NEW CODE: Update the last chat message with the finalized diagram version ----
        setChatHistory(prev => {
          const newHistory = [...prev];
          const lastIndex = newHistory.length - 1;
          if (lastIndex >= 0) {
            newHistory[lastIndex] = { ...newHistory[lastIndex], diagramVersion: finalDiagram };
          }
          return newHistory;
        });
        // --------------------------------------------------------------------------
        await fetch(`/api/projects/${projectId}/history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptText,
            diagram: finalDiagram,
            updateType: 'chat'
          }),
        });
        const renderSuccess = await renderDiagram(finalDiagram);
        if (!renderSuccess) {
          throw new Error('Failed to render the final diagram');
        }
      } else {
        throw new Error('No valid diagram was generated');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to generate diagram';
      // Check if the error message relates to syntax issues
      setError(
        errorMessage.toLowerCase().includes('syntax')
          ? 'Syntax error in diagram. Please check your Mermaid syntax and try again.'
          : errorMessage
      );
      setChatHistory(prev => [
        ...prev,
        {
          role: 'system',
          content: `Error: ${errorMessage}`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsGenerating(false);
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }
    }
  };

  // --- code change handler for the code editor mode ---
  const handleCodeChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCurrentDiagram(newCode);
    
    try {
      // First render the diagram
      const renderSuccess = await renderDiagram(newCode);
      if (!renderSuccess) {
        setError('Failed to render diagram');
        return;
      }

      // If render successful, save to history
      await fetch(`/api/projects/${projectId}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagram: newCode,
          updateType: 'code'
        }),
      });
    } catch (err) {
      console.error('Error updating diagram:', err);
      setError(err instanceof Error ? err.message : 'Failed to update diagram');
    }
  };

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = (e) => resolve(e.target?.result as string);
      fileReader.onerror = (e) => reject(e);
      fileReader.readAsText(file);
    });
  };

  // --- document processing ---
  const processDocument = async (file: File) => {
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
      setChatHistory(prev => [
        ...prev,
        {
          role: 'document',
          content: message,
          timestamp: new Date(),
        },
      ]);
      handleGenerateDiagram(null, summary);
    } catch (error) {
      console.error('Error processing document:', error);
      setError('Failed to process document. Please try again.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  // --- NEW: website processing ---
  // This function uses an API endpoint that uses Playwright to load webpage content.
  const processWebsite = async (url: string) => {
    setIsProcessingFile(true);
    try {
      // Add a system message to indicate website processing has started.
      setChatHistory(prev => [
        ...prev,
        {
          role: 'system',
          content: `Processing website ${url}...`,
          timestamp: new Date(),
        },
      ]);
      // Post the URL and diagramType to the API.
      const response = await fetch('/api/process-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, diagramType }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process website');
      }
      const { summary, message } = await response.json();
      setDocumentSummary(summary);
      setChatHistory(prev => [
        ...prev,
        {
          role: 'document',
          content: message,
          timestamp: new Date(),
        },
      ]);
      // Auto generate/update the diagram using the website summary as context.
      await handleGenerateDiagram(null, summary);
    } catch (error) {
      console.error('Error processing website:', error);
      setError(error instanceof Error ? error.message : 'Failed to process website');
    } finally {
      setIsProcessingFile(false);
    }
  };

  // --- file upload handler ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('diagramType', diagramType);
      setChatHistory(prev => [
        ...prev,
        {
          role: 'system',
          content: `Processing ${file.name}...`,
          timestamp: new Date(),
        },
      ]);
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
      setChatHistory(prev => [
        ...prev,
        {
          role: 'document',
          content: message,
          timestamp: new Date(),
        },
      ]);
      handleGenerateDiagram(null, summary);
    } catch (error) {
      console.error('Error processing document:', error);
      setError(error instanceof Error ? error.message : 'Failed to process document');
    } finally {
      setIsProcessingFile(false);
    }
  };

  // --- diagram version select ---
  const handleDiagramVersionSelect = useCallback(async (version: string) => {
    setCurrentDiagram(version);
    await renderDiagram(version);
    
    // Optionally save this version to history
    try {
      await fetch(`/api/projects/${projectId}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagram: version,
          updateType: 'reversion',
        }),
      });
    } catch (error) {
      console.error('Error saving diagram version:', error);
    }
  }, [projectId, renderDiagram]);

  return {
    prompt,
    setPrompt,
    isGenerating,
    setIsGenerating,
    error,
    setError,
    showPromptPanel,
    setShowPromptPanel,
    svgOutput,
    setSvgOutput,
    scale,
    setScale,
    position,
    setPosition,
    isDragging,
    setIsDragging,
    currentDiagram,
    setCurrentDiagram,
    editorMode,
    setEditorMode,
    isEditorReady,
    setIsEditorReady,
    isProcessingFile,
    documentSummary,
    chatContainerRef,
    chatHistory,
    setChatHistory,
    showFileUpload,
    setShowFileUpload,
    showExportMenu,
    setShowExportMenu,
    svgRef,
    diagramRef,
    renderDiagram,
    updateDiagramWithBuffer,
    handleWheel,
    handleMouseMove,
    handleMouseDown,
    handleMouseUp,
    getFormattedDate,
    getFormattedFileName,
    downloadSVG,
    downloadPNG,
    handleGenerateDiagram,
    handleCodeChange,
    readFileContent,
    processDocument,
    processWebsite,
    handleFileUpload,
    handleDiagramVersionSelect,
  };
}

export default useDiagramEditor; 