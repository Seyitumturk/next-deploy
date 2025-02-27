'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import DiagramControls from './DiagramControls';
import DiagramThemeSelector from './DiagramThemeSelector';
import { useMermaidCleanup, useMermaidInit } from '@/lib/useMermaidCleanup';
import dynamic from 'next/dynamic';

// Define valid mermaid theme types
type MermaidTheme = 'default' | 'forest' | 'dark' | 'neutral' | 'base';

// Create a client-side only wrapper for the SVG content
const ClientOnlySvgRenderer = dynamic(() => Promise.resolve(({ svgOutput }: { svgOutput: string }) => {
  // Log when the SVG renderer is called with new content
  console.log('ClientOnlySvgRenderer: Rendering SVG with length:', svgOutput.length);
  
  // Use a unique ID to ensure the SVG is properly updated
  const uniqueId = `svg-content-${Date.now()}`;
  
  return (
    <div id={uniqueId} dangerouslySetInnerHTML={{ __html: svgOutput }} />
  );
}), { ssr: false });

// Fallback component for server-side rendering
const DiagramPlaceholder = ({ isGenerating, isDarkMode }: { isGenerating: boolean, isDarkMode: boolean }) => (
  <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
    {isGenerating ? "Generating diagram..." : "No diagram to display"}
  </div>
);

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
  isDownloading: string | null;
  currentTheme: MermaidTheme;
  changeTheme: (theme: MermaidTheme) => void;
  diagramType: string;
  isVersionSelectionInProgress: boolean;
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
  isDownloading,
  currentTheme,
  changeTheme,
  diagramType,
  isVersionSelectionInProgress,
}) => {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasAutoFitted, setHasAutoFitted] = useState(false);
  
  // Use our custom hook to clean up Mermaid error elements
  useMermaidCleanup(diagramRef);
  useMermaidCleanup(svgRef);
  useMermaidCleanup(svgContainerRef);
  
  // Initialize Mermaid safely on the client side
  useMermaidInit(currentTheme);
  
  // Auto-fit diagram when SVG is first rendered or updated
  useEffect(() => {
    if (!svgOutput || !diagramRef.current || !svgRef.current || isGenerating) return;
    
    // Don't auto-fit if the user has manually adjusted scale/position and diagram hasn't changed
    // Or if we're in the process of selecting a version (reverting)
    if ((hasAutoFitted && (scale !== 1 || position.x !== 0 || position.y !== 0)) || isVersionSelectionInProgress) return;
    
    const fitDiagramToContainer = () => {
      try {
        // Give the SVG more time to be fully rendered in the DOM
        setTimeout(() => {
          const svgElement = svgRef.current?.querySelector('svg');
          const containerRect = diagramRef.current?.getBoundingClientRect();
          
          if (!svgElement || !containerRect) {
            console.log('Auto-fit: Missing SVG or container element');
            return;
          }
          
          // Get SVG dimensions with fallbacks for different diagram types
          const svgRect = svgElement.getBoundingClientRect();
          let svgWidth = parseFloat(svgElement.getAttribute('width') || '0');
          let svgHeight = parseFloat(svgElement.getAttribute('height') || '0');
          
          // If no width/height attributes, try to use the bounding rect or viewBox
          if (svgWidth <= 0 || svgHeight <= 0) {
            // Try to get from viewBox
            const viewBox = svgElement.getAttribute('viewBox');
            if (viewBox) {
              const [, , vbWidth, vbHeight] = viewBox.split(' ').map(parseFloat);
              if (!isNaN(vbWidth) && !isNaN(vbHeight)) {
                svgWidth = vbWidth;
                svgHeight = vbHeight;
              }
            }
            
            // If still no valid dimensions, use bounding rect
            if (svgWidth <= 0 || svgHeight <= 0) {
              svgWidth = svgRect.width;
              svgHeight = svgRect.height;
            }
            
            // Fallback to reasonable defaults if still invalid
            if (svgWidth <= 0 || svgHeight <= 0) {
              console.log('Auto-fit: Using default dimensions');
              svgWidth = 700;
              svgHeight = 700;
            }
          }
          
          console.log(`Auto-fit: SVG dimensions - ${svgWidth}x${svgHeight}, Container: ${containerRect.width}x${containerRect.height}`);
          
          // Calculate padding based on diagram type
          let paddingPercent = 0.1; // Default 10% padding
          
          // Adjust padding for different diagram types
          if (diagramType.includes('gantt') || diagramType.includes('timeline')) {
            paddingPercent = 0.05; // Less padding for wide diagrams
          } else if (diagramType.includes('flowchart') || diagramType.includes('graph')) {
            paddingPercent = 0.12; // More padding for flowcharts
          } else if (diagramType.includes('sequence')) {
            paddingPercent = 0.08;
          }
          
          // Apply percentage-based padding
          const padding = Math.min(
            containerRect.width * paddingPercent,
            containerRect.height * paddingPercent
          ) * 2; // Double for both sides
          
          const containerWidth = containerRect.width - padding;
          const containerHeight = containerRect.height - padding;
          
          // Calculate scale factors for width and height
          const widthScale = containerWidth / svgWidth;
          const heightScale = containerHeight / svgHeight;
          
          // Use the smaller scale factor to ensure the diagram fits completely
          // But cap at 1.0 to avoid scaling up small diagrams too much
          const optimalScale = Math.min(widthScale, heightScale, 1.0);
          
          console.log(`Auto-fit: Scales - width: ${widthScale.toFixed(2)}, height: ${heightScale.toFixed(2)}, optimal: ${optimalScale.toFixed(2)}`);
          
          // Only apply if the change is significant (avoid tiny adjustments)
          if (Math.abs(scale - optimalScale) > 0.05) {
            console.log(`Auto-fit: Applying scale ${optimalScale.toFixed(2)}`);
            setScale(optimalScale);
            setPosition({ x: 0, y: 0 }); // Center the diagram
            setHasAutoFitted(true);
          } else {
            console.log(`Auto-fit: Ignoring small scale change from ${scale} to ${optimalScale}`);
            setHasAutoFitted(true);
          }
        }, 500); // Increased timeout for more reliable rendering
      } catch (error) {
        console.error('Error auto-fitting diagram:', error);
      }
    };
    
    fitDiagramToContainer();
  }, [svgOutput, diagramRef, svgRef, setScale, setPosition, isGenerating, hasAutoFitted, scale, position, diagramType, isVersionSelectionInProgress]);
  
  // Reset hasAutoFitted when diagram changes, but not during version selection
  useEffect(() => {
    if (!isVersionSelectionInProgress) {
      setHasAutoFitted(false);
    }
  }, [currentDiagram, isVersionSelectionInProgress]);

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

  // Close export menu when clicking outside
  useEffect(() => {
    if (!showExportMenu) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportMenuRef.current && 
        !exportMenuRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('[data-export-button="true"]')
      ) {
        setShowExportMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showExportMenu, setShowExportMenu]);

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
    
    // Don't show errors during generation to keep the UI clean
    if (isGenerating) {
      return;
    }
    
    // Add basic error display
    if (diagramRef.current) {
      // First, remove any existing error messages to avoid duplicates
      diagramRef.current.querySelectorAll('.diagram-error-message').forEach(el => el.remove());
      
      const errorMessage = document.createElement('div');
      errorMessage.className = 'text-red-500 p-4 text-sm diagram-error-message';
      errorMessage.textContent = 'Error rendering diagram. Please check your syntax.';
      diagramRef.current.appendChild(errorMessage);
    }
  }, [isGenerating]);

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

  // Add effect to ensure SVG is properly updated when svgOutput changes
  useEffect(() => {
    if (svgOutput && svgRef.current) {
      console.log('DiagramDisplay: SVG output updated, length:', svgOutput.length);
      
      // Force a re-render of the SVG content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = svgOutput;
      
      // Check if the SVG is valid
      const svgElement = tempDiv.querySelector('svg');
      if (svgElement) {
        console.log('DiagramDisplay: Valid SVG found in output');
      } else {
        console.warn('DiagramDisplay: No valid SVG found in output');
      }
    }
  }, [svgOutput]);

  return (
    <>
      <div className={`relative flex-1 flex flex-col transition-all duration-300 ease-in-out ${showPromptPanel ? "md:ml-96 md:mb-0 mb-96" : "md:ml-0"}`}>
        {/* Top Controls Bar - Adjusted height to match chat UI header (h-12) */}
        <div
          className={`md:flex hidden h-12 backdrop-blur-md border-b items-center justify-between px-4 ${
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
            {/* Remove duplicate controls from header on mobile */}
            <div className="hidden md:flex items-center space-x-1">
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
          <div className="hidden md:flex items-center space-x-2">
            {/* Theme Selector for Desktop */}
            <DiagramThemeSelector 
              currentTheme={currentTheme}
              changeTheme={changeTheme}
              isDarkMode={isDarkMode}
              diagramType={diagramType}
            />
            
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                isDarkMode 
                  ? "bg-gray-800 hover:bg-gray-700 text-white" 
                  : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c]"
              }`}
              data-export-button="true"
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

        {/* Mobile controls - positioned right below the header */}
        <div className="md:hidden -mt-px">
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
            isMobile={true}
            isDownloading={isDownloading}
            currentTheme={currentTheme}
            changeTheme={changeTheme}
            diagramType={diagramType}
          />
        </div>

        {/* Modern Export Menu */}
        {showExportMenu && (
          <div 
            ref={exportMenuRef}
            className="absolute right-4 top-12 z-50 mt-2 w-64 md:w-72 origin-top-right"
          >
            <div className={`rounded-xl shadow-xl ring-1 backdrop-blur-md transition-all duration-300 animate-fadeIn ${
              isDarkMode 
                ? "bg-gray-900/90 ring-gray-700/50" 
                : "bg-white/95 ring-[#d8cbb8]/50"
            }`}>
              <div className={`px-4 py-3 border-b ${
                isDarkMode ? "border-gray-700/50" : "border-[#d8cbb8]/30"
              }`}>
                <h3 className={`text-sm font-medium ${
                  isDarkMode ? "text-white" : "text-[#6a5c4c]"
                }`}>
                  Export Diagram
                </h3>
              </div>
              <div className="p-3 space-y-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    downloadSVG();
                    setShowExportMenu(false);
                  }}
                  disabled={!!isDownloading}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isDarkMode 
                      ? isDownloading ? "bg-gray-800/50 text-gray-400" : "hover:bg-gray-800 text-white hover:translate-x-1" 
                      : isDownloading ? "bg-[#f5f0e8]/50 text-[#8a7a66]" : "hover:bg-[#f5f0e8] text-[#6a5c4c] hover:translate-x-1"
                  }`}
                  aria-label="Download SVG Vector"
                >
                  {isDownloading === 'svg' ? (
                    <svg className="animate-spin h-5 w-5 text-indigo-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <path d="M3 15h6"></path>
                        <path d="M6 12v6"></path>
                      </svg>
                    </div>
                  )}
                  <div>
                    <div className="font-medium">SVG Vector</div>
                    <div className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-[#8a7a66]"
                    }`}>
                      Scalable vector for editing
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    downloadPNG(false);
                    setShowExportMenu(false);
                  }}
                  disabled={!!isDownloading}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isDarkMode 
                      ? isDownloading ? "bg-gray-800/50 text-gray-400" : "hover:bg-gray-800 text-white hover:translate-x-1" 
                      : isDownloading ? "bg-[#f5f0e8]/50 text-[#8a7a66]" : "hover:bg-[#f5f0e8] text-[#6a5c4c] hover:translate-x-1"
                  }`}
                  aria-label="Download PNG with Background"
                >
                  {isDownloading === 'png' ? (
                    <svg className="animate-spin h-5 w-5 text-blue-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <rect x="4" y="12" width="6" height="6"></rect>
                      </svg>
                    </div>
                  )}
                  <div>
                    <div className="font-medium">PNG with Background</div>
                    <div className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-[#8a7a66]"
                    }`}>
                      High-resolution image
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    downloadPNG(true);
                    setShowExportMenu(false);
                  }}
                  disabled={!!isDownloading}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isDarkMode 
                      ? isDownloading ? "bg-gray-800/50 text-gray-400" : "hover:bg-gray-800 text-white hover:translate-x-1" 
                      : isDownloading ? "bg-[#f5f0e8]/50 text-[#8a7a66]" : "hover:bg-[#f5f0e8] text-[#6a5c4c] hover:translate-x-1"
                  }`}
                  aria-label="Download Transparent PNG"
                >
                  {isDownloading === 'png-transparent' ? (
                    <svg className="animate-spin h-5 w-5 text-emerald-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <path d="M4 12h.01M8 12h.01M12 12h.01M16 12h.01M20 12h.01"></path>
                      </svg>
                    </div>
                  )}
                  <div>
                    <div className="font-medium">Transparent PNG</div>
                    <div className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-[#8a7a66]"
                    }`}>
                      For use on any background
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
            isDownloading={isDownloading}
            currentTheme={currentTheme}
            changeTheme={changeTheme}
            diagramType={diagramType}
          />
        </div>

        {/* Diagram Display Area */}
        <div
          ref={diagramRef}
          className={`relative flex-1 overflow-hidden ${isDarkMode ? "bg-gray-900" : "bg-[#e8dccc]"}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Loading Indicator */}
          {isLoading && (
            <div className={`absolute inset-0 flex items-center justify-center z-10 ${isDarkMode ? "bg-gray-900/50" : "bg-[#e8dccc]/50"}`}>
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          )}
          
          {/* Downloading Indicator */}
          {isDownloading && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center z-10 ${isDarkMode ? "bg-gray-900/50" : "bg-[#e8dccc]/50"}`}>
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
              <div className={`text-sm font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                Preparing {isDownloading === 'svg' ? 'SVG' : isDownloading === 'png-transparent' ? 'transparent PNG' : 'PNG'}...
              </div>
            </div>
          )}
          
          {/* Render Error Display - Only show when not generating */}
          {renderError && !isGenerating && (
            <div className="absolute top-4 left-4 right-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 z-10">
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Rendering Error</h3>
                  <div className="mt-1 text-xs text-red-700 dark:text-red-300">
                    {renderError}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* SVG Container with transform */}
          <div
            ref={svgContainerRef}
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
              transformOrigin: 'center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <div ref={svgRef} className="mermaid">
              {svgOutput ? (
                <ClientOnlySvgRenderer 
                  key={`svg-${svgOutput.length}-${Date.now()}`}
                  svgOutput={svgOutput} 
                />
              ) : (
                <DiagramPlaceholder isGenerating={isGenerating} isDarkMode={isDarkMode} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DiagramDisplay; 