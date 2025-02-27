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
          <text x="50%" y="40%" text-anchor="middle" class="loading-text pulsing">Processing your ${diagramType} diagram...</text>
          <text x="50%" y="50%" text-anchor="middle" class="loading-subtext">We're preparing your visualization</text>
        </svg>`;
        
      case 'processing':
        // For processing state, show a progress bar if progress is provided
        const progressWidth = Math.max(0, Math.min(100, progress)) * 6; // Scale to 600px max
        return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="300" viewBox="0 0 800 300">
          <style>
            .loading-text { font-family: sans-serif; font-size: 24px; fill: #718096; }
            .loading-subtext { font-family: sans-serif; font-size: 16px; fill: #A0AEC0; }
            .progress-text { font-family: sans-serif; font-size: 14px; fill: #4B5563; }
          </style>
          <rect width="100%" height="100%" fill="#F7FAFC" rx="8" ry="8" />
          <text x="50%" y="35%" text-anchor="middle" class="loading-text">Building your ${diagramType} diagram</text>
          <text x="50%" y="45%" text-anchor="middle" class="loading-subtext">${message || 'Creating visualization from your description'}</text>
          
          <!-- Progress bar background -->
          <rect x="100" y="170" width="600" height="20" rx="10" fill="#E5E7EB" />
          
          <!-- Progress bar fill -->
          <rect x="100" y="170" width="${progressWidth}" height="20" rx="10" fill="#3B82F6" />
          
          <!-- Progress percentage -->
          <text x="50%" y="210" text-anchor="middle" class="progress-text">${progress}% complete</text>
        </svg>`;
      
      case 'syntax_error':
        // Extract useful information from the error message
        const error = getErrorSummary(errorDetails);
        return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="300" viewBox="0 0 800 300">
          <style>
            .error-title { font-family: sans-serif; font-size: 20px; fill: #DC2626; }
            .error-message { font-family: sans-serif; font-size: 16px; fill: #4B5563; }
            .error-detail { font-family: sans-serif; font-size: 14px; fill: #6B7280; }
            .error-suggestion { font-family: sans-serif; font-size: 14px; fill: #1E40AF; }
          </style>
          <rect width="100%" height="100%" fill="#FEF2F2" rx="8" ry="8" />
          <circle cx="400" cy="80" r="30" fill="#FEE2E2" />
          <text x="400" y="88" text-anchor="middle" font-size="24" fill="#DC2626">!</text>
          <text x="50%" y="140" text-anchor="middle" class="error-title">Syntax Error in ${diagramType} Diagram</text>
          <text x="50%" y="170" text-anchor="middle" class="error-message">${error.message}</text>
          ${error.line ? `<text x="50%" y="200" text-anchor="middle" class="error-detail">Line ${error.line}</text>` : ''}
          ${error.suggestion ? `<text x="50%" y="230" text-anchor="middle" class="error-suggestion">Tip: ${error.suggestion}</text>` : ''}
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
          <text x="50%" y="190" text-anchor="middle" class="error-subtext">${message || 'Please check your input and try again'}</text>
          <text x="50%" y="220" text-anchor="middle" class="error-subtext">We'll show you a preview when ready</text>
        </svg>`;
        
      default:
        return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="300" viewBox="0 0 800 300">
          <rect width="100%" height="100%" fill="#F7FAFC" rx="8" ry="8" />
          <text x="50%" y="50%" text-anchor="middle" font-family="sans-serif" font-size="16px" fill="#A0AEC0">
            Diagram visualization is being prepared...
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