'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  isDarkMode: boolean;
  currentDiagram?: string;
  setCurrentDiagram: React.Dispatch<React.SetStateAction<string | undefined>>;
  renderError: string | null;
  isLoading: boolean;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
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
  isDarkMode,
  currentDiagram,
  setCurrentDiagram,
  renderError,
  isLoading,
  setIsDragging,
}) => {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Handle mouse events for panning
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Clean up event listeners
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const handleRenderError = useCallback((error: Error) => {
    console.error('Diagram rendering error:', error);
    // Add basic error display
    if (diagramRef.current) {
      const errorMessage = document.createElement('div');
      errorMessage.className = 'text-red-500 p-4 text-sm';
      errorMessage.textContent = 'Error rendering diagram. Please check your syntax.';
      diagramRef.current.appendChild(errorMessage);
    }
  }, []);

  useEffect(() => {
    if (currentDiagram?.trim().toLowerCase().startsWith('gantt')) {
      // Add specific handling for Gantt diagrams
      try {
        // Validate minimum required structure
        if (!currentDiagram.includes('dateFormat')) {
          setCurrentDiagram(`gantt\ndateFormat YYYY-MM-DD\n${currentDiagram.substring(5)}`);
        }
      } catch (error) {
        handleRenderError(error as Error);
      }
    }
  }, [currentDiagram]);

  return (
    <>
      <div className={`relative flex-1 flex flex-col transition-all duration-300 ease-in-out ${showPromptPanel ? "md:ml-96 md:mb-0 mb-96" : "md:ml-0"}`}>
        {/* Top Controls Bar - Adjusted height to match chat UI header (h-12) */}
        <div
          className={`h-12 backdrop-blur-md border-b flex items-center justify-between px-4 ${
            isDarkMode 
              ? "bg-gray-900/80 border-gray-800/50 text-white" 
              : "bg-[#e8dccc]/80 border-[#d8cbb8]/50 text-[#6a5c4c]"
          }`}
        >
          <div className="flex items-center space-x-2">
            {!showPromptPanel && (
              <button
                onClick={() => setShowPromptPanel(true)}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? "bg-gray-800 hover:bg-gray-700 text-white" 
                    : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c]"
                }`}
                title="Show AI Assistant"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            <div className="flex items-center space-x-1">
              <button 
                onClick={() => setScale(s => Math.min(s + 0.1, 5))} 
                className={`p-1.5 rounded-md transition-all duration-200 ${
                  isDarkMode 
                    ? "bg-gray-800 hover:bg-gray-700 text-white" 
                    : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c]"
                }`}
                title="Zoom In"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </button>
              <button 
                onClick={() => setScale(s => Math.max(s - 0.1, 0.1))} 
                className={`p-1.5 rounded-md transition-all duration-200 ${
                  isDarkMode 
                    ? "bg-gray-800 hover:bg-gray-700 text-white" 
                    : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c]"
                }`}
                title="Zoom Out"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </button>
              <button 
                onClick={() => {
                  setScale(1);
                  setPosition({ x: 0, y: 0 });
                }} 
                className={`p-1.5 rounded-md transition-all duration-200 ${
                  isDarkMode 
                    ? "bg-gray-800 hover:bg-gray-700 text-white" 
                    : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c]"
                }`}
                title="Reset View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
              </button>
              <div className={`px-2 text-sm font-medium ${
                isDarkMode ? "text-gray-300" : "text-[#6a5c4c]"
              }`}>
                {Math.round(scale * 100)}%
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className={`px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                isDarkMode 
                  ? "bg-gray-800 hover:bg-gray-700 text-white" 
                  : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c]"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Improved Download Options Menu */}
        {showExportMenu && (
          <div className="absolute right-4 top-12 z-50 mt-2 w-60 md:w-72 origin-top-right">
            <div className={`rounded-lg shadow-lg ring-1 ${
              isDarkMode 
                ? "bg-gray-800 ring-gray-700" 
                : "bg-white ring-[#d8cbb8]"
            }`}>
              <div className={`px-4 py-3 border-b ${
                isDarkMode ? "border-gray-700" : "border-[#d8cbb8]"
              }`}>
                <h3 className={`text-sm font-medium ${
                  isDarkMode ? "text-white" : "text-[#6a5c4c]"
                }`}>
                  Download Options
                </h3>
              </div>
              <div className="p-2">
                <button
                  onClick={() => {
                    downloadSVG();
                    setShowExportMenu(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isDarkMode 
                      ? "hover:bg-gray-700 text-white" 
                      : "hover:bg-[#f5f0e8] text-[#6a5c4c]"
                  }`}
                  aria-label="Download SVG Vector"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M3 15h6"></path>
                    <path d="M6 12v6"></path>
                  </svg>
                  <div>
                    <div className="font-medium">SVG Vector</div>
                    <div className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-[#8a7a66]"
                    }`}>
                      Best for editing or web use
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    downloadPNG(false);
                    setShowExportMenu(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isDarkMode 
                      ? "hover:bg-gray-700 text-white" 
                      : "hover:bg-[#f5f0e8] text-[#6a5c4c]"
                  }`}
                  aria-label="Download PNG with Background"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <rect x="4" y="12" width="6" height="6"></rect>
                  </svg>
                  <div>
                    <div className="font-medium">PNG with Background</div>
                    <div className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-[#8a7a66]"
                    }`}>
                      High-quality image with background
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    downloadPNG(true);
                    setShowExportMenu(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isDarkMode 
                      ? "hover:bg-gray-700 text-white" 
                      : "hover:bg-[#f5f0e8] text-[#6a5c4c]"
                  }`}
                  aria-label="Download Transparent PNG"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M4 12h.01M8 12h.01M12 12h.01M16 12h.01M20 12h.01"></path>
                  </svg>
                  <div>
                    <div className="font-medium">Transparent PNG</div>
                    <div className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-[#8a7a66]"
                    }`}>
                      High-quality transparent image
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

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
            isDarkMode={isDarkMode}
          />
        </div>

        <div 
          className={`flex-1 overflow-hidden relative ${
            isDarkMode ? "bg-gray-900" : "bg-[#f5f0e8]"
          }`}
          ref={diagramRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {isGenerating && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
              <div className={`rounded-lg shadow-lg p-3 flex items-center space-x-3 ${
                isDarkMode 
                  ? "bg-gray-800/90 text-gray-300" 
                  : "bg-white/90 text-gray-600"
              }`}>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-secondary border-t-transparent"></div>
                <span className="text-xs font-medium">Streaming diagram...</span>
              </div>
            </div>
          )}
          {isLoading && !svgOutput ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
                isDarkMode ? "border-white" : "border-[#6a5c4c]"
              }`}></div>
            </div>
          ) : renderError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
              <div className={`p-6 rounded-xl max-w-2xl ${
                isDarkMode 
                  ? "bg-red-900/20 border border-red-800" 
                  : "bg-red-100 border border-red-200"
              }`}>
                <h3 className={`text-lg font-semibold mb-2 ${
                  isDarkMode ? "text-red-300" : "text-red-700"
                }`}>
                  Error Rendering Diagram
                </h3>
                <div className={`prose prose-sm ${
                  isDarkMode ? "prose-invert" : "prose-stone"
                }`}>
                  <pre className={`whitespace-pre-wrap text-sm p-4 rounded-lg overflow-auto ${
                    isDarkMode 
                      ? "bg-gray-800 text-red-300" 
                      : "bg-red-50 text-red-700"
                  }`}>
                    {renderError}
                  </pre>
                </div>
                <p className={`mt-4 text-sm ${
                  isDarkMode ? "text-gray-300" : "text-[#6a5c4c]"
                }`}>
                  Try modifying your diagram code or prompt to fix these issues.
                </p>
              </div>
            </div>
          ) : (
            <div 
              ref={svgContainerRef}
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
              dangerouslySetInnerHTML={{ __html: svgOutput || '' }}
            />
          )}
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
          isDarkMode={isDarkMode}
        />
      </div>
    </>
  );
};

export default DiagramDisplay; 