import { useCallback, useEffect } from 'react';
import mermaid from 'mermaid';
import { MermaidTheme } from '../types';
import { sanitizeGanttDiagram } from '../utils/diagramUtils';

interface UseDiagramRenderingProps {
  currentDiagram?: string;
  setCurrentDiagram: React.Dispatch<React.SetStateAction<string | undefined>>;
  setSvgOutput: React.Dispatch<React.SetStateAction<string>>;
  setVersionId: React.Dispatch<React.SetStateAction<string>>;
  setRenderError: React.Dispatch<React.SetStateAction<string | null>>;
  currentTheme: MermaidTheme;
  setCurrentTheme: (theme: MermaidTheme) => void;
  diagramType: string;
}

const useDiagramRendering = ({
  currentDiagram,
  setCurrentDiagram,
  setSvgOutput,
  setVersionId,
  setRenderError,
  currentTheme,
  setCurrentTheme,
  diagramType
}: UseDiagramRenderingProps) => {
  // Initialize mermaid with current settings
  useEffect(() => {
    try {
      mermaid.initialize({
        theme: currentTheme,
        startOnLoad: true,
        securityLevel: 'loose',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        themeVariables: {
          fontSize: '14px',
          primaryColor: currentTheme === 'dark' ? '#3B82F6' : '#2563EB',
          primaryTextColor: currentTheme === 'dark' ? '#F3F4F6' : '#1F2937',
          primaryBorderColor: currentTheme === 'dark' ? '#3B82F6' : '#2563EB',
          lineColor: currentTheme === 'dark' ? '#9CA3AF' : '#6B7280',
          secondaryColor: currentTheme === 'dark' ? '#1E40AF' : '#3B82F6',
          tertiaryColor: currentTheme === 'dark' ? '#111827' : '#F3F4F6',
        },
        gantt: {
          barHeight: 20,
          fontSize: 14,
          sectionFontSize: 14,
          barGap: 4,
        },
      });
    } catch (error) {
      console.error('Error initializing mermaid:', error);
    }
  }, [currentTheme]);

  // Main rendering function
  const renderDiagram = useCallback(async (diagramCode?: string): Promise<boolean> => {
    const codeToRender = diagramCode || currentDiagram;
    console.log(`[renderDiagram] Starting diagram rendering, code provided: ${!!diagramCode}, currentDiagram exists: ${!!currentDiagram}`);
    console.log(`[renderDiagram] Code length to render: ${codeToRender?.length || 0}`);
    
    if (!codeToRender) {
      console.log(`[renderDiagram] No diagram code to render, clearing SVG output`);
      setSvgOutput('');
      return false;
    }

    // Process different diagram types if needed
    let processedCode = codeToRender;
    if (diagramType === 'gantt') {
      processedCode = sanitizeGanttDiagram(codeToRender);
      console.log(`[renderDiagram] Processed gantt diagram, new code length: ${processedCode.length}`);
    }

    try {
      // Generate a unique version ID for this rendering attempt
      const versionId = `diagram-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      setVersionId(versionId);
      console.log(`[renderDiagram] Generated version ID: ${versionId}`);

      // Clear any previous render errors before attempting to render
      setRenderError(null);

      // Attempt to render with mermaid
      console.log(`[renderDiagram] Calling mermaid.render with versionId: ${versionId}`);
      const { svg } = await mermaid.render(versionId, processedCode);
      console.log(`[renderDiagram] Mermaid render returned SVG, length: ${svg?.length || 0}`);
      
      // Only set SVG output if we have valid SVG content
      if (svg && svg.includes('<svg') && svg.includes('</svg>')) {
        console.log(`[renderDiagram] Valid SVG generated, enhancing with dimensions`);
        const enhancedSvg = ensureSvgDimensions(svg);
        console.log(`[renderDiagram] Setting SVG output, length: ${enhancedSvg.length}`);
        setSvgOutput(enhancedSvg);
        return true;
      }
      
      // If SVG isn't valid, don't update the display
      console.warn('[renderDiagram] Invalid SVG generated');
      return false;
    } catch (error: any) {
      // Log the error to console but don't display it to user
      console.error('[renderDiagram] Error rendering diagram:', error);
      
      // Set error message for UI display only for actual syntax errors
      // This prevents false "failed" states at the end of streaming
      if (error.message && (
        error.message.includes('Syntax error') || 
        error.message.includes('Parse error') ||
        error.message.includes('Invalid') ||
        error.message.includes('Expected') ||
        error.message.includes('Expecting') ||
        error.message.includes('Unexpected token') ||
        error.message.includes('not defined') ||
        error.message.includes('missing')
      )) {
        setRenderError(`Diagram syntax error: ${error.message}`);
      } else {
        // For other types of errors, don't set render error to avoid "failed" state
        // This helps with stream-end errors that aren't actually syntax issues
        console.log('[renderDiagram] Non-syntax error encountered, not showing as render error');
      }
      
      return false;
    }
  }, [currentDiagram, diagramType, setSvgOutput, setRenderError, setVersionId]);

  // Function to ensure SVG has proper dimensions for rendering
  const ensureSvgDimensions = (svgString: string): string => {
    try {
      console.log(`[ensureSvgDimensions] Ensuring dimensions for SVG, input length: ${svgString.length}`);
      // Parse the SVG string into a DOM element
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
      const svgElement = svgDoc.documentElement;
      
      // Make sure the SVG has width and height attributes
      if (!svgElement.hasAttribute('width') || !svgElement.hasAttribute('height')) {
        console.log(`[ensureSvgDimensions] SVG missing dimensions, width: ${svgElement.hasAttribute('width')}, height: ${svgElement.hasAttribute('height')}`);
        
        // Get the viewBox values if available
        if (svgElement.hasAttribute('viewBox')) {
          const viewBox = svgElement.getAttribute('viewBox')?.split(' ');
          console.log(`[ensureSvgDimensions] Found viewBox: ${svgElement.getAttribute('viewBox')}`);
          
          if (viewBox && viewBox.length === 4) {
            const width = viewBox[2];
            const height = viewBox[3];
            
            if (!svgElement.hasAttribute('width')) {
              console.log(`[ensureSvgDimensions] Setting width to ${width}`);
              svgElement.setAttribute('width', width);
            }
            
            if (!svgElement.hasAttribute('height')) {
              console.log(`[ensureSvgDimensions] Setting height to ${height}`);
              svgElement.setAttribute('height', height);
            }
          }
        } else {
          // Default dimensions if no viewBox
          if (!svgElement.hasAttribute('width')) {
            console.log(`[ensureSvgDimensions] No viewBox found, setting default width to 800`);
            svgElement.setAttribute('width', '800');
          }
          
          if (!svgElement.hasAttribute('height')) {
            console.log(`[ensureSvgDimensions] No viewBox found, setting default height to 600`);
            svgElement.setAttribute('height', '600');
          }
        }
      }
      
      // Add preserveAspectRatio attribute if not present
      if (!svgElement.hasAttribute('preserveAspectRatio')) {
        console.log(`[ensureSvgDimensions] Adding preserveAspectRatio attribute`);
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }
      
      const result = new XMLSerializer().serializeToString(svgDoc);
      console.log(`[ensureSvgDimensions] Enhanced SVG generated, length: ${result.length}`);
      return result;
    } catch (error) {
      console.error('[ensureSvgDimensions] Error ensuring SVG dimensions:', error);
      return svgString; // Return original if something goes wrong
    }
  };

  // Handle code changes directly
  const handleCodeChange = useCallback(async (codeOrEvent: string | React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = typeof codeOrEvent === 'string' 
      ? codeOrEvent 
      : codeOrEvent.target.value;
    
    setCurrentDiagram(newCode);
    
    // Auto-render with a small debounce to prevent too many renders
    // Clear any existing timeout
    if ((handleCodeChange as any).timeoutId) {
      clearTimeout((handleCodeChange as any).timeoutId);
    }
    
    // Set a new timeout to render after a short delay
    (handleCodeChange as any).timeoutId = setTimeout(() => {
      renderDiagram(newCode);
    }, 500); // 500ms debounce
  }, [setCurrentDiagram, renderDiagram]);

  // Change theme function
  const changeTheme = useCallback((newTheme: MermaidTheme) => {
    setCurrentTheme(newTheme);
    
    // Re-render diagram with new theme
    if (currentDiagram) {
      setTimeout(() => {
        renderDiagram(currentDiagram);
      }, 100); // Small delay to ensure theme is applied
    }
  }, [currentDiagram, renderDiagram, setCurrentTheme]);

  return {
    renderDiagram,
    handleCodeChange,
    changeTheme,
  };
};

export default useDiagramRendering; 