"use client";

import mermaid from 'mermaid';
import { useRef, useEffect } from 'react';

type MermaidInitOptions = {
  theme?: string;
  fontFamily?: string;
  customConfig?: Record<string, any>;
};

/**
 * Configure Mermaid with default settings
 * This function should be called once at app initialization
 */
export function initializeMermaid(options: MermaidInitOptions = {}) {
  const {
    theme = 'neutral',
    fontFamily = 'sans-serif',
    customConfig = {}
  } = options;

  // Simple configuration that works reliably
  mermaid.initialize({
    startOnLoad: false,
    theme: theme,
    securityLevel: 'loose',
    flowchart: {
      htmlLabels: true,
      useMaxWidth: false,
    },
    sequence: {
      useMaxWidth: false,
    },
    gantt: {
      useMaxWidth: false,
    },
    er: {
      useMaxWidth: false,
    }
  });
}

/**
 * Clean SVG of any error elements
 * @param svgString - The SVG string to clean
 * @returns The cleaned SVG string
 */
export function cleanSvgString(svgString: string): string {
  if (!svgString || typeof document === 'undefined') return svgString;
  
  try {
    // Parse the SVG as an XML document
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    
    // Remove error elements
    const errorElements = svgDoc.querySelectorAll('.error, .error-icon, .error-text, .error-message');
    errorElements.forEach(el => el.remove());
    
    // Serialize back to string
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgDoc);
  } catch (error) {
    console.error('Error cleaning SVG string:', error);
    return svgString; // Return original if cleaning fails
  }
}

/**
 * Preprocess Mermaid code to fix common syntax issues
 * 
 * @param code - The Mermaid code to preprocess
 * @param diagramType - The expected diagram type
 * @returns The processed Mermaid code
 */
export function preprocessMermaidCode(code: string, diagramType?: string): string {
  if (!code.trim()) return code;
  
  let processedCode = code.trim();
  
  // Remove markdown code block syntax
  processedCode = processedCode.replace(/```(?:mermaid)?\n?/g, '').replace(/```$/g, '');
  
  // Handle flowchart specifics - this is the most problematic type
  if (diagramType === 'flowchart' || processedCode.includes('flowchart') || processedCode.includes('graph')) {
    // Make sure flowchart has a direction
    if (processedCode.startsWith('flowchart') && !(/flowchart\s+(TD|TB|BT|RL|LR)/i.test(processedCode))) {
      processedCode = processedCode.replace('flowchart', 'flowchart TD');
    }
    
    // Fix classDef with 'end' keyword (common issue)
    processedCode = processedCode.replace(/classDef\s+end\s+/g, 'classDef endClass ');
    
    // Add missing semicolons
    processedCode = processedCode.replace(/(\bclassDef\s+\w+\s+[^;]+)(?=\n|$)/g, '$1;');
    processedCode = processedCode.replace(/(\bstyle\s+\w+\s+[^;]+)(?=\n|$)/g, '$1;');
  }
  
  // Make sure we have the right prefix
  if (diagramType && !processedCode.toLowerCase().includes(diagramType.toLowerCase())) {
    // Map of diagram types to their correct prefix
    const prefixMap: {[key: string]: string} = {
      'flowchart': 'flowchart TD',
      'sequence': 'sequenceDiagram',
      'class': 'classDiagram',
      'er': 'erDiagram',
      'gantt': 'gantt',
      'pie': 'pie',
      'mindmap': 'mindmap'
    };
    
    const prefix = prefixMap[diagramType] || diagramType;
    processedCode = `${prefix}\n${processedCode}`;
  }
  
  return processedCode;
}

/**
 * Generate SVG from Mermaid code - reliable version
 */
export async function generateSvgFromMermaid(code: string, fallbackSvg?: string): Promise<string> {
  if (!code.trim()) {
    return fallbackSvg || '';
  }
  
  try {
    // Initialize mermaid
    initializeMermaid();
    
    // Generate unique ID to avoid collisions
    const id = `mermaid-${Date.now()}`;
    
    // Render and return the SVG
    const { svg } = await mermaid.render(id, code);
    return cleanSvgString(svg);
  } catch (error) {
    console.error('Failed to generate SVG:', error);
    
    if (fallbackSvg) {
      return fallbackSvg;
    }
    
    // Return a minimal error SVG that won't show error text
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="300" viewBox="0 0 800 300">
      <rect width="100%" height="100%" fill="#F9FAFB" rx="8" ry="8" />
      <text x="50%" y="50%" text-anchor="middle" font-family="sans-serif" font-size="16px" fill="#9CA3AF">
        Diagram preview will appear here
      </text>
    </svg>`;
  }
}

/**
 * Custom hook to remove error elements from the DOM
 */
export function useMermaidCleanup(containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Function to clean error elements
    const cleanupErrors = () => {
      if (!containerRef.current) return;
      
      // Clean internal elements
      const errorElements = containerRef.current.querySelectorAll(
        '.error, .error-icon, .error-text, .error-message, ' +
        '[class*="error"], [id*="error"], ' +
        'div.mermaid > div:not(svg)'
      );
      errorElements.forEach(el => el.remove());
      
      // Also clean document errors that Mermaid creates outside the container
      if (typeof document !== 'undefined') {
        document.querySelectorAll('.error, .error-icon, .error-text, .error-message, [id*="mermaid-error"]')
          .forEach(el => {
            // Check if it's not inside our container before removing
            if (!containerRef.current?.contains(el)) {
              el.remove();
            }
          });
      }
    };
    
    // Clean immediately
    cleanupErrors();
    
    // Set up interval for continuous cleaning
    const interval = setInterval(cleanupErrors, 200);
    
    // Set up observer to catch errors as they appear
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(cleanupErrors);
      observer.observe(document.body, { childList: true, subtree: true });
      
      return () => {
        clearInterval(interval);
        observer.disconnect();
      };
    }
    
    return () => clearInterval(interval);
  }, [containerRef]);
}

/**
 * Validates Mermaid code without rendering it
 * @param code The Mermaid code to validate
 * @param diagramType Optional diagram type for preprocessing
 * @returns Promise with validation result
 */
export const validateMermaidCode = async (
  code: string,
  diagramType?: string
): Promise<{ valid: boolean; message: string | null }> => {
  if (!code.trim()) {
    return { valid: false, message: 'Diagram code cannot be empty' };
  }

  // Try to preprocess first
  try {
    const processedCode = preprocessMermaidCode(code, diagramType);
    
    // Basic syntax checks before sending to mermaid parser
    // Check if code starts with valid diagram type
    const validDiagramTypes = [
      'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 
      'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie',
      'gitGraph', 'mindmap', 'timeline', 'C4Context'
    ];
    
    // Extract first word/line
    const firstLine = processedCode.trim().split(/\s+|\n/)[0];
    const hasDiagramType = validDiagramTypes.some(type => 
      firstLine.toLowerCase().includes(type.toLowerCase())
    );
    
    if (!hasDiagramType) {
      return { 
        valid: false, 
        message: `Diagram must start with a valid type like '${diagramType || 'flowchart'}'. Found: '${firstLine}'` 
      };
    }
    
    // Ensure browser environment before using mermaid
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        // Initialize mermaid if needed
        if (!window.mermaid) {
          await import('mermaid').then(m => {
            window.mermaid = m.default;
            initializeMermaid();
          });
        }
        
        // Use mermaid parser for validation
        const { parse } = window.mermaid;
        if (typeof parse === 'function') {
          try {
            parse(processedCode);
            return { valid: true, message: null };
          } catch (error) {
            if (error instanceof Error) {
              // Extract useful parts from mermaid error message
              const errorMsg = error.message;
              const match = errorMsg.match(/Parse error on line (\d+):(.+)/);
              if (match) {
                const [, lineNum, details] = match;
                return { 
                  valid: false, 
                  message: `Error on line ${lineNum}: ${details.trim()}` 
                };
              }
              return { valid: false, message: errorMsg };
            }
            return { valid: false, message: 'Invalid syntax in diagram code' };
          }
        } else {
          // Fallback basic validation without mermaid parser
          return performBasicValidation(processedCode);
        }
      } catch (error) {
        // Fallback when mermaid is not available
        return performBasicValidation(processedCode);
      }
    } else {
      // We're in a server environment, perform basic validation only
      return performBasicValidation(processedCode);
    }
  } catch (error) {
    return { 
      valid: false, 
      message: error instanceof Error ? error.message : 'Invalid diagram code' 
    };
  }
};

/**
 * Performs basic validation of Mermaid code when mermaid parser is not available
 */
const performBasicValidation = (code: string): { valid: boolean; message: string | null } => {
  // Check for basic syntax elements
  const lines = code.split('\n');
  
  // Check for basic bracket/parenthesis balance
  const openBrackets = (code.match(/\{/g) || []).length;
  const closeBrackets = (code.match(/\}/g) || []).length;
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  const openSquare = (code.match(/\[/g) || []).length;
  const closeSquare = (code.match(/\]/g) || []).length;
  
  if (openBrackets !== closeBrackets) {
    return { valid: false, message: 'Unbalanced curly braces {} in diagram code' };
  }
  
  if (openParens !== closeParens) {
    return { valid: false, message: 'Unbalanced parentheses () in diagram code' };
  }
  
  if (openSquare !== closeSquare) {
    return { valid: false, message: 'Unbalanced square brackets [] in diagram code' };
  }
  
  // Check for common syntax patterns based on diagram type
  if (code.includes('-->') || code.includes('->')) {
    // Likely a flowchart or sequence diagram
    // Check for valid node definitions for flowcharts
    const hasNodes = code.match(/\b[A-Za-z0-9_]+\s*(\[|\(|\{)/);
    if (!hasNodes && (code.includes('flowchart') || code.includes('graph'))) {
      return { 
        valid: false, 
        message: 'Flowchart syntax error: No valid node definitions found' 
      };
    }
  }
  
  // It passes our basic checks
  return { valid: true, message: null };
};

/**
 * Custom hook for safely initializing mermaid in client components
 */
export const useSafeMermaidInit = (options = {}) => {
  const isMounted = useRef(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && !isMounted.current) {
      try {
        // Dynamically import mermaid when needed
        import('mermaid').then(m => {
          window.mermaid = m.default;
          initializeMermaid(options);
          isMounted.current = true;
        });
      } catch (error) {
        console.error('Failed to initialize mermaid:', error);
      }
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [options]);
};

// Declare global mermaid type for TypeScript
declare global {
  interface Window {
    mermaid: typeof import('mermaid') & { 
      parse?: (text: string) => void 
    };
  }
} 