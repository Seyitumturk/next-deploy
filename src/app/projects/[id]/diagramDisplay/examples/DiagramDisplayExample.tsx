'use client';

import React, { useRef, useEffect, useState } from 'react';
import { DiagramDisplay } from '../DiagramDisplay';
import { useDiagramState } from '../hooks/useDiagramState';
import { useDiagramExport } from '../hooks/useDiagramExport';

const sampleDiagram = `
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
`;

export const DiagramDisplayExample: React.FC = () => {
  // Refs for the diagram and SVG elements
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // State for the SVG output
  const [svgOutput, setSvgOutput] = useState<string>('');
  
  // Use our custom hooks
  const {
    theme,
    scale,
    position,
    isDragging,
    renderError,
    changeTheme,
    setScale,
    setPosition,
    setIsDragging,
    setRenderError,
    resetView
  } = useDiagramState({
    initialTheme: 'default',
    initialScale: 1,
    initialPosition: { x: 0, y: 0 }
  });
  
  const {
    isDownloading,
    downloadSVG,
    downloadPNG
  } = useDiagramExport(svgRef, {
    diagramTitle: 'example-diagram',
    onExportError: (error) => console.error('Export error:', error)
  });
  
  // Simulate rendering the diagram and getting SVG output
  useEffect(() => {
    // In a real application, this would be where you render the Mermaid diagram
    // and get the SVG output. For this example, we'll just use a placeholder.
    const simulateRendering = async () => {
      try {
        // Simulate a delay in rendering
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // This is a placeholder. In a real app, you would use mermaid.render()
        // to generate the actual SVG from the diagram code
        const fakeSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="500" height="300" viewBox="0 0 500 300">
            <rect width="100%" height="100%" fill="${theme === 'dark' ? '#2d2d2d' : '#ffffff'}" />
            <g transform="translate(50, 50)">
              <rect x="0" y="0" width="100" height="50" rx="5" fill="${theme === 'dark' ? '#6b6b6b' : '#d3d3d3'}" stroke="#000" />
              <text x="50" y="30" text-anchor="middle" dominant-baseline="middle" fill="${theme === 'dark' ? '#ffffff' : '#000000'}">Start</text>
              
              <path d="M 50 50 L 50 80 L 200 80" stroke="#000" fill="none" />
              
              <polygon points="200,60 200,100 250,80" fill="${theme === 'dark' ? '#6b6b6b' : '#d3d3d3'}" stroke="#000" />
              <text x="225" y="80" text-anchor="middle" dominant-baseline="middle" fill="${theme === 'dark' ? '#ffffff' : '#000000'}">?</text>
              
              <path d="M 250 60 L 300 30" stroke="#000" fill="none" />
              <path d="M 250 100 L 300 130" stroke="#000" fill="none" />
              
              <rect x="300" y="5" width="100" height="50" rx="5" fill="${theme === 'dark' ? '#6b6b6b' : '#d3d3d3'}" stroke="#000" />
              <text x="350" y="30" text-anchor="middle" dominant-baseline="middle" fill="${theme === 'dark' ? '#ffffff' : '#000000'}">Great!</text>
              
              <rect x="300" y="105" width="100" height="50" rx="5" fill="${theme === 'dark' ? '#6b6b6b' : '#d3d3d3'}" stroke="#000" />
              <text x="350" y="130" text-anchor="middle" dominant-baseline="middle" fill="${theme === 'dark' ? '#ffffff' : '#000000'}">Debug</text>
              
              <path d="M 300 130 L 250 130 L 250 100" stroke="#000" fill="none" marker-end="url(#arrowhead)" />
            </g>
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
              </marker>
            </defs>
          </svg>
        `;
        
        setSvgOutput(fakeSvg);
        setRenderError(null);
      } catch (error) {
        console.error('Error rendering diagram:', error);
        setRenderError('Failed to render diagram');
      }
    };
    
    simulateRendering();
  }, [theme, setRenderError]);
  
  // Reset view when the component mounts
  useEffect(() => {
    if (containerRef.current && svgRef.current) {
      resetView(containerRef, svgRef);
    }
  }, [svgOutput, resetView]);
  
  return (
    <div className="w-full h-full flex flex-col">
      <h1 className="text-2xl font-bold mb-4">Diagram Display Example</h1>
      
      <div className="flex-1 border rounded-lg overflow-hidden" ref={containerRef}>
        <DiagramDisplay
          svgOutput={svgOutput}
          versionId="example-version"
          scale={scale}
          position={position}
          isDragging={isDragging}
          currentTheme={theme}
          renderError={renderError}
          isDownloading={isDownloading}
          diagramRef={diagramRef}
          svgRef={svgRef}
          onScaleChange={setScale}
          onPositionChange={setPosition}
          onDraggingChange={setIsDragging}
          onThemeChange={changeTheme}
          onResetView={() => resetView(containerRef, svgRef)}
          onDownloadSVG={downloadSVG}
          onDownloadPNG={downloadPNG}
          isDarkMode={theme === 'dark'}
        />
      </div>
      
      <div className="mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <h2 className="text-lg font-semibold mb-2">Diagram Source</h2>
        <pre className="p-2 bg-gray-100 dark:bg-gray-900 rounded overflow-auto">
          {sampleDiagram}
        </pre>
      </div>
    </div>
  );
}; 