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
          logLevel: 1,
          deterministicIds: true,
          sequence: { useMaxWidth: false },
          gantt: {
            titleTopMargin: 25,
            barHeight: 30,
            barGap: 8,
            topPadding: 50,
            leftPadding: 100,
            rightPadding: 100,
            fontSize: 12,
            numberSectionStyles: 4,
            axisFormat: '%Y-%m-%d',
            displayMode: '',
            useMaxWidth: false
          }
        });
        
        // Add specific handling for Gantt diagrams
        if (diagramText.trim().toLowerCase().startsWith('gantt')) {
          diagramText = sanitizeGanttDiagram(diagramText);
        }

        // --- Updated: Use a container with proper dimensions for gantt rendering ---
        const container = document.createElement('div');
        // Use a different container style if rendering a mindmap so that streaming works properly.
        if (diagramType.toLowerCase() === 'mindmap') {
          // Use the legacy hidden container style (as in the old version)
          container.style.cssText = 'position: absolute; visibility: hidden; width: 0; height: 0; overflow: hidden;';
        } else {
          // Updated container style for other diagram types
          container.style.cssText = 'position: absolute; top: -9999px; left: -9999px; width: 1200px; height: auto; overflow: hidden;';
        }
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
        // Removed extra replacement of "parallel" since it conflicts with the latest Gantt chart syntax.
        // if (diagramToRender.trim().toLowerCase().startsWith('gantt')) {
        //   diagramToRender = diagramToRender.replace(/\bparallel\b/gi, 'after');
        // }
        // --- End: Sanitize gantt diagram text ---

        // Remove markdown code fences (```mermaid ... ```) and extra whitespace
        const cleanedDiagram = diagramToRender
          .replace(/```(mermaid)?/gi, '')  // remove opening "```mermaid" if present
          .replace(/```/g, '')            // remove closing fences
          .trim();

        // Additional cleaning: Extract the diagram portion if extra text exists.
        // For architecture diagrams, start from "architecture-beta".
        let finalDiagramText = cleanedDiagram;
        if (finalDiagramText.includes('architecture-beta')) {
          finalDiagramText = finalDiagramText.slice(finalDiagramText.indexOf('architecture-beta'));
        }

        // --- If this is an architecture diagram but doesn't start with "architecture-beta", prepend it.
        if (
          diagramType.toLowerCase() === 'architecture' &&
          !finalDiagramText.trim().toLowerCase().startsWith('architecture-beta')
        ) {
          finalDiagramText = "architecture-beta\n" + finalDiagramText;
        }

        // --- Sanitize architecture diagrams by removing ampersands and cleaning group/service labels.
        if (finalDiagramText.trim().toLowerCase().startsWith('architecture-beta')) {
          // Remove ampersand characters that can break the parser.
          finalDiagramText = finalDiagramText.replace(/&/g, '');
          // Replace forward slashes in the label portions of group and service declarations.
          finalDiagramText = finalDiagramText.replace(
            /(group|service)(\s+\S+\(\S+\)\[)([^\]]+)(\])/gi,
            (_, type, prefix, label, suffix) => {
              const cleanedLabel = label.replace(/\//g, ' '); // Replace "/" with a space.
              return type + prefix + cleanedLabel + suffix;
            }
          );
        }

        // --- Final whitespace normalization ---
        if (diagramType.toLowerCase() !== 'mindmap') {
          finalDiagramText = finalDiagramText
            .split('\n')
            .map(line => line.trim())
            .join('\n');
        }
        
        // --- Remove extraneous 'end' lines for architecture diagrams ---
        if (diagramType.toLowerCase() === 'architecture') {
          finalDiagramText = finalDiagramText
            .split('\n')
            .filter(line => line.trim().toLowerCase() !== 'end')
            .join('\n');
        }

        // --- Additional sanitization for architecture diagrams ---
        if (
          diagramType.toLowerCase() === 'architecture' &&
          finalDiagramText.toLowerCase().startsWith('architecture-beta')
        ) {
          // Remove any comment lines (start with "//") to avoid stray arrow tokens.
          finalDiagramText = finalDiagramText
            .split('\n')
            .filter(line => !line.trim().startsWith('//'))
            .join('\n');
          
          // Replace any "->" with "--" globally to correct stray arrow tokens.
          finalDiagramText = finalDiagramText.replace(/->/g, '--');
          // Process the diagram text line by line.
          finalDiagramText = finalDiagramText.split('\n').map(line => {
            // If the line appears to be an edge declaration (contains '--')
            if (line.includes('--')) {
              const match = line.match(/^(\S+)\s+(-->|--)\s+(\S+)$/);
              if (match) {
                let left = match[1];
                const op = match[2];
                let right = match[3];
                // Append default port directions if missing.
                if (!left.includes(':')) {
                  left = left + ':R';
                }
                if (!right.includes(':')) {
                  right = 'L:' + right;
                }
                return `${left} ${op} ${right}`;
              }
            }
            return line;
          }).join('\n');
        }

        // --- New processing for Kanban diagrams ---
        if (diagramType.toLowerCase() === 'kanban') {
          // Ensure the diagram starts with the 'kanban' keyword.
          if (!finalDiagramText.trim().toLowerCase().startsWith('kanban')) {
            finalDiagramText = "kanban\n" + finalDiagramText;
          }
          // (Optional) Add any additional kanban-specific sanitization here if needed.
        }

        const { svg } = await mermaid.render('diagram-' + Date.now(), finalDiagramText, container);
        document.body.removeChild(container);
        
        // Process the SVG to make it responsive: remove fixed dimensions and set to full container width/height
        let newSvg = svg;
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(svg, "image/svg+xml");
          // Check for any parsing errors in the SVG markup
          if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
            console.error("SVG parser error:", xmlDoc.getElementsByTagName("parsererror")[0].textContent);
            setError("The diagram contains syntax errors. Please correct them and try again.");
            return false; // Abort updating SVG output
          }
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
        console.error('Mermaid initialization error:', err);
        currentTry++;
        if (currentTry === maxRetries) {
          throw err;
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
    
    // Don't clear existing SVG output during streaming to maintain visibility
    // of the diagram as it's being generated
    renderDiagram(newContent).catch(error => {
      console.warn('Non-critical error during streaming render:', error);
      // Continue showing the previous successful render if there's an error
      // This prevents flickering during streaming
    });
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
    
    try {
      // Find the SVG element
      const svgElement = svgRef.current.querySelector('svg');
      if (!svgElement) {
        console.error('SVG element not found');
        return;
      }
      
      // Create a deep clone to avoid modifying the displayed SVG
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // Add embedded fonts
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      `;
      clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);
      
      // Get the actual bounding box of the diagram content
      const bbox = svgElement.getBBox();
      
      // Add some padding around the content
      const padding = 20;
      const viewBoxX = bbox.x - padding;
      const viewBoxY = bbox.y - padding;
      const viewBoxWidth = bbox.width + (padding * 2);
      const viewBoxHeight = bbox.height + (padding * 2);
      
      // Set dimensions based on content, not viewport
      clonedSvg.setAttribute('width', viewBoxWidth.toString());
      clonedSvg.setAttribute('height', viewBoxHeight.toString());
      clonedSvg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
      
      // Ensure all text elements use the correct font
      clonedSvg.querySelectorAll('text').forEach(textElement => {
        textElement.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      });
      
      // Serialize the SVG to a string
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      
      // Create a Blob with the SVG data
      const svgBlob = new Blob([
        '<?xml version="1.0" standalone="no"?>\r\n',
        '<?xml-stylesheet type="text/css" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" ?>\r\n',
        svgData
      ], { type: 'image/svg+xml;charset=utf-8' });
      
      // Create a download link
      const url = URL.createObjectURL(svgBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getFormattedFileName('svg');
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('SVG download successful');
    } catch (error) {
      console.error('Error downloading SVG:', error);
    }
  };

  const downloadPNG = async (transparent: boolean = false) => {
    if (!svgRef.current) return;
    
    try {
      // Find the SVG element
      const svgElement = svgRef.current.querySelector('svg');
      if (!svgElement) {
        console.error('SVG element not found');
        return;
      }
      
      // Create a deep clone to avoid modifying the displayed SVG
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // Add embedded fonts
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      `;
      clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);
      
      // Get the actual bounding box of the diagram content
      const bbox = svgElement.getBBox();
      
      // Add padding around the content
      const padding = 40; // More padding for PNG
      const viewBoxX = bbox.x - padding;
      const viewBoxY = bbox.y - padding;
      const viewBoxWidth = bbox.width + (padding * 2);
      const viewBoxHeight = bbox.height + (padding * 2);
      
      // Use a higher scale factor for better quality
      const pngScale = 3; // Increased from 2 to 3 for higher resolution
      const width = Math.ceil(viewBoxWidth * pngScale);
      const height = Math.ceil(viewBoxHeight * pngScale);
      
      // Set dimensions and viewBox
      clonedSvg.setAttribute('width', width.toString());
      clonedSvg.setAttribute('height', height.toString());
      clonedSvg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
      
      // Ensure all text elements use the correct font
      clonedSvg.querySelectorAll('text').forEach(textElement => {
        textElement.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      });
      
      // Serialize the SVG to a string
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      
      // Wait for fonts to load
      await document.fonts.ready;
      await document.fonts.load('12px "Inter"');
      
      // Create a data URL from the SVG
      const svgUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      
      // Create an image from the SVG
      const img = new Image();
      img.src = svgUrl;
      
      // Wait for the image to load
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => {
          console.error('Error loading image:', e);
          reject(new Error('Failed to load SVG as image'));
        };
        // Set a timeout in case the image never loads
        setTimeout(() => reject(new Error('Image load timeout')), 5000);
      });
      
      // Create a canvas with the correct dimensions
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      // Get the 2D context
      const ctx = canvas.getContext('2d', { alpha: transparent });
      if (!ctx) {
        console.error('Failed to get canvas context');
        return;
      }
      
      // Fill the background if not transparent
      if (!transparent) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // Enable high-quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw the image onto the canvas
      ctx.drawImage(img, 0, 0, width, height);
      
      // For diagrams that might need special handling
      if (diagramType.toLowerCase() === 'gantt' || diagramType.toLowerCase() === 'mindmap') {
        // Apply additional sharpening or specific rendering adjustments if needed
        applyDiagramSpecificOptimizations(ctx, diagramType, width, height);
      }
      
      // Convert the canvas to a PNG data URL
      // Use higher quality setting for better output
      const pngUrl = canvas.toDataURL('image/png', 1.0);
      
      // Create a download link
      const link = document.createElement('a');
      link.download = getFormattedFileName('png', transparent);
      link.href = pngUrl;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('PNG download successful');
    } catch (error) {
      console.error('Error downloading PNG:', error);
    }
  };

  // Helper function for diagram-specific optimizations
  const applyDiagramSpecificOptimizations = (
    ctx: CanvasRenderingContext2D,
    diagramType: string,
    width: number,
    height: number
  ) => {
    // Apply specific optimizations based on diagram type
    switch (diagramType.toLowerCase()) {
      case 'gantt':
        // Gantt charts often have thin lines that need to be preserved
        // This is a simple sharpening filter
        try {
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;
          const sharpenFactor = 0.5;
          
          // Simple sharpening algorithm
          for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
              const idx = (y * width + x) * 4;
              
              // For each color channel (R, G, B)
              for (let c = 0; c < 3; c++) {
                const current = data[idx + c];
                const neighbors = [
                  data[idx - width * 4 + c], // top
                  data[idx + width * 4 + c], // bottom
                  data[idx - 4 + c],         // left
                  data[idx + 4 + c]          // right
                ];
                
                const avg = neighbors.reduce((sum, val) => sum + val, 0) / 4;
                data[idx + c] = Math.min(255, Math.max(0, current + (current - avg) * sharpenFactor));
              }
            }
          }
          
          ctx.putImageData(imageData, 0, 0);
        } catch (e) {
          console.warn('Gantt chart optimization failed:', e);
        }
        break;
        
      case 'mindmap':
        // Mindmaps might need different optimizations
        // For now, we'll just ensure the edges are crisp
        try {
          ctx.globalCompositeOperation = 'source-over';
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
        } catch (e) {
          console.warn('Mindmap optimization failed:', e);
        }
        break;
        
      // Add more cases for other diagram types as needed
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

        // Save the diagram version to the project history
        await updateHistory(promptText, finalDiagram, 'chat');
        
        // Now try rendering the final syntax.
        // Instead of throwing on render failure, we just log a warning.
        const renderSuccess = await renderDiagram(finalDiagram);
        if (!renderSuccess) {
          console.error(
            'Warning: Diagram rendered with errors, but history has been updated with the correct syntax'
          );
          // We do NOT throw an error here so that the saved version remains accessible.
        }
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
      await updateHistory(prompt, newCode, 'code');
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
      await updateHistory(prompt, version, 'reversion');
    } catch (error) {
      console.error('Error saving diagram version:', error);
    }
  }, [prompt, renderDiagram]);

  const updateHistory = async (prompt: string, diagram: string, updateType: string) => {
    try {
      const response = await fetch('/api/project-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: projectId, // Pass as part of body instead of URL
          prompt,
          diagram,
          updateType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update history');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating history:', error);
      throw error;
    }
  };

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