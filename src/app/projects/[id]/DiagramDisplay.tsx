'use client';

// Re-export the DiagramDisplay component from the new modularized location
import { DiagramDisplay as ModularDiagramDisplay } from './diagramDisplay/DiagramDisplay';

import React, { useState, useEffect } from 'react';
import { MermaidTheme } from './diagramEditor/types';
import { DiagramVersionData } from './diagramEditor/types';

// Define the props interface to match the original component
interface DiagramDisplayProps {
  showPromptPanel: boolean;
  setShowPromptPanel: (show: boolean) => void;
  scale: number;
  setScale: (scale: number) => void;
  position: { x: number; y: number };
  setPosition: (position: { x: number; y: number }) => void;
  isGenerating: boolean;
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
  svgOutput: string;
  diagramRef: React.RefObject<HTMLDivElement>;
  svgRef: React.RefObject<HTMLDivElement>;
  handleMouseDown: (e: React.MouseEvent) => void;
  downloadSVG: () => void;
  downloadPNG: (transparent?: boolean) => Promise<void>;
  showExportMenu: boolean;
  setShowExportMenu: (show: boolean) => void;
  isDarkMode: boolean;
  currentDiagram: string;
  setCurrentDiagram: React.Dispatch<React.SetStateAction<string>>;
  renderError: string | null;
  isLoading: boolean;
  isDownloading: string | null;
  currentTheme: MermaidTheme;
  changeTheme: (theme: MermaidTheme) => void;
  diagramType: string;
  isVersionSelectionInProgress?: boolean;
  currentVersion?: DiagramVersionData;
}

// Create a wrapper component that adapts the old props to the new component
export const DiagramDisplay: React.FC<DiagramDisplayProps> = (props) => {
  // Initialize a stable versionId from the currentVersion _id or other props
  const [versionId, setVersionId] = useState<string>(() => {
    // Use a stable identifier from props if available
    if (props.currentVersion?._id) {
      return props.currentVersion._id;
    }
    // Otherwise use a hash of the SVG content as a fallback
    return `v-${props.svgOutput?.length || 0}`;
  });
  
  // Only update versionId on the client side after hydration is complete
  useEffect(() => {
    // This will only run on the client after hydration
    if (props.currentVersion?._id) {
      setVersionId(props.currentVersion._id);
    } else {
      // Generate a unique ID on the client side
      const svgHash = props.svgOutput?.length || 0;
      const timestamp = Date.now();
      setVersionId(`v-${svgHash}-${timestamp}`);
    }
  }, [props.currentVersion, props.svgOutput]);
  
  // Extract only the props needed by the modular component
  const {
    svgOutput,
    scale,
    position,
    isDragging,
    diagramRef,
    svgRef,
    handleMouseDown,
    setScale,
    setPosition,
    downloadSVG,
    downloadPNG,
    renderError,
    isDownloading,
    currentTheme,
    changeTheme,
    isDarkMode
  } = props;
  
  // Pass only the props that are expected by the modular component
  return (
    <div className="flex-1 relative overflow-hidden h-full flex" style={{
      marginLeft: props.showPromptPanel ? '24rem' : '0', // Add margin when prompt panel is visible (384px = 24rem)
      transition: 'margin-left 0.3s ease-in-out', // Smooth transition
    }}>
      <ModularDiagramDisplay 
        svgOutput={svgOutput}
        versionId={versionId}
        scale={scale}
        position={position}
        isDragging={isDragging}
        diagramRef={diagramRef}
        svgRef={svgRef}
        handleMouseDown={handleMouseDown}
        setScale={setScale}
        setPosition={setPosition}
        downloadSVG={downloadSVG}
        downloadPNG={downloadPNG}
        renderError={renderError}
        isDownloading={isDownloading}
        currentTheme={currentTheme}
        changeTheme={changeTheme}
        isDarkMode={isDarkMode}
        showPromptPanel={props.showPromptPanel}
        setShowPromptPanel={props.setShowPromptPanel}
      />
    </div>
  );
};

export default DiagramDisplay; 