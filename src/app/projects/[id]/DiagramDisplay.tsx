'use client';

import React from 'react';
import DiagramControls from './DiagramControls';

interface DiagramDisplayProps {
  showPromptPanel: boolean;
  downloadSVG: () => void;
  downloadPNG: (transparent?: boolean) => void;
  showExportMenu: boolean;
  setShowExportMenu: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPromptPanel: React.Dispatch<React.SetStateAction<boolean>>;
  scale: number;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  setPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  isGenerating: boolean;
  isDragging: boolean;
  svgOutput: string;
  diagramRef: React.RefObject<HTMLDivElement>;
  svgRef: React.RefObject<HTMLDivElement>;
  handleMouseDown: (e: React.MouseEvent) => void;
  position: { x: number; y: number };
}

const DiagramDisplay: React.FC<DiagramDisplayProps> = ({
  showPromptPanel,
  downloadSVG,
  downloadPNG,
  showExportMenu,
  setShowExportMenu,
  setShowPromptPanel,
  scale,
  setScale,
  setPosition,
  isGenerating,
  isDragging,
  svgOutput,
  diagramRef,
  svgRef,
  handleMouseDown,
  position,
}) => {
  return (
    <>
      <div className={`relative flex-1 flex flex-col transition-all duration-300 ease-in-out ${showPromptPanel ? "md:ml-96 md:mb-0 mb-96" : "md:ml-0"}`}>
        <div className="hidden md:block">
          <DiagramControls 
            showPromptPanel={showPromptPanel}
            setShowPromptPanel={setShowPromptPanel}
            scale={scale}
            setScale={setScale}
            setPosition={setPosition}
            downloadSVG={downloadSVG}
            downloadPNG={downloadPNG}
            showExportMenu={showExportMenu}
            setShowExportMenu={setShowExportMenu}
          />
        </div>

        <div 
          className="flex-1 overflow-hidden relative"
          ref={diagramRef}
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {isGenerating && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-secondary border-t-transparent"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Generating diagram...</span>
              </div>
            </div>
          )}
          <div 
            className="absolute inset-0 w-full h-full flex items-center justify-center"
            style={{
              transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'transform',
            }}
          >
            {svgOutput ? (
              <div
                ref={svgRef}
                dangerouslySetInnerHTML={{ __html: svgOutput }}
                className="w-full h-full flex items-center justify-center"
                style={{ minWidth: '100%', minHeight: '100%' }}
              />
            ) : (
              <div className="text-gray-400 flex flex-col items-center glass-panel rounded-2xl p-8">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-secondary to-accent-2 flex items-center justify-center text-white mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-600 dark:text-gray-300">No diagram yet</p>
                <p className="text-sm text-gray-400">Use the AI Assistant to generate one</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="md:hidden fixed left-0 right-0 z-50" style={{ bottom: showPromptPanel ? "50vh" : "0" }}>
        <DiagramControls 
          showPromptPanel={showPromptPanel}
          setShowPromptPanel={setShowPromptPanel}
          scale={scale}
          setScale={setScale}
          setPosition={setPosition}
          downloadSVG={downloadSVG}
          downloadPNG={downloadPNG}
          showExportMenu={showExportMenu}
          setShowExportMenu={setShowExportMenu}
        />
      </div>
    </>
  );
};

export default DiagramDisplay; 