'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { DiagramControls } from './components/DiagramControls';
import { DiagramRenderer } from './components/DiagramRenderer';
import { MermaidTheme } from '../diagramEditor/types';
import { setupSvgInteractions, calculateFitToViewScale, calculateCenterPosition } from './utils/interactionUtils';

// Add a style tag to prevent text selection during dragging
const preventTextSelectionStyles = `
  .diagram-dragging {
    user-select: none !important;
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
  }
  
  .diagram-dragging * {
    user-select: none !important;
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    cursor: grabbing !important;
  }
`;

interface DiagramDisplayProps {
  svgOutput: string;
  versionId: string;
  scale: number;
  position: { x: number; y: number };
  isDragging: boolean;
  currentTheme: MermaidTheme;
  renderError: string | null;
  isDownloading: string | null;
  diagramRef: React.RefObject<HTMLDivElement>;
  svgRef: React.RefObject<HTMLDivElement>;
  handleMouseDown: (e: React.MouseEvent) => void;
  setScale: (scale: number) => void;
  setPosition: (position: { x: number; y: number }) => void;
  downloadSVG: () => void;
  downloadPNG: (transparent?: boolean) => Promise<void>;
  changeTheme: (theme: MermaidTheme) => void;
  isDarkMode: boolean;
  showPromptPanel?: boolean;
  setShowPromptPanel?: (show: boolean) => void;
  showExportMenu?: boolean;
  setShowExportMenu?: (show: boolean) => void;
  diagramType?: string;
}

export const DiagramDisplay: React.FC<DiagramDisplayProps> = ({
  svgOutput,
  versionId,
  scale,
  position,
  isDragging,
  currentTheme,
  renderError,
  isDownloading,
  diagramRef,
  svgRef,
  handleMouseDown,
  setScale,
  setPosition,
  downloadSVG,
  downloadPNG,
  changeTheme,
  isDarkMode,
  showPromptPanel,
  setShowPromptPanel,
  showExportMenu,
  setShowExportMenu,
  diagramType
}) => {
  // Set up event handlers for zoom and pan
  useEffect(() => {
    if (diagramRef.current) {
      const cleanup = setupSvgInteractions(diagramRef.current, {
        scale,
        position,
        setScale,
        setPosition
      });
      
      return cleanup;
    }
  }, [diagramRef, scale, position, setScale, setPosition]);

  // Center and fit the diagram when SVG changes
  useEffect(() => {
    if (diagramRef.current && svgRef.current && svgOutput) {
      // Need a small delay to allow the SVG to be fully rendered
      const timer = setTimeout(() => {
        // Find the actual SVG element
        const svgElement = svgRef.current.querySelector('svg');
        if (svgElement) {
          const containerRect = diagramRef.current.getBoundingClientRect();
          const containerWidth = containerRect.width;
          const containerHeight = containerRect.height;
          const svgWidth = svgElement.width.baseVal.value || svgElement.viewBox.baseVal.width;
          const svgHeight = svgElement.height.baseVal.value || svgElement.viewBox.baseVal.height;
          
          // Calculate appropriate scale and position
          const newScale = calculateFitToViewScale(
            containerWidth, 
            containerHeight, 
            svgWidth, 
            svgHeight
          );
          
          const newPosition = calculateCenterPosition(
            containerWidth, 
            containerHeight, 
            svgWidth, 
            svgHeight, 
            newScale
          );
          
          // Apply new values
          setScale(newScale);
          setPosition(newPosition);
        }
      }, 100); // Small delay to ensure SVG is rendered
      
      return () => clearTimeout(timer);
    }
  }, [svgOutput, versionId, diagramRef, svgRef, setScale, setPosition]);

  // Reset zoom and position
  const resetView = useCallback(() => {
    if (diagramRef.current && svgRef.current) {
      // Find the actual SVG element
      const svgElement = svgRef.current.querySelector('svg');
      if (svgElement) {
        const containerRect = diagramRef.current.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        const svgWidth = svgElement.width.baseVal.value || svgElement.viewBox.baseVal.width;
        const svgHeight = svgElement.height.baseVal.value || svgElement.viewBox.baseVal.height;
        
        // Calculate appropriate scale and position
        const newScale = calculateFitToViewScale(
          containerWidth, 
          containerHeight, 
          svgWidth, 
          svgHeight
        );
        
        const newPosition = calculateCenterPosition(
          containerWidth, 
          containerHeight, 
          svgWidth, 
          svgHeight, 
          newScale
        );
        
        // Apply new values
        setScale(newScale);
        setPosition(newPosition);
      } else {
        // Default reset if SVG element not found
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    } else {
      // Default reset if refs not available
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [diagramRef, svgRef, setScale, setPosition]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden diagram-container">
      {/* Global styles for text selection prevention */}
      <style jsx global>{preventTextSelectionStyles}</style>
      
      {/* Diagram controls */}
      <DiagramControls
        currentTheme={currentTheme}
        isDownloading={isDownloading}
        downloadSVG={downloadSVG}
        downloadPNG={downloadPNG}
        changeTheme={changeTheme}
        isDarkMode={isDarkMode}
        showPromptPanel={showPromptPanel || false}
        setShowPromptPanel={setShowPromptPanel || (() => {})}
        scale={scale}
        setScale={setScale}
        setPosition={setPosition}
        resetView={resetView}
        showExportMenu={showExportMenu || false}
        setShowExportMenu={setShowExportMenu || (() => {})}
        diagramType={diagramType || 'diagram'}
      />
      
      {/* Diagram container */}
      <div className={`relative flex-grow overflow-hidden diagram-content ${
        isDarkMode ? "bg-[#201c1c]" : "bg-[#e8dccc]"
      }`}>
        {/* Diagram content */}
        <div
          ref={diagramRef}
          className={`relative w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
        >
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <div ref={svgRef}>
              <DiagramRenderer 
                svgOutput={svgOutput} 
                versionId={versionId} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 