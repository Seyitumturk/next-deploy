import { useState, useEffect, useRef, useCallback } from 'react';
import mermaid from 'mermaid';
import type { ChatMessageData } from './ChatMessage';
import React from 'react';

// Define valid mermaid theme types
type MermaidTheme = 'default' | 'forest' | 'dark' | 'neutral' | 'base';

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
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<MermaidTheme>('default');
  const [isVersionSelectionInProgress, setIsVersionSelectionInProgress] = useState(false);

  // --- auto-scroll chat on update ---
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined' || !chatContainerRef.current) return;
    
    console.log("CHAT HISTORY OR GENERATING STATE CHANGED - SCROLLING"); // Debug log
    
    // Bulletproof direct DOM approach to scrolling
    const forceScrollToBottom = () => {
      const container = chatContainerRef.current;
      if (!container) return;
      
      try {
        // Force to absolute bottom with no smooth scrolling
        container.style.scrollBehavior = 'auto'; 
        // Add extra padding to ensure we're at the bottom
        container.scrollTop = container.scrollHeight + 10000;
        
        console.log("DIAGRAM EDITOR - SCROLLED TO BOTTOM:", container.scrollTop); // Debug
      } catch (err) {
        console.error("Scroll error in diagram editor:", err);
      }
    };

    // Execute immediately and multiple times with delays
    forceScrollToBottom();
    
    // Use both setTimeout and requestAnimationFrame for maximum reliability
    requestAnimationFrame(() => {
      forceScrollToBottom();
      
      // Multiple delayed attempts
      [10, 50, 100, 250, 500, 1000].forEach(delay => {
        setTimeout(forceScrollToBottom, delay);
      });
    });
    
    // Also handle new mutations to catch dynamic content loading
    const observer = new MutationObserver(forceScrollToBottom);
    observer.observe(chatContainerRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    
    return () => observer.disconnect();
  }, [chatHistory, isGenerating]);

  // Initialize mermaid (client-side only)
  useEffect(() => {
    // Mermaid initialization is now handled by the useMermaidInit hook in DiagramDisplay
    // This effect is kept for theme changes only
    if (typeof window === 'undefined') return;
    
    // Trigger re-render when theme changes
    if (currentDiagram) {
      renderDiagram();
    }
  }, [currentTheme, currentDiagram]);

  // Define renderDiagram as a standalone function with better client-side safety
  const renderDiagram = async (diagramCode?: string): Promise<boolean> => {
    // Only run on client side
    if (typeof window === 'undefined') {
      console.log('renderDiagram: Not running on client side');
      return false;
    }
    
    try {
      console.log('renderDiagram: Starting render process');
      setIsLoading(true);
      
      // Don't clear render error during streaming to avoid UI flashing
      if (!isGenerating) {
        setRenderError(null);
      }
      
      const codeToRender = diagramCode || currentDiagram;
      console.log('renderDiagram: Code to render length:', codeToRender?.length || 0);
      
      if (!codeToRender) {
        console.log('renderDiagram: No code to render');
        setIsLoading(false);
        return false;
      }
      
      // Use a stable ID that doesn't change between server and client
      // This prevents hydration mismatches
      const uniqueId = `diagram-${projectId}-${Date.now()}`;
      console.log('renderDiagram: Using unique ID:', uniqueId);
      
      try {
        // Ensure mermaid is configured to suppress error blocks and use current theme
        console.log('renderDiagram: Initializing mermaid with theme:', currentTheme);
        mermaid.initialize({
          startOnLoad: false,
          theme: currentTheme,
          // @ts-ignore - These properties exist in newer versions of Mermaid
          suppressErrorsInDOM: true,
          errorLabelColor: 'transparent',
        });
        
        // Use mermaid render function
        console.log('renderDiagram: Calling mermaid.render');
        const { svg } = await mermaid.render(uniqueId, codeToRender);
        console.log('renderDiagram: Mermaid render successful, SVG length:', svg?.length || 0);
        
        // Ensure the SVG has width and height attributes for better display and auto-fitting
        const processedSvg = ensureSvgDimensions(svg);
        
        // Set SVG output through React state
        setSvgOutput(processedSvg);
        console.log('renderDiagram: SVG output set');
        
        setIsLoading(false);
        return true;
      } catch (error) {
        console.warn('renderDiagram: Non-critical error during rendering:', error);
        
        // Only set error state if we're not in the middle of generating
        // This prevents error messages from appearing during streaming
        if (!isGenerating) {
          setRenderError(error instanceof Error ? error.message : String(error));
          
          // Only use fallback SVG if we don't already have an SVG (first render)
          // Otherwise, keep the last valid SVG to maintain visual continuity
          if (!svgOutput) {
            const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 50">
              <rect width="100%" height="100%" fill="transparent" />
              <text x="50%" y="50%" text-anchor="middle" fill="red" font-size="10">Rendering Error</text>
            </svg>`;
            
            setSvgOutput(fallbackSvg);
          }
        }
        
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Error in renderDiagram function:', error);
      
      // Only set error state if we're not in the middle of generating
      if (!isGenerating) {
        setRenderError(error instanceof Error ? error.message : String(error));
        
        // Only use fallback SVG if we don't already have an SVG
        if (!svgOutput) {
          const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 50">
            <rect width="100%" height="100%" fill="transparent" />
            <text x="50%" y="50%" text-anchor="middle" fill="red" font-size="10">Rendering Error</text>
          </svg>`;
          
          setSvgOutput(fallbackSvg);
        }
      }
      
      setIsLoading(false);
      return false;
    }
  };

  // Helper function to ensure SVG has proper dimensions
  const ensureSvgDimensions = (svgString: string): string => {
    try {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');
      
      if (!svgElement) return svgString;
      
      // Get viewBox dimensions if available
      const viewBox = svgElement.getAttribute('viewBox');
      let width, height;
      
      if (viewBox) {
        const [, , vbWidth, vbHeight] = viewBox.split(' ').map(parseFloat);
        if (!isNaN(vbWidth) && !isNaN(vbHeight)) {
          width = vbWidth;
          height = vbHeight;
        }
      }
      
      // If no viewBox or invalid values, use reasonable defaults based on diagram type
      if (!width || !height) {
        // Different diagram types might need different default sizes
        if (diagramType.includes('gantt') || diagramType.includes('timeline')) {
          width = 800;
          height = 500;
        } else if (diagramType.includes('flowchart') || diagramType.includes('graph')) {
          width = 700;
          height = 700;
        } else if (diagramType.includes('sequence')) {
          width = 600;
          height = 800;
        } else if (diagramType.includes('class')) {
          width = 800;
          height = 600;
        } else if (diagramType.includes('er') || diagramType.includes('entity')) {
          width = 700;
          height = 600;
        } else {
          // Default size for other diagram types
          width = 700;
          height = 700;
        }
        
        // Set viewBox if it doesn't exist
        if (!viewBox) {
          svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }
      }
      
      // Set width and height attributes if they don't exist
      if (!svgElement.hasAttribute('width')) {
        svgElement.setAttribute('width', width.toString());
      }
      
      if (!svgElement.hasAttribute('height')) {
        svgElement.setAttribute('height', height.toString());
      }
      
      return new XMLSerializer().serializeToString(svgDoc);
    } catch (error) {
      console.error('Error processing SVG dimensions:', error);
      return svgString; // Return original if processing fails
    }
  };

  // Render diagram when currentDiagram changes
  useEffect(() => {
    if (!currentDiagram || !svgRef.current) return;
    
    // Only reset position when it's not a version selection operation
    // This preserves zoom and position when reverting to versions
    if (!isVersionSelectionInProgress) {
      setPosition({ x: 0, y: 0 });
    }
    
    renderDiagram();
  }, [currentDiagram, isVersionSelectionInProgress]);

  // --- buffered update during streaming ---
  const updateDiagramWithBuffer = (newContent: string) => {
    console.log("Updating diagram with buffered content:", newContent.substring(0, 30) + "...");
    setCurrentDiagram(newContent);
    
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }
    
    // Use a stable ID based on project ID to prevent hydration mismatches
    const streamingRenderID = `streaming-diagram-${projectId}`;
    
    // Render the diagram asynchronously
    (async () => {
      try {
        // Configure mermaid with current theme
        mermaid.initialize({
          startOnLoad: false,
          theme: currentTheme,
          // @ts-ignore
          suppressErrorsInDOM: true,
          errorLabelColor: 'transparent',
        });
        
        // Generate the SVG with the stable ID
        const { svg } = await mermaid.render(streamingRenderID, newContent);
        
        // Update the SVG output state
        setSvgOutput(svg);
        
        // Clear any render errors since we successfully rendered
        setRenderError(null);
      } catch (error) {
        console.warn('Non-critical error during streaming render:', error);
        // Don't update SVG if there's an error to avoid flickering
        // Don't set renderError to keep the UI clean during streaming
        
        // Try to render a simplified version of the diagram by adding proper declarations
        try {
          // Extract the diagram type from the first line or use the project's diagram type
          const lines = newContent.split('\n');
          const firstLine = lines[0]?.trim().toLowerCase() || '';
          let fixedContent = newContent;
          
          // If the first line doesn't contain a valid diagram declaration, add one
          if (!firstLine.startsWith('flowchart') && 
              !firstLine.startsWith('sequencediagram') && 
              !firstLine.startsWith('classDiagram') && 
              !firstLine.startsWith('erdiagram') && 
              !firstLine.startsWith('gantt') && 
              !firstLine.startsWith('pie') && 
              !firstLine.startsWith('graph') && 
              !firstLine.startsWith('statediagram') && 
              !firstLine.startsWith('journey') && 
              !firstLine.startsWith('mindmap')) {
            
            // Add appropriate declaration based on project diagram type
            if (diagramType === 'flowchart') {
              fixedContent = `flowchart TD\n${newContent}`;
            } else if (diagramType === 'sequence') {
              fixedContent = `sequenceDiagram\n${newContent}`;
            } else if (diagramType === 'class') {
              fixedContent = `classDiagram\n${newContent}`;
            } else if (diagramType === 'er' || diagramType === 'erd') {
              fixedContent = `erDiagram\n${newContent}`;
            } else if (diagramType === 'gantt') {
              fixedContent = `gantt\ndateFormat YYYY-MM-DD\n${newContent}`;
            } else if (diagramType === 'state') {
              fixedContent = `stateDiagram-v2\n${newContent}`;
            } else if (diagramType === 'mindmap') {
              fixedContent = `mindmap\n${newContent}`;
            }
            
            // Try rendering with the fixed content
            const { svg } = await mermaid.render(`${streamingRenderID}-fixed`, fixedContent);
            setSvgOutput(svg);
            console.log('Successfully rendered with fixed diagram declaration');
          }
        } catch (fixError) {
          console.warn('Could not fix diagram during streaming:', fixError);
          // Still don't show any errors to the user
        }
      }
    })();
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
    const title = projectTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const transparentSuffix = transparent ? '_transparent' : '';
    return `${title}_diagram${transparentSuffix}_${date}.${extension}`;
  };

  // --- download functions ---
  const downloadSVG = () => {
    if (!svgRef.current) {
      console.error('SVG reference not found');
      return;
    }
    
    // Set downloading state
    setIsDownloading('svg');
    
    try {
      // Find the SVG element with improved selector
      const svgElement = svgRef.current.querySelector('svg');
      
      // If SVG element is not found in the ref, try to find it in the document
      if (!svgElement && document.querySelector('.mermaid svg')) {
        console.log('SVG not found in ref, using document query');
        const svgElement = document.querySelector('.mermaid svg');
        if (!svgElement) {
          console.error('SVG element not found anywhere in the document');
          setIsDownloading(null);
          return;
        }
        
        // Create a deep clone to avoid modifying the displayed SVG
        const clonedSvg = svgElement.cloneNode(true) as SVGElement;
        
        // Process and download the SVG
        processSvgForDownload(clonedSvg, 'svg');
        return;
      }
      
      // More detailed error logging
      if (!svgElement) {
        console.error('SVG element not found within the reference div', {
          refExists: !!svgRef.current,
          refHTML: svgRef.current?.innerHTML,
          refChildNodes: svgRef.current?.childNodes.length
        });
        
        // Try to regenerate the SVG from the current diagram
        if (currentDiagram) {
          console.log('Attempting to regenerate SVG for download');
          mermaid.render(`download-svg-${Date.now()}`, currentDiagram)
            .then(({ svg }) => {
              const parser = new DOMParser();
              const doc = parser.parseFromString(svg, 'image/svg+xml');
              const svgElement = doc.querySelector('svg');
              if (svgElement) {
                processSvgForDownload(svgElement, 'svg');
              } else {
                console.error('Failed to parse regenerated SVG');
                setIsDownloading(null);
              }
            })
            .catch(error => {
              console.error('Error regenerating SVG:', error);
              setIsDownloading(null);
            });
          return;
        }
        
        setIsDownloading(null);
        return;
      }
      
      // Create a deep clone to avoid modifying the displayed SVG
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // Process and download the SVG
      processSvgForDownload(clonedSvg, 'svg');
    } catch (error) {
      console.error('Error downloading SVG:', error);
      setIsDownloading(null);
    }
  };
  
  // Helper function to process SVG for download
  const processSvgForDownload = (svgElement: SVGElement, format: 'svg' | 'png' | 'png-transparent') => {
    try {
      // Prepare the SVG for export with proper dimensions and styling
      const preparedSvg = prepareSvgForExport(svgElement);
      
      if (format === 'svg') {
        // Serialize the SVG to a string with XML declaration and CSS
        const svgData = new XMLSerializer().serializeToString(preparedSvg);
        
        // Create a Blob with the SVG data including XML declaration and font stylesheet
        const svgBlob = new Blob([
          '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\r\n',
          '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\r\n',
          '<?xml-stylesheet type="text/css" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" ?>\r\n',
          svgData
        ], { type: 'image/svg+xml;charset=utf-8' });
        
        // Create a download link
        const url = URL.createObjectURL(svgBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = getFormattedFileName('svg');
        
        // Trigger download - using a more reliable method
        document.body.appendChild(link);
        
        // Use setTimeout to ensure the link is properly added to the DOM
        setTimeout(() => {
          link.click();
          // Clean up
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setIsDownloading(null);
          }, 100);
        }, 0);
        
        console.log('High-quality SVG download initiated');
      } else if (format.startsWith('png')) {
        // For PNG downloads, continue with the PNG conversion process
        convertSvgToPng(preparedSvg, format === 'png-transparent');
      }
    } catch (error) {
      console.error('Error processing SVG for download:', error);
      setIsDownloading(null);
    }
  };
  
  // Prepare SVG for export by ensuring it has proper dimensions and styling
  const prepareSvgForExport = (svgElement: SVGElement): SVGElement => {
    // Create a deep clone to avoid modifying the displayed SVG
    const svgClone = svgElement.cloneNode(true) as SVGElement;
    
    // Get the SVG's viewBox or calculate its bounding box
    let width = 0;
    let height = 0;
    let hasExplicitDimensions = false;
    
    // Try to get dimensions from viewBox
    const viewBox = svgClone.getAttribute('viewBox');
    if (viewBox) {
      const viewBoxParts = viewBox.split(' ').map(parseFloat);
      if (viewBoxParts.length === 4) {
        const [, , vbWidth, vbHeight] = viewBoxParts;
        if (!isNaN(vbWidth) && !isNaN(vbHeight)) {
          width = vbWidth;
          height = vbHeight;
          hasExplicitDimensions = true;
        }
      }
    }
    
    // If no viewBox or invalid values, try to get from width/height attributes
    if (!hasExplicitDimensions) {
      const svgWidth = svgClone.getAttribute('width');
      const svgHeight = svgClone.getAttribute('height');
      
      if (svgWidth && svgHeight) {
        // Remove any units (px, em, etc.) and convert to number
        const numericWidth = parseFloat(svgWidth);
        const numericHeight = parseFloat(svgHeight);
        
        if (!isNaN(numericWidth) && !isNaN(numericHeight)) {
          width = numericWidth;
          height = numericHeight;
          hasExplicitDimensions = true;
        }
      }
    }
    
    // If still no valid dimensions, try to calculate from the SVG's bounding box
    if (!hasExplicitDimensions) {
      try {
        // Cast to SVGGraphicsElement which has getBBox method
        const svgGraphicsElement = svgClone as unknown as SVGGraphicsElement;
        const bbox = svgGraphicsElement.getBBox();
        if (bbox && bbox.width > 0 && bbox.height > 0) {
          width = bbox.width;
          height = bbox.height;
          
          // Add some padding
          width += 40;
          height += 40;
          hasExplicitDimensions = true;
        }
      } catch (e) {
        console.warn('Could not get bounding box:', e);
      }
    }
    
    // If we still don't have valid dimensions, use defaults
    if (!hasExplicitDimensions || width <= 0 || height <= 0) {
      console.log('Using default dimensions for SVG export');
      width = 800;
      height = 600;
    }
    
    // Calculate optimal padding based on diagram size
    const padding = Math.max(20, Math.min(width, height) * 0.05);
    width += padding * 2;
    height += padding * 2;
    
    // Ensure the SVG has explicit width and height attributes
    svgClone.setAttribute('width', width.toString());
    svgClone.setAttribute('height', height.toString());
    
    // If there's no viewBox, create one
    if (!viewBox) {
      svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`);
    } else {
      // Adjust viewBox to include padding
      const [x, y, w, h] = viewBox.split(' ').map(parseFloat);
      svgClone.setAttribute('viewBox', `${x - padding} ${y - padding} ${width} ${height}`);
    }
    
    // Add embedded fonts with improved font stack
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
      text {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 400;
        font-size: 1em;
        letter-spacing: 0;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
      }
      .node rect, .node circle, .node ellipse, .node polygon, .node path {
        stroke-width: 1.5px;
      }
      .edgePath path {
        stroke-width: 1.5px;
      }
    `;
    svgClone.insertBefore(styleElement, svgClone.firstChild);
    
    // Optimize SVG for better rendering
    svgClone.setAttribute('shape-rendering', 'geometricPrecision');
    svgClone.setAttribute('text-rendering', 'optimizeLegibility');
    
    // Ensure all text elements use the correct font and have improved rendering
    svgClone.querySelectorAll('text').forEach(textElement => {
      textElement.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      textElement.style.textRendering = 'optimizeLegibility';
      textElement.style.shapeRendering = 'crispEdges';
      
      // Ensure text has good contrast
      if (!textElement.getAttribute('fill') || textElement.getAttribute('fill') === 'none') {
        textElement.setAttribute('fill', '#333333');
      }
    });
    
    // Ensure all paths and shapes have clean rendering
    svgClone.querySelectorAll('path, rect, circle, ellipse, line, polyline, polygon').forEach(shape => {
      shape.setAttribute('shape-rendering', 'geometricPrecision');
      
      // Ensure lines have appropriate stroke width for better visibility
      if (shape.getAttribute('stroke') && !shape.getAttribute('stroke-width')) {
        shape.setAttribute('stroke-width', '1.5');
      }
    });
    
    return svgClone;
  };

  // Convert SVG to PNG
  const convertSvgToPng = (svgElement: SVGElement, transparent: boolean = false) => {
    try {
      // Create a clean clone of the SVG
      const svgClone = svgElement.cloneNode(true) as SVGElement;
      
      // Get dimensions from viewBox or set defaults
      let viewBox = svgClone.getAttribute('viewBox');
      let width = 2000; // High default width
      let height = 2000; // High default height
      
      if (viewBox) {
        const [, , w, h] = viewBox.split(' ').map(parseFloat);
        width = Math.max(width, w * 1.2); // Add some padding
        height = Math.max(height, h * 1.2);
      }
      
      // Set explicit dimensions
      svgClone.setAttribute('width', width.toString());
      svgClone.setAttribute('height', height.toString());
      
      // Serialize the SVG to a string
      const svgData = new XMLSerializer().serializeToString(svgClone);
      
      // Create a Blob with the SVG data
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      // Create an Image object to load the SVG
      const img = new Image();
      
      img.onload = () => {
        try {
          // Use a high fixed pixel ratio for consistent quality
          const pixelRatio = 4; // Very high quality
          
          // Create a canvas with the SVG dimensions scaled by the pixel ratio
          const canvas = document.createElement('canvas');
          canvas.width = width * pixelRatio;
          canvas.height = height * pixelRatio;
          
          // Get the canvas context and set background if not transparent
          const ctx = canvas.getContext('2d', { alpha: transparent });
          if (!ctx) {
            console.error('Failed to get canvas context');
            setIsDownloading(null);
            return;
          }
          
          // Scale everything by the pixel ratio for sharper images
          ctx.scale(pixelRatio, pixelRatio);
          
          if (!transparent) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
          }
          
          // Draw the image on the canvas
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert canvas to PNG with maximum quality
          const pngUrl = canvas.toDataURL('image/png', 1.0);
          
          // Create a download link
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = getFormattedFileName('png', transparent);
          
          // Trigger download
          document.body.appendChild(link);
          link.click();
          
          // Clean up
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          setIsDownloading(null);
          
        } catch (error) {
          console.error('Error creating PNG from SVG:', error);
          setIsDownloading(null);
        }
      };
      
      img.onerror = () => {
        console.error('Error loading SVG for PNG conversion');
        setIsDownloading(null);
      };
      
      // Set the source of the image to the SVG URL
      img.src = url;
    } catch (error) {
      console.error('Error converting SVG to PNG:', error);
      setIsDownloading(null);
    }
  };

  // Simplified function to apply minimal enhancements
  const applyImageEnhancements = () => {
    // No enhancements - just pass through
  };

  const downloadPNG = async (transparent: boolean = false) => {
    // Set downloading state
    setIsDownloading(transparent ? 'png-transparent' : 'png');
    
    try {
      // Try to find the SVG in the DOM
      let svgElement: SVGElement | null = null;
      
      // Try different selectors to find the SVG
      const selectors = [
        () => document.querySelector('svg[id^="mermaid-"]'),
        () => document.querySelector('.mermaid svg'),
        () => svgRef.current?.querySelector('svg'),
        () => diagramRef.current?.querySelector('svg')
      ];
      
      for (const selector of selectors) {
        const element = selector();
        if (element) {
          svgElement = element as SVGElement;
          break;
        }
      }
      
      if (svgElement) {
        convertSvgToPng(svgElement, transparent);
      } else {
        // Last resort: try to generate from current diagram
        if (currentDiagram) {
          try {
            const { svg } = await mermaid.render(`export-png-${Date.now()}`, currentDiagram);
            const parser = new DOMParser();
            const doc = parser.parseFromString(svg, 'image/svg+xml');
            const freshSvg = doc.querySelector('svg');
            
            if (freshSvg) {
              convertSvgToPng(freshSvg as SVGElement, transparent);
              return;
            }
          } catch (error) {
            console.error('Error generating SVG:', error);
          }
        }
        
        console.error('Could not find SVG element for export');
        setIsDownloading(null);
      }
    } catch (error) {
      console.error('Error in PNG download process:', error);
      setIsDownloading(null);
    }
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
    
    // Don't clear SVG output at the beginning to maintain continuity
    // setSvgOutput('');  // Removed to prevent clearing the diagram during streaming
    
    try {
      // Add the chat message before generating diagram with the current diagram version
      setChatHistory(prev => [...prev, {
        role: 'user',
        content: promptText,
        timestamp: new Date(),
        diagramVersion: currentDiagram // include current version with the message
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
      
      // Flag to track if we've received any diagram content
      let hasReceivedContent = false;
      
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
            hasReceivedContent = true;
            updateDiagramWithBuffer(message.mermaidSyntax);
            if (message.isComplete) {
              finalDiagram = message.mermaidSyntax;
              
              // Wait a moment to ensure the final render is complete before saving
              setTimeout(async () => {
                try {
                  // Render one final time with a stable ID to ensure a clean result
                  const finalRenderResult = await renderDiagram(message.mermaidSyntax);
                  if (!finalRenderResult) {
                    console.warn('Warning: Final diagram render had issues, but will continue with save');
                  }
                } catch (error) {
                  console.error('Error during final render:', error);
                }
              }, 500);
            }
          }
        }
      }
      
      if (finalDiagram) {
        // Get previous diagram versions for the version selector
        const previousVersions = [
          finalDiagram, // The new diagram
          ...(currentVersion && currentVersion !== finalDiagram ? [currentVersion] : []), // Current diagram if different
          ...history
            .filter(item => item.diagram && item.diagram !== finalDiagram && item.diagram !== currentVersion)
            .slice(0, 3) // Limit to 3 previous versions
            .map(item => item.diagram)
        ];
        
        // Update the last chat message with the finalized diagram version and version history
        setChatHistory(prev => {
          const newHistory = [...prev];
          // Add an assistant message with the diagram version
          newHistory.push({
            role: 'assistant',
            content: 'Diagram updated.',
            timestamp: new Date(),
            diagramVersion: finalDiagram
          });
          return newHistory;
        });

        // Now try rendering the final syntax.
        // Instead of throwing on render failure, we just log a warning.
        const renderSuccess = await renderDiagram(finalDiagram);
        if (!renderSuccess) {
          console.error(
            'Warning: Diagram rendered with errors, but history has been updated with the correct syntax'
          );
        }
        
        // Wait a moment to ensure the SVG is fully rendered before saving history
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Save the diagram version to the project history
        await updateHistory(promptText, finalDiagram, 'chat');
      } else if (!hasReceivedContent) {
        // Only throw an error if we didn't receive any content at all
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
  const handleCodeChange = async (codeOrEvent: string | React.ChangeEvent<HTMLTextAreaElement>) => {
    // Determine if input is a string or an event object
    const newCode = typeof codeOrEvent === 'string' 
      ? codeOrEvent 
      : codeOrEvent.target?.value || '';
    
    if (!newCode) return;
    
    setCurrentDiagram(newCode);
    
    try {
      // First render the diagram
      const renderSuccess = await renderDiagram(newCode);
      if (!renderSuccess) {
        setError('Failed to render diagram');
        return;
      }
      
      // Wait a moment to ensure the SVG is fully rendered before saving history
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Then save to history
      await updateHistory('', newCode, 'code');
    } catch (error) {
      console.error('Error updating diagram:', error);
      setError(error instanceof Error ? error.message : String(error));
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
    // Add a processing message to chat history immediately
    setChatHistory(prev => [
      ...prev,
      {
        role: 'system',
        content: `Processing document ${file.name}...`,
        timestamp: new Date(),
      },
    ]);
    
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
      
      // Update the chat history with document analysis result
      setChatHistory(prev => [
        ...prev,
        {
          role: 'document',
          content: `Document Analysis: ${file.name}`,
          timestamp: new Date(),
          documentSource: file.name,
        },
      ]);
      
      // Set the prompt to a message prompting the user to add instructions
      setPrompt("What would you like to create with this document?");
      
      // Close the file upload dropdown after successful processing
      setShowFileUpload(false);
    } catch (error) {
      console.error('Error processing document:', error);
      setError(error instanceof Error ? error.message : 'Failed to process document');
      
      // Add error message to chat history
      setChatHistory(prev => [
        ...prev,
        {
          role: 'system',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to process document'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsProcessingFile(false);
    }
  };

  // --- website processing ---
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
      
      // Set the prompt to a message prompting the user to add instructions
      setPrompt("What would you like to create with this website content?");
      
      // Close the file upload dropdown after successful processing
      setShowFileUpload(false);
      
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
    // Add a processing message to chat history immediately
    setChatHistory(prev => [
      ...prev,
      {
        role: 'system',
        content: `Processing ${file.name}...`,
        timestamp: new Date(),
      },
    ]);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('diagramType', diagramType);
      formData.append('extractOnly', 'true'); // Add flag to indicate we only want to extract info
      
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
      
      // Add the document summary to chat history
      setChatHistory(prev => [
        ...prev,
        {
          role: 'document',
          content: message || `Document Analysis: ${file.name}`,
          timestamp: new Date(),
          documentSource: file.name,
        },
      ]);
      
      // Set the prompt to a simple question instead of the extracted summary
      setPrompt("What would you like to create with this document?");
      
      // Close the file upload dropdown after successful processing
      setShowFileUpload(false);
      
      // Add system message about successful processing
      setChatHistory(prev => [
        ...prev,
        {
          role: 'system',
          content: "Document analyzed. You can now provide instructions to generate a diagram.",
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Error processing document:', error);
      setError(error instanceof Error ? error.message : 'Failed to process document');
      
      // Add error message to chat history
      setChatHistory(prev => [
        ...prev,
        {
          role: 'system',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to process document'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const updateHistory = async (prompt: string, diagram: string, updateType: string) => {
    try {
      // Make sure we have the latest SVG output
      if (!svgOutput && diagram) {
        console.log('No SVG output available, attempting to render diagram first');
        await renderDiagram(diagram);
        // Small delay to ensure rendering completes
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      const response = await fetch('/api/project-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          prompt,
          diagram,
          updateType,
          diagram_img: svgOutput,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Server error response:', errorData);
        throw new Error(`Failed to save history: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving history:', error);
      return null;
    }
  };

  // --- diagram version select ---
  const handleDiagramVersionSelect = useCallback(async (version: string) => {
    try {
      console.log('handleDiagramVersionSelect called with version:', version);
      
      if (!version) {
        console.error('No version provided to handleDiagramVersionSelect');
        return;
      }
      
      // Set flag to prevent position reset during version selection
      setIsVersionSelectionInProgress(true);
      
      // Force clear the current SVG output to ensure a fresh render
      setSvgOutput('');
      
      // Set the current diagram to the selected version
      setCurrentDiagram(version);
      console.log('Current diagram set to:', version);
      
      // Small delay to ensure state updates before rendering
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Render the diagram first and wait for it to complete
      console.log('Attempting to render diagram...');
      
      // Force mermaid to re-initialize before rendering
      if (typeof window !== 'undefined') {
        try {
          // Use a unique ID for this specific render to avoid caching issues
          const uniqueRenderID = `diagram-${projectId}-${Date.now()}`;
          
          // Initialize with current theme
          mermaid.initialize({
            startOnLoad: false,
            theme: currentTheme,
            // @ts-ignore - These properties exist in newer versions of Mermaid
            suppressErrorsInDOM: true,
            errorLabelColor: 'transparent',
          });
          
          console.log('Directly rendering with mermaid...');
          const { svg } = await mermaid.render(uniqueRenderID, version);
          
          // Directly set the SVG output
          setSvgOutput(svg);
          console.log('SVG output directly set, length:', svg.length);
          
          // Wait a moment to ensure the SVG is fully rendered before saving history
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Save this version to history with the updated SVG output
          console.log('Saving to history...');
          await updateHistory('Reverted to previous version', version, 'reversion');
          console.log('History updated successfully');
          
          // Add a system message to the chat history
          setChatHistory(prev => [
            ...prev,
            {
              role: 'system',
              content: 'Reverted to previous diagram version.',
              timestamp: new Date()
            }
          ]);
          
          console.log('Successfully reverted to diagram version');
          
          // Reset flag after version selection is complete
          setIsVersionSelectionInProgress(false);
          return;
        } catch (error) {
          console.error('Error in direct mermaid render:', error);
        }
      }
      
      // Fallback to standard render if direct render fails
      const renderSuccess = await renderDiagram(version);
      
      if (!renderSuccess) {
        console.error('Failed to render diagram version');
        // Reset flag even on failure
        setIsVersionSelectionInProgress(false);
        return;
      }
      console.log('Diagram rendered successfully');
      
      // Wait a moment to ensure the SVG is fully rendered before saving history
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Save this version to history with the updated SVG output
      console.log('Saving to history...');
      await updateHistory('Reverted to previous version', version, 'reversion');
      console.log('History updated successfully');
      
      // Add a system message to the chat history
      setChatHistory(prev => [
        ...prev,
        {
          role: 'system',
          content: 'Reverted to previous diagram version.',
          timestamp: new Date()
        }
      ]);
      
      console.log('Successfully reverted to diagram version');
    } catch (error) {
      console.error('Error handling diagram version selection:', error);
    } finally {
      // Ensure flag is reset regardless of success or failure
      setIsVersionSelectionInProgress(false);
    }
  }, [currentTheme, projectId, renderDiagram, setChatHistory, setCurrentDiagram, setSvgOutput, updateHistory]);

  // --- image processing ---
  const processImage = async (file: File) => {
    setIsProcessingImage(true);
    // Add a processing message to chat history immediately
    setChatHistory(prev => [
      ...prev,
      {
        role: 'system',
        content: `Processing image ${file.name}...`,
        timestamp: new Date(),
      },
    ]);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('diagramType', diagramType);
      formData.append('extractOnly', 'true'); // Add flag to indicate we only want to extract info
      
      const response = await fetch('/api/process-image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process image');
      }
      
      // Update this line to handle both description and summary fields
      const data = await response.json();
      const extractedText = data.description || data.summary || '';
      
      // Add the image description to chat history
      setChatHistory(prev => [
        ...prev,
        {
          role: 'document',
          content: `Image Analysis: ${file.name}`,
          timestamp: new Date(),
          documentSource: file.name,
        },
      ]);
      
      // Set the prompt to a message prompting the user to add instructions
      setPrompt("What would you like to create with this image?");
      setDocumentSummary(extractedText);
      
      // Close the file upload dropdown after successful processing
      setShowFileUpload(false);
      
      // Add system message about successful processing
      setChatHistory(prev => [
        ...prev,
        {
          role: 'system',
          content: "Image analyzed. You can now provide instructions to generate a diagram.",
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Error processing image:', error);
      setError(error instanceof Error ? error.message : 'Failed to process image');
      
      // Add error message to chat history
      setChatHistory(prev => [
        ...prev,
        {
          role: 'system',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to process image'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsProcessingImage(false);
    }
  };

  // --- image upload handler ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if the file is an image
    if (!file.type.startsWith('image/')) {
      setError('File is not an image');
      return;
    }
    
    await processImage(file);
  };

  // Add theme change function
  const changeTheme = (newTheme: MermaidTheme) => {
    setCurrentTheme(newTheme);
    // Re-render the diagram with the new theme
    renderDiagram();
  };

  return {
    prompt,
    setPrompt,
    lastPrompt,
    isGenerating,
    error,
    showPromptPanel,
    setShowPromptPanel,
    svgOutput,
    scale,
    setScale,
    position,
    setPosition,
    isDragging,
    setIsDragging,
    dragStart,
    setDragStart,
    currentDiagram,
    setCurrentDiagram,
    svgRef,
    diagramRef,
    chatContainerRef,
    editorMode,
    setEditorMode,
    isEditorReady,
    setIsEditorReady,
    isProcessingFile,
    documentSummary,
    chatHistory,
    setChatHistory,
    showFileUpload,
    setShowFileUpload,
    handleFileUpload,
    handleGenerateDiagram,
    handleCodeChange,
    showExportMenu,
    setShowExportMenu,
    downloadSVG,
    downloadPNG,
    showImageUpload,
    setShowImageUpload,
    handleImageUpload,
    isProcessingImage,
    isLoading,
    renderError,
    isDownloading,
    currentTheme,
    changeTheme,
    handleDiagramVersionSelect,
    renderDiagram,
    processWebsite,
    isVersionSelectionInProgress,
  };
}

export default useDiagramEditor; 

function sanitizeGanttDiagram(diagramText: string): string {
  // First, split and clean all lines
  let lines = diagramText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line); // Remove empty lines

  // Initialize the sanitized lines array
  const sanitizedLines: string[] = [];
  
  // Process each line with proper indentation
  lines.forEach(line => {
    if (line.startsWith('gantt')) {
      sanitizedLines.push('gantt');
    }
    else if (line.startsWith('title ')) {
      sanitizedLines.push('    ' + line);
    }
    else if (line.startsWith('dateFormat ')) {
      sanitizedLines.push('    ' + line);
    }
    else if (line.startsWith('excludes ')) {
      sanitizedLines.push('    ' + line);
    }
    else if (line.startsWith('todayMarker ')) {
      sanitizedLines.push('    ' + line);
    }
    else if (line.startsWith('section ')) {
      // Add blank line before sections (except first section)
      if (sanitizedLines.some(l => l.includes('section'))) {
        sanitizedLines.push('');
      }
      sanitizedLines.push('section ' + line.substring(8));
    }
    else if (line.includes(':')) {
      // This is a task line
      const taskParts = line.split(':').map(part => part.trim());
      const taskName = taskParts[0];
      const taskDetails = taskParts[1];
      
      // Ensure task name has consistent spacing and task details are properly formatted
      sanitizedLines.push(`    ${taskName} :${taskDetails}`);
    }
  });

  // Ensure required headers are present and properly formatted
  if (!lines.some(l => l.startsWith('dateFormat'))) {
    sanitizedLines.splice(1, 0, '    dateFormat YYYY-MM-DD');
  }
  // Add proper spacing between sections
  const finalLines = sanitizedLines.join('\n');

  // Clean up any invalid dependencies
  return finalLines
    .split('\n')
    .map(line => {
      if (line.includes('after')) {
        // Ensure proper spacing around 'after' keyword
        return line.replace(/\s*after\s*/, ' after ');
      }
      return line;
    })
    .join('\n');
} 
