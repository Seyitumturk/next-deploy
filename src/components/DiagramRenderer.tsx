import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { DiagramType } from '../models/Project';

const DiagramRenderer: React.FC = () => {
  const diagramRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = React.useState('');
  const [project, setProject] = React.useState<{diagramType?: string} | null>(null);
  const [error, setError] = React.useState('');

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
        
        mermaid.render('mermaid-diagram', mermaidCode)
          .then(result => {
            if (diagramRef.current) {
              diagramRef.current.innerHTML = result.svg;
            }
          })
          .catch(err => {
            console.error('Mermaid rendering error:', err);
            setError('Error rendering diagram. Please check your syntax.');
          });
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError('Error rendering diagram. Please check your syntax.');
      }
    }
  }, [content, project]);

  return (
    <div ref={diagramRef} style={{ width: '100%', height: '300px' }}>
      {error && <p>{error}</p>}
    </div>
  );
};

export default DiagramRenderer; 