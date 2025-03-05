import React, { useEffect, useRef, useState } from 'react';
import { DiagramType } from '../models/Project';
import { 
  useMermaidCleanup, 
  generateSvgFromMermaid, 
  preprocessMermaidCode,
  initializeMermaid
} from '@/lib/mermaidUtils';

interface DiagramRendererProps {
  content?: string;
  fallbackSvg?: string;
  diagramType?: string;
  isLoading?: boolean;
  project?: {diagramType?: string};
  onSvgRendered?: (svg: string) => void;
  onError?: (error: string) => void;
  suppressErrors?: boolean;
}

const DiagramRenderer: React.FC<DiagramRendererProps> = ({
  content = '',
  fallbackSvg,
  diagramType,
  isLoading = false,
  project = null,
  onSvgRendered,
  onError,
  suppressErrors = true
}) => {
  const diagramRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use our custom hook to clean up Mermaid error elements
  useMermaidCleanup(diagramRef);

  // Function to clean any error elements from the container
  const cleanErrorElements = () => {
    if (!diagramRef.current) return;
    
    // Get all error-related elements inside the container
    const errorElements = diagramRef.current.querySelectorAll(
      '.error, .error-icon, .error-text, .error-message, ' +
      '[class*="error"], [id*="error"], ' +
      'div.mermaid > div:not(svg)'
    );
    
    // Remove them
    errorElements.forEach(el => el.remove());
    
    // Also clean global errors that Mermaid creates
    if (typeof document !== 'undefined') {
      document.querySelectorAll('.error, .error-icon, .error-text, [id*="mermaid-error"]')
        .forEach(el => el.remove());
    }
  };

  // Function to render the diagram
  const renderDiagram = async (mermaidCode: string) => {
    if (!mermaidCode.trim()) {
      if (diagramRef.current && fallbackSvg) {
        diagramRef.current.innerHTML = fallbackSvg;
      }
      return;
    }
    
    setIsRendering(true);
    
    // Clear any existing timeout
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }
    
    // Determine actual diagram type
    let effectiveDiagramType = diagramType;
    if (!effectiveDiagramType && project?.diagramType) {
      effectiveDiagramType = project.diagramType.toLowerCase();
    }
    
    try {
      // Preprocess code to fix common syntax issues
      const processedCode = preprocessMermaidCode(mermaidCode, effectiveDiagramType);
      
      // Render the diagram
      const svg = await generateSvgFromMermaid(processedCode, fallbackSvg);
      
      if (diagramRef.current) {
        // Set the SVG content
        diagramRef.current.innerHTML = svg;
        
        // Clean up any error elements
        cleanErrorElements();
        
        // Call the callback with the rendered SVG
        if (onSvgRendered) {
          onSvgRendered(svg);
        }
      }
      
      setError('');
    } catch (err: any) {
      console.error('Mermaid rendering error:', err);
      const errorMessage = err?.message || 'Error rendering diagram';
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
      
      // Show fallback SVG on error
      if (diagramRef.current) {
        if (fallbackSvg) {
          diagramRef.current.innerHTML = fallbackSvg;
        } else {
          // Minimal fallback SVG with no error text
          const minimalFallback = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="300" viewBox="0 0 800 300">
            <rect width="100%" height="100%" fill="#F9FAFB" rx="8" ry="8" />
            <text x="50%" y="50%" text-anchor="middle" font-family="sans-serif" font-size="14px" fill="#9CA3AF">
              Diagram preview will appear here
            </text>
          </svg>`;
          
          diagramRef.current.innerHTML = minimalFallback;
        }
      }
    } finally {
      setIsRendering(false);
    }
  };

  // Effect to trigger diagram rendering when content changes
  useEffect(() => {
    if (content && !isLoading) {
      renderDiagram(content);
      
      // Set up a periodic cleanup to remove any errors that appear
      const cleanup = setInterval(cleanErrorElements, 300);
      return () => clearInterval(cleanup);
    } else if (isLoading && fallbackSvg && diagramRef.current) {
      // Show loading state with fallback SVG
      diagramRef.current.innerHTML = fallbackSvg;
    } else if (!content && diagramRef.current) {
      // Clear the diagram area
      diagramRef.current.innerHTML = '';
    }
    
    // Cleanup function to clear timeout
    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [content, isLoading, fallbackSvg, diagramType]);

  return (
    <div 
      ref={diagramRef} 
      className="diagram-container relative w-full min-h-[300px] overflow-visible bg-white dark:bg-[#282424] rounded-lg shadow-sm transition-all"
      data-rendering={isRendering ? 'true' : 'false'}
      data-error={error ? 'true' : 'false'}
      data-diagram-type={diagramType || 'unknown'}
    >
      {isLoading && !fallbackSvg && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex flex-col items-center">
            <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Generating diagram...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagramRenderer; 