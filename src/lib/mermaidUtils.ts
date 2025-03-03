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
    },
    architecture: {
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
  
  // Handle architecture diagrams
  if (diagramType === 'architecture' || processedCode.includes('architecture-beta')) {
    // Make sure it starts with architecture-beta
    if (!processedCode.includes('architecture-beta')) {
      processedCode = 'architecture-beta\n' + processedCode;
    }
    
    // Apply connection optimizations to avoid text overlaps
    processedCode = optimizeArchitectureConnections(processedCode);
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
 * Optimizes architecture diagram connections to prevent text overlaps
 * @param code The mermaid architecture diagram code
 * @returns Optimized code with better connection positioning
 */
function optimizeArchitectureConnections(code: string): string {
  let processedCode = code;
  
  // Remove any mermaid prefix from the code to avoid double declaration
  processedCode = processedCode.replace(/^\s*mermaid\s*\n/i, '');
  
  // First do the basic syntax fixes
  // Ensure proper spacing around connections
  processedCode = processedCode.replace(/(\w+):{1}([TBLR])\s*-+>\s*([TBLR]):{1}(\w+)/g, '$1:$2 --> $3:$4');
  processedCode = processedCode.replace(/(\w+):{1}([TBLR])\s*<-+\s*([TBLR]):{1}(\w+)/g, '$1:$2 <-- $3:$4');
  processedCode = processedCode.replace(/(\w+):{1}([TBLR])\s*-+\s*([TBLR]):{1}(\w+)/g, '$1:$2 -- $3:$4');
  
  // Ensure no trailing spaces in connections
  processedCode = processedCode.replace(/-\s+-/g, '--');
  processedCode = processedCode.replace(/-\s+>/g, '->');
  processedCode = processedCode.replace(/<\s+-/g, '<-');
  
  // Ensure correct group and service syntax
  processedCode = processedCode.replace(/group\s+(\w+)\s*\(([^)]+)\)\s*\[([^\]]+)\]\s*in\s+(\w+)/g, 'group $1($2)[$3] in $4');
  processedCode = processedCode.replace(/service\s+(\w+)\s*\(([^)]+)\)\s*\[([^\]]+)\]\s*in\s+(\w+)/g, 'service $1($2)[$3] in $4');
  
  // Fix junction syntax
  processedCode = processedCode.replace(/junction\s+(\w+)\s*in\s+(\w+)/g, 'junction $1 in $2');
  
  // Ensure proper direction indicators (T|B|L|R)
  processedCode = processedCode.replace(/:([^TBLR]):/, ':T:');
  
  // Remove any brackets from connection declarations
  processedCode = processedCode.replace(/\[([TBLR])\]/g, '$1');
  processedCode = processedCode.replace(/\]([TBLR])\[/g, ']:$1[');
  
  // Now parse line by line for the advanced connection optimizations
  const lines = processedCode.split('\n');
  const optimizedLines: string[] = [];
  const serviceMap = new Map<string, { inGroup: string | null, hasConnections: boolean }>();
  
  // Track connection complexity to determine if junctions are needed
  const connections: Array<{ from: string, fromPos: string, to: string, toPos: string, line: string }> = [];
  let hasComplexConnectionPatterns = false;
  
  // First pass: collect all services and their groups
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Track services and their groups
    if (trimmedLine.startsWith('service ')) {
      const serviceMatch = trimmedLine.match(/service\s+(\w+)\(.*\)\s*\[.*\](?:\s+in\s+(\w+))?/);
      if (serviceMatch) {
        const [, serviceId, groupId] = serviceMatch;
        serviceMap.set(serviceId, { inGroup: groupId || null, hasConnections: false });
      }
    }
    
    // Track connections
    const connectionMatch = trimmedLine.match(/(\w+):([TBLR])\s*(--|-->|<--)\s*([TBLR]):(\w+)/);
    if (connectionMatch) {
      const [, fromNode, fromPos, , toPos, toNode] = connectionMatch;
      connections.push({ from: fromNode, fromPos, to: toNode, toPos, line: trimmedLine });
    }
  }
  
  // Check if we need to introduce junctions to avoid overlaps
  hasComplexConnectionPatterns = detectComplexConnectionPatterns(connections);
  const useJunctions = hasComplexConnectionPatterns && connections.length > 5;
  
  // If we need junctions, add them for complex connection patterns
  let junctionAdded = false;
  let junctionCounter = 1;
  const junctionMap = new Map<string, string>(); // Maps connection points to junction IDs
  
  // First, add all non-connection lines
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (!trimmedLine.match(/(\w+):([TBLR])\s*(--|-->|<--)\s*([TBLR]):(\w+)/)) {
      // If this is where we add architecture-beta, also add our spacing metadata
      if (trimmedLine === 'architecture-beta' && !junctionAdded) {
        optimizedLines.push(trimmedLine);
        optimizedLines.push('%% Optimized for preventing text/line overlaps');
        
        // If we're using junctions, also add that metadata
        if (useJunctions) {
          optimizedLines.push('%% Using junctions to avoid complex connection overlaps');
        }
        
        junctionAdded = true;
      } else {
        optimizedLines.push(trimmedLine);
      }
    }
  }
  
  // Now handle connections
  if (useJunctions) {
    // Get the first group name to add junctions to
    let targetGroup = null;
    for (const [, info] of serviceMap.entries()) {
      if (info.inGroup) {
        targetGroup = info.inGroup;
        break;
      }
    }
    
    // Add junction declarations
    const junctions = new Set<string>();
    
    // Identify connection patterns that need junctions
    for (let i = 0; i < connections.length; i++) {
      const conn = connections[i];
      
      // Check if this connection crosses other connections
      let needsJunction = false;
      for (let j = 0; j < connections.length; j++) {
        if (i === j) continue;
        const otherConn = connections[j];
        
        // Simplified crossing detection - if connections share nodes
        // or have opposite directions, they might cross
        if (conn.from === otherConn.to || conn.to === otherConn.from ||
            (conn.fromPos === 'L' && otherConn.fromPos === 'R') ||
            (conn.fromPos === 'T' && otherConn.fromPos === 'B')) {
          needsJunction = true;
          break;
        }
      }
      
      if (needsJunction) {
        // Create a junction for this connection
        const junctionId = `junction_${junctionCounter++}`;
        junctions.add(junctionId);
        
        // Map this connection to the junction
        junctionMap.set(`${conn.from}:${conn.fromPos}-${conn.to}:${conn.toPos}`, junctionId);
      }
    }
    
    // Add junction declarations
    for (const junctionId of junctions) {
      const junctionLine = targetGroup 
        ? `junction ${junctionId} in ${targetGroup}`
        : `junction ${junctionId}`;
      optimizedLines.push(junctionLine);
    }
    
    // Now add optimized connections using junctions
    for (const conn of connections) {
      const connectionKey = `${conn.from}:${conn.fromPos}-${conn.to}:${conn.toPos}`;
      const junctionId = junctionMap.get(connectionKey);
      
      if (junctionId) {
        // Use the junction to route this connection
        // Extract the connector type (-- or --> or <--)
        const connectorMatch = conn.line.match(/\s+(--|-->|<--)\s+/);
        const connector = connectorMatch ? connectorMatch[1] : '--';
        
        // Preserve the connection type when using junctions
        optimizedLines.push(`${conn.from}:${conn.fromPos} ${connector} L:${junctionId}`);
        optimizedLines.push(`${junctionId}:R ${connector} ${conn.toPos}:${conn.to}`);
      } else {
        // Optimize this connection directly
        let optimizedLine = conn.line;
        
        // Fix same-side connections
        if (conn.fromPos === conn.toPos) {
          if (conn.fromPos === 'T' || conn.fromPos === 'B') {
            optimizedLine = `${conn.from}:L -- R:${conn.to}`;
          } else if (conn.fromPos === 'L' || conn.fromPos === 'R') {
            optimizedLine = `${conn.from}:T -- B:${conn.to}`;
          }
        }
        
        // Optimize bottom-to-top connections
        if (conn.fromPos === 'B' && conn.toPos === 'T') {
          optimizedLine = `${conn.from}:R -- L:${conn.to}`;
        }
        
        optimizedLines.push(optimizedLine);
      }
    }
  } else {
    // Simple optimization without junctions
    for (const conn of connections) {
      let optimizedLine = conn.line;
      
      // Fix same-side connections
      if (conn.fromPos === conn.toPos) {
        if (conn.fromPos === 'T' || conn.fromPos === 'B') {
          optimizedLine = `${conn.from}:L -- R:${conn.to}`;
        } else if (conn.fromPos === 'L' || conn.fromPos === 'R') {
          optimizedLine = `${conn.from}:T -- B:${conn.to}`;
        }
      }
      
      // Optimize bottom-to-top connections
      if (conn.fromPos === 'B' && conn.toPos === 'T') {
        optimizedLine = `${conn.from}:R -- L:${conn.to}`;
      }
      
      optimizedLines.push(optimizedLine);
    }
  }
  
  return optimizedLines.join('\n');
}

/**
 * Detects complex connection patterns that might benefit from junctions
 * @param connections List of connections in the diagram
 * @returns True if complex patterns are detected
 */
function detectComplexConnectionPatterns(
  connections: Array<{ from: string, fromPos: string, to: string, toPos: string, line: string }>
): boolean {
  // Count how many connections each node has
  const nodeConnectionCount = new Map<string, number>();
  
  for (const conn of connections) {
    nodeConnectionCount.set(conn.from, (nodeConnectionCount.get(conn.from) || 0) + 1);
    nodeConnectionCount.set(conn.to, (nodeConnectionCount.get(conn.to) || 0) + 1);
  }
  
  // Check for nodes with many connections (hub nodes)
  const hasHubNodes = Array.from(nodeConnectionCount.values()).some(count => count > 3);
  
  // Check for potential crossing patterns
  let hasCrossingPatterns = false;
  for (let i = 0; i < connections.length; i++) {
    for (let j = i + 1; j < connections.length; j++) {
      const connA = connections[i];
      const connB = connections[j];
      
      // Simple crossing detection: connections with opposite directions
      if ((connA.fromPos === 'L' && connB.fromPos === 'R') ||
          (connA.fromPos === 'R' && connB.fromPos === 'L') ||
          (connA.fromPos === 'T' && connB.fromPos === 'B') ||
          (connA.fromPos === 'B' && connB.fromPos === 'T')) {
        hasCrossingPatterns = true;
        break;
      }
    }
    if (hasCrossingPatterns) break;
  }
  
  return hasHubNodes || hasCrossingPatterns;
}

/**
 * Generate SVG from Mermaid code - reliable version
 */
export async function generateSvgFromMermaid(code: string, fallbackSvg?: string): Promise<string> {
  if (!code.trim()) {
    return fallbackSvg || '<svg></svg>';
  }
  
  try {
    // Ensure mermaid is initialized
    if (typeof window !== 'undefined' && !window.mermaid) {
      initializeMermaid();
    }
    
    // Check if this is an architecture diagram
    const isArchitectureDiagram = code.includes('architecture-beta');
    
    // For architecture diagrams, apply additional preprocessing
    if (isArchitectureDiagram) {
      code = ensureArchitectureSyntax(code);
    }
    
    // Generate SVG
    const { svg } = await mermaid.render('mermaid-svg-' + Math.random().toString(36).substring(2, 10), code);
    
    // Clean up SVG
    const cleanedSvg = cleanSvgString(svg);
    return cleanedSvg;
  } catch (error) {
    console.error('Error generating SVG from Mermaid:', error);
    
    // For architecture diagrams in beta, provide a more helpful fallback message
    if (code.includes('architecture-beta')) {
      return fallbackSvg || `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="100">
        <rect width="500" height="100" fill="#f8d7da" stroke="#dc3545" stroke-width="2" rx="10" ry="10"/>
        <text x="50%" y="50%" font-family="Arial" font-size="16" fill="#dc3545" text-anchor="middle" dominant-baseline="middle">
          Architecture diagram parsing error - Check syntax
        </text>
      </svg>`;
    }
    
    return fallbackSvg || '<svg></svg>';
  }
}

// Add this helper function
function ensureArchitectureSyntax(code: string): string {
  let processedCode = code.trim();
  
  // Make sure it starts with architecture-beta if it's not explicitly marked
  if (!processedCode.startsWith('architecture-beta')) {
    processedCode = 'architecture-beta\n' + processedCode;
  }
  
  // Split the code into lines and process each line
  const lines = processedCode.split('\n');
  const processedLines = lines.map(line => {
    const trimmedLine = line.trim();
    
    // Handle group declarations
    if (trimmedLine.startsWith('group ') && !trimmedLine.includes('(') && !trimmedLine.includes('[')) {
      return trimmedLine.replace(/group\s+(\w+)(.*)/, 'group $1(cloud)[$1]$2');
    }
    
    // Handle service declarations without icon or label
    if (trimmedLine.startsWith('service ') && !trimmedLine.includes('(') && !trimmedLine.includes('[')) {
      return trimmedLine.replace(/service\s+(\w+)(.*)/, 'service $1(server)[$1]$2');
    }
    
    // Handle edge declarations with enhanced positioning to prevent text overlaps
    if (trimmedLine.includes(':') && (trimmedLine.includes('--') || trimmedLine.includes('->') || trimmedLine.includes('<-'))) {
      // Ensure proper spacing
      let processedLine = trimmedLine
        .replace(/(\w+):([TBLR])\s*-+>\s*([TBLR]):(\w+)/g, '$1:$2 --> $3:$4')
        .replace(/(\w+):([TBLR])\s*<-+\s*([TBLR]):(\w+)/g, '$1:$2 <-- $3:$4')
        .replace(/(\w+):([TBLR])\s*-+\s*([TBLR]):(\w+)/g, '$1:$2 -- $3:$4');
      
      // Optimize edge positions to avoid text overlaps
      // Check if both endpoints are using the same position (e.g., both T or both B)
      // and adjust if needed to reduce text overlaps
      const edgeRegex = /(\w+):([TBLR])\s*(--|-->|<--)\s*([TBLR]):(\w+)/;
      const match = processedLine.match(edgeRegex);
      
      if (match) {
        const [, fromNode, fromPos, connector, toPos, toNode] = match;
        
        // If source and target positions are the same, adjust one of them
        // to reduce the chance of text overlaps
        if (fromPos === toPos) {
          if (fromPos === 'T' || fromPos === 'B') {
            // For vertical alignments (T-T or B-B), change to use L-R instead
            processedLine = `${fromNode}:L ${connector} R:${toNode}`;
          } else if (fromPos === 'L' || fromPos === 'R') {
            // For horizontal alignments (L-L or R-R), change to use T-B instead
            processedLine = `${fromNode}:T ${connector} B:${toNode}`;
          }
        }
        
        // If connecting from bottom to top (B-T), add more clarity by using R-L if possible
        if (fromPos === 'B' && toPos === 'T') {
          processedLine = `${fromNode}:R ${connector} L:${toNode}`;
        }
      }
      
      return processedLine;
    }
    
    return trimmedLine;
  });

  // Add a configuration line at the beginning to ensure better spacing 
  // between nodes in architecture diagrams
  if (!processedLines.some(line => line.includes('%%spacing:'))) {
    processedLines.splice(1, 0, '%% Optimized spacing to prevent text/line overlaps');
  }
  
  return processedLines.join('\n');
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
  try {
    if (!code.trim()) {
      return { valid: false, message: 'Diagram code is empty' };
    }

    // Special handling for architecture diagrams
    if (diagramType === 'architecture' || code.includes('architecture-beta')) {
      // Perform basic validation for architecture diagrams
      const architectureBasicCheck = performArchitectureValidation(code);
      if (!architectureBasicCheck.valid) {
        return architectureBasicCheck;
      }
      
      // For architecture diagrams in beta, perform only basic checks
      // since Mermaid's parser might not fully support all features yet
      return { valid: true, message: null };
    }

    // For other diagram types, proceed with standard validation
    const basicCheck = performBasicValidation(code);
    if (!basicCheck.valid) {
      return basicCheck;
    }

    // Try to preprocess first
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

// Add this new function after the performBasicValidation function
const performArchitectureValidation = (code: string): { valid: boolean; message: string | null } => {
  try {
    const trimmedCode = code.trim();
    
    // Check if it starts with architecture-beta
    if (!trimmedCode.startsWith('architecture-beta')) {
      return { 
        valid: false, 
        message: 'Architecture diagrams must start with "architecture-beta"' 
      };
    }
    
    // Check for basic structure requirements
    const lines = trimmedCode.split('\n');
    let hasGroup = false;
    let hasService = false;
    let hasEdge = false;
    
    // Track potential overlap issues
    const connectionPairs: Array<{ from: string, fromPos: string, to: string, toPos: string }> = [];
    let potentialOverlapIssues = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('group ')) {
        hasGroup = true;
      } else if (trimmedLine.startsWith('service ')) {
        hasService = true;
      } else {
        // Check for connections and identify potential overlap patterns
        const connMatch = trimmedLine.match(/(\w+):([TBLR])\s*(--|-->|<--)\s*([TBLR]):(\w+)/);
        if (connMatch) {
          hasEdge = true;
          
          const [, fromNode, fromPos, , toPos, toNode] = connMatch;
          connectionPairs.push({ from: fromNode, fromPos, to: toNode, toPos });
          
          // Identify connection patterns that might cause text overlaps
          if (fromPos === toPos) {
            // Same-side connections often cause overlaps (T-T, B-B, L-L, R-R)
            potentialOverlapIssues = true;
          }
        }
      }
    }
    
    if (!hasService) {
      return { 
        valid: false, 
        message: 'Architecture diagram should contain at least one service' 
      };
    }
    
    // The diagram is considered valid for processing, but we'll add warnings about potential overlaps
    if (potentialOverlapIssues) {
      // We're not returning an error since we have automatic optimization,
      // but we can log this for development purposes
      console.log('Architecture diagram has potential text overlap issues that will be automatically optimized');
    }
    
    return { valid: true, message: null };
  } catch (error) {
    return { 
      valid: false, 
      message: `Architecture validation error: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}; 