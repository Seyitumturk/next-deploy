import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { DiagramType } from '../models/Project';
import { useMermaidCleanup } from '@/lib/useMermaidCleanup';

const DiagramRenderer: React.FC = () => {
  const diagramRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = React.useState('');
  const [project, setProject] = React.useState<{diagramType?: string} | null>(null);
  const [error, setError] = React.useState('');
  
  // Use our custom hook to clean up Mermaid error elements
  useMermaidCleanup(diagramRef);

  useEffect(() => {
    if (content) {
      try {
        const diagramType = project?.diagramType || '';
        let mermaidCode = '';
        
        // Format the content based on diagram type
        switch (diagramType) {
          case DiagramType.FLOWCHART:
          case DiagramType.SEQUENCE:
          case DiagramType.CLASS:
          case DiagramType.STATE:
          case DiagramType.ER:
          case DiagramType.GANTT:
          case DiagramType.PIE:
          case DiagramType.MINDMAP:
          case DiagramType.TIMELINE:
          case DiagramType.ARCHITECTURE:
            mermaidCode = content;
            break;
          default:
            mermaidCode = content;
        }
        
        // Ensure mermaid is configured to suppress error blocks
        mermaid.initialize({
          startOnLoad: false,
          // @ts-ignore - These properties exist in newer versions of Mermaid
          suppressErrorsInDOM: true,
          errorLabelColor: 'transparent',
        });
        
        // Use a unique ID for each render
        const uniqueId = `mermaid-diagram-${Date.now()}`;
        
        mermaid.render(uniqueId, mermaidCode)
          .then(result => {
            if (diagramRef.current) {
              diagramRef.current.innerHTML = result.svg;
              
              // Remove any error elements that might have been added
              setTimeout(() => {
                const errorSelectors = [
                  '.error-icon',
                  '.error-text',
                  '.error-message',
                  '.marker.cross',
                  'g[class*="error"]',
                  'g[class*="flowchart-error"]',
                  'g[class*="syntax-error"]',
                  'g[class*="mermaid-error"]',
                  '[id*="mermaid-error"]',
                  '.mermaid > g.error',
                  '.mermaid > svg > g.error',
                  '.mermaid-error',
                  '.diagramError',
                  '.diagram-error',
                  '.syntax-error',
                  'svg[aria-roledescription="error"]',
                  'svg[aria-roledescription="syntax-error"]'
                ];
                
                // Remove from diagramRef
                if (diagramRef.current) {
                  errorSelectors.forEach(selector => {
                    diagramRef.current?.querySelectorAll(selector).forEach(el => {
                      el.remove();
                    });
                  });
                  
                  // Also remove by ID pattern
                  diagramRef.current.querySelectorAll('[id]').forEach(el => {
                    if (
                      el.id.includes('mermaid-error') || 
                      el.id.includes('syntax-error') || 
                      el.id.includes('flowchart-error')
                    ) {
                      el.remove();
                    }
                  });
                  
                  // Also remove by aria-roledescription
                  diagramRef.current.querySelectorAll('[aria-roledescription]').forEach(el => {
                    if (
                      el.getAttribute('aria-roledescription') === 'error' || 
                      el.getAttribute('aria-roledescription') === 'syntax-error'
                    ) {
                      el.remove();
                    }
                  });
                }
              }, 0);
            }
          })
          .catch(err => {
            console.error('Mermaid rendering error:', err);
            setError('Error rendering diagram. Please check your syntax.');
            
            // Return a minimal SVG to prevent UI breakage
            const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 50">
              <rect width="100%" height="100%" fill="transparent" />
            </svg>`;
            
            if (diagramRef.current) {
              diagramRef.current.innerHTML = fallbackSvg;
            }
            
            // Clean up any error elements
            setTimeout(() => {
              document.querySelectorAll('svg[aria-roledescription="error"], svg[aria-roledescription="syntax-error"]').forEach(el => {
                el.remove();
              });
            }, 0);
          });
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError('Error rendering diagram. Please check your syntax.');
        
        // Return a minimal SVG to prevent UI breakage
        const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 50">
          <rect width="100%" height="100%" fill="transparent" />
        </svg>`;
        
        if (diagramRef.current) {
          diagramRef.current.innerHTML = fallbackSvg;
        }
      }
    }
  }, [content, project]);

  return (
    <div ref={diagramRef} style={{ width: '100%', height: '300px', overflow: 'visible' }}>
      {error && (
        <div style={{ 
          position: 'absolute', 
          top: '10px', 
          left: '10px', 
          background: 'rgba(255, 0, 0, 0.1)', 
          padding: '5px', 
          borderRadius: '4px',
          fontSize: '12px',
          pointerEvents: 'none',
          maxWidth: '200px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default DiagramRenderer; 