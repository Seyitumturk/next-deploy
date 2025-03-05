import React from 'react';

interface FallbackDiagramVisualizerProps {
  type: 'loading' | 'error' | 'processing' | 'syntax_error';
  diagramType?: string;
  message?: string;
  progress?: number;
  errorDetails?: string;
}

/**
 * Extracts useful information from error messages
 */
function getErrorSummary(errorDetails?: string) {
  if (!errorDetails) return { line: null, message: 'Unknown error' };
  
  // Extract line number if present
  const lineMatch = errorDetails.match(/line\s+(\d+)/i);
  const line = lineMatch ? parseInt(lineMatch[1]) : null;
  
  // Check for common errors
  if (errorDetails.includes('classDef end')) {
    return {
      line,
      message: "'end' is a reserved keyword in Mermaid",
      suggestion: "Rename the class to 'endClass' or another name"
    };
  }
  
  if (errorDetails.includes('Parse error')) {
    return {
      line,
      message: 'Syntax error in diagram code',
      suggestion: line ? `Check line ${line} for missing symbols or incorrect syntax` : null
    };
  }
  
  return { line, message: errorDetails };
}

/**
 * A component that provides a fallback visualization when a diagram 
 * is being generated or when there's an error generating the diagram.
 * 
 * This returns an SVG as a string that can be used as the fallback visualization.
 */
const FallbackDiagramVisualizer: React.FC<FallbackDiagramVisualizerProps> = ({
  type = 'loading',
  diagramType = 'diagram',
  message = '',
  progress = 0,
  errorDetails
}) => {
  const getPlaceholderSvg = (): string => {
    switch (type) {
      case 'loading':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="300" viewBox="0 0 800 300">
          <style>
            .loading-text { font-family: sans-serif; font-size: 24px; fill: #718096; }
            .loading-subtext { font-family: sans-serif; font-size: 16px; fill: #A0AEC0; }
            @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
            .pulsing { animation: pulse 1.5s infinite; }
          </style>
          <rect width="100%" height="100%" fill="#F7FAFC" rx="8" ry="8" />
          <text x="50%" y="40%" text-anchor="middle" class="loading-text pulsing">Processing diagram...</text>
          <text x="50%" y="50%" text-anchor="middle" class="loading-subtext">Generating visualization</text>
        </svg>`;
        
      case 'processing':
        // For processing state, simplify to just show the same as loading
        return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="300" viewBox="0 0 800 300">
          <style>
            .loading-text { font-family: sans-serif; font-size: 24px; fill: #718096; }
            .loading-subtext { font-family: sans-serif; font-size: 16px; fill: #A0AEC0; }
            @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
            .pulsing { animation: pulse 1.5s infinite; }
          </style>
          <rect width="100%" height="100%" fill="#F7FAFC" rx="8" ry="8" />
          <text x="50%" y="40%" text-anchor="middle" class="loading-text pulsing">Processing diagram...</text>
          <text x="50%" y="50%" text-anchor="middle" class="loading-subtext">Generating visualization</text>
        </svg>`;
      
      case 'syntax_error':
        // Simplify syntax error to show same as generic error
        return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="300" viewBox="0 0 800 300">
          <style>
            .error-text { font-family: sans-serif; font-size: 20px; fill: #E53E3E; }
            .error-subtext { font-family: sans-serif; font-size: 14px; fill: #718096; }
          </style>
          <rect width="100%" height="100%" fill="#FFF5F5" rx="8" ry="8" />
          <circle cx="400" cy="100" r="30" fill="#FEB2B2" />
          <text x="400" y="110" text-anchor="middle" font-size="30" fill="#E53E3E">!</text>
          <text x="50%" y="160" text-anchor="middle" class="error-text">Error generating diagram</text>
          <text x="50%" y="190" text-anchor="middle" class="error-subtext">${message || 'Unable to generate diagram'}</text>
        </svg>`;
        
      case 'error':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="300" viewBox="0 0 800 300">
          <style>
            .error-text { font-family: sans-serif; font-size: 20px; fill: #E53E3E; }
            .error-subtext { font-family: sans-serif; font-size: 14px; fill: #718096; }
          </style>
          <rect width="100%" height="100%" fill="#FFF5F5" rx="8" ry="8" />
          <circle cx="400" cy="100" r="30" fill="#FEB2B2" />
          <text x="400" y="110" text-anchor="middle" font-size="30" fill="#E53E3E">!</text>
          <text x="50%" y="160" text-anchor="middle" class="error-text">Error generating diagram</text>
          <text x="50%" y="190" text-anchor="middle" class="error-subtext">${message || 'Unable to generate diagram'}</text>
        </svg>`;
        
      default:
        return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="300" viewBox="0 0 800 300">
          <rect width="100%" height="100%" fill="#F7FAFC" rx="8" ry="8" />
          <text x="50%" y="50%" text-anchor="middle" font-family="sans-serif" font-size="16px" fill="#A0AEC0">
            Generating diagram...
          </text>
        </svg>`;
    }
  };

  return (
    <div
      className="fallback-diagram-container"
      dangerouslySetInnerHTML={{ __html: getPlaceholderSvg() }}
    />
  );
};

export default FallbackDiagramVisualizer; 