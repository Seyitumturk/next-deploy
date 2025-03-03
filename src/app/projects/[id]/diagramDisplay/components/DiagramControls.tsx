'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MermaidTheme } from '../../diagramEditor/types';
import { DiagramThemeSelector } from './DiagramThemeSelector';

interface DiagramControlsProps {
  showPromptPanel: boolean;
  setShowPromptPanel: (show: boolean) => void;
  scale: number;
  setScale: (scale: number) => void;
  setPosition: (position: { x: number; y: number }) => void;
  resetView: () => void;
  downloadSVG: () => void;
  downloadPNG: (transparent?: boolean) => void;
  showExportMenu: boolean;
  setShowExportMenu: (show: boolean) => void;
  isDarkMode: boolean;
  isMobile?: boolean;
  isDownloading: string | null;
  currentTheme: MermaidTheme;
  changeTheme: (theme: MermaidTheme) => void;
  diagramType: string;
  hasRenderError?: boolean;
  onRetry?: () => void;
}

export const DiagramControls: React.FC<DiagramControlsProps> = ({
  showPromptPanel,
  setShowPromptPanel,
  scale,
  setScale,
  setPosition,
  resetView,
  downloadSVG,
  downloadPNG,
  showExportMenu: propsShowExportMenu,
  setShowExportMenu: propsSetShowExportMenu,
  isDarkMode,
  isMobile = false,
  isDownloading,
  currentTheme,
  changeTheme,
  diagramType,
  hasRenderError,
  onRetry
}) => {
  // State for theme selector
  const [showThemeSelector, setShowThemeSelector] = React.useState(false);
  
  // Internal state for export menu
  const [internalShowExportMenu, setInternalShowExportMenu] = React.useState(false);
  
  // Use the internal state, but sync with the prop state
  const showExportMenu = internalShowExportMenu;
  const setShowExportMenu = (value: boolean) => {
    setInternalShowExportMenu(value);
    propsSetShowExportMenu(value);
  };
  
  // Reference for export menu
  const exportMenuRef = React.useRef<HTMLDivElement>(null);
  const exportButtonRef = React.useRef<HTMLButtonElement>(null);
  
  // Reference for theme selector
  const themeSelectorRef = React.useRef<HTMLDivElement>(null);
  const themeButtonRef = React.useRef<HTMLButtonElement>(null);

  // State for portal container
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  
  // Set up portal container on mount
  useEffect(() => {
    // Create or find the portal container
    let container = document.getElementById('export-menu-portal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'export-menu-portal';
      document.body.appendChild(container);
    }
    setPortalContainer(container);
    
    // Clean up on unmount
    return () => {
      if (container && document.body.contains(container)) {
        document.body.removeChild(container);
      }
    };
  }, []);

  // Debug logging
  React.useEffect(() => {
    console.log('Internal export menu state:', internalShowExportMenu);
    console.log('Props export menu state:', propsShowExportMenu);
  }, [internalShowExportMenu, propsShowExportMenu]);

  // Sync external state with internal state
  React.useEffect(() => {
    if (propsShowExportMenu !== internalShowExportMenu) {
      setInternalShowExportMenu(propsShowExportMenu);
    }
  }, [propsShowExportMenu]);

  // Close export menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is outside both the button and menu
      const isOutsideButton = exportButtonRef.current && !exportButtonRef.current.contains(event.target as Node);
      const isOutsideMenu = exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node);
      const portalElement = document.getElementById('export-menu-portal');
      const isInsidePortal = portalElement && portalElement.contains(event.target as Node);
      
      // Only close if clicked outside both button and menu
      if (showExportMenu && isOutsideButton && (isOutsideMenu || !isInsidePortal)) {
        setShowExportMenu(false);
      }
      
      // Check if the click is outside both the theme button and selector
      if (showThemeSelector && 
          themeSelectorRef.current && 
          themeButtonRef.current && 
          !themeSelectorRef.current.contains(event.target as Node) && 
          !themeButtonRef.current.contains(event.target as Node)) {
        setShowThemeSelector(false);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu, setShowExportMenu, showThemeSelector]);

  // Format scale as percentage with safety check for NaN
  const scalePercentage = isNaN(scale) ? 100 : Math.round(scale * 100);

  // Calculate button position for portal positioning
  const getMenuPosition = () => {
    if (!exportButtonRef.current) return { top: 0, left: 0 };
    
    const rect = exportButtonRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY,
      left: isMobile ? rect.left + window.scrollX : rect.right + window.scrollX - 250,
    };
  };
  
  // Export menu JSX
  const exportMenuJSX = showExportMenu && (
    <div
      ref={exportMenuRef}
      className={`fixed z-[9999] p-3 rounded-lg shadow-xl border ${
        isDarkMode 
          ? "bg-[#201c1c]/95 text-white border-[#282424] backdrop-blur-sm" 
          : "bg-white/95 text-gray-800 border-gray-200 backdrop-blur-sm"
      } w-56 transition-all duration-200 ease-in-out`}
      style={{ 
        top: `${getMenuPosition().top}px`, 
        left: `${getMenuPosition().left}px`,
      }}
    >
      <div className="flex flex-col space-y-1">
        <h4 className={`text-sm font-medium mb-2 pb-2 border-b ${isDarkMode ? "border-[#282424]" : "border-gray-200"}`}>
          Export Diagram
        </h4>
        
        <button
          onClick={() => {
            downloadSVG();
            setShowExportMenu(false);
          }}
          disabled={isDownloading !== null}
          className={`flex items-center gap-2 p-2 text-left rounded-md transition-all ${
            isDarkMode 
              ? "hover:bg-[#282424] focus:bg-[#282424]" 
              : "hover:bg-gray-100 focus:bg-gray-100"
          } ${isDownloading === 'svg' ? 'opacity-50 cursor-wait' : ''}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2z"/>
            <polyline points="14 2 14 8 20 8"/>
            <text x="12" y="16" textAnchor="middle" fontFamily="monospace" fontSize="7" fontWeight="bold">SVG</text>
          </svg>
          <span className="text-sm">Download SVG</span>
          {isDownloading === 'svg' && (
            <svg className="animate-spin ml-auto h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          )}
        </button>
        
        <button
          onClick={() => {
            downloadPNG(false);
            setShowExportMenu(false);
          }}
          disabled={isDownloading !== null}
          className={`flex items-center gap-2 p-2 text-left rounded-md transition-all ${
            isDarkMode 
              ? "hover:bg-[#282424] focus:bg-[#282424]" 
              : "hover:bg-gray-100 focus:bg-gray-100"
          } ${isDownloading === 'png' ? 'opacity-50 cursor-wait' : ''}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <rect width="8" height="6" x="8" y="13" fill="currentColor" opacity="0.2" stroke="none" />
            <circle cx="9" cy="7" r="2" fill="currentColor" opacity="0.2" stroke="currentColor" />
            <text x="12" y="18" textAnchor="middle" fontFamily="monospace" fontSize="4" fontWeight="bold">PNG</text>
          </svg>
          <span className="text-sm">Download PNG</span>
          {isDownloading === 'png' && (
            <svg className="animate-spin ml-auto h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          )}
        </button>
        
        <button
          onClick={() => {
            downloadPNG(true);
            setShowExportMenu(false);
          }}
          disabled={isDownloading !== null}
          className={`flex items-center gap-2 p-2 text-left rounded-md transition-all ${
            isDarkMode 
              ? "hover:bg-[#282424] focus:bg-[#282424]" 
              : "hover:bg-gray-100 focus:bg-gray-100"
          } ${isDownloading === 'png' ? 'opacity-50 cursor-wait' : ''}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" style={{fill: "transparent"}} />
            <rect width="10" height="6" x="7" y="13" fill="currentColor" opacity="0.05" stroke="none" />
            <text x="12" y="18" textAnchor="middle" fontFamily="monospace" fontSize="4" fontWeight="bold">PNG</text>
            <circle cx="9" cy="7" r="2" fill="currentColor" opacity="0.05" stroke="currentColor" />
            <path d="M19 3v2" />
            <path d="M21 12h-2" />
            <path d="M19 19v2" />
            <path d="M5 3v2" />
            <path d="M3 12h2" />
            <path d="M5 19v2" />
          </svg>
          <span className="text-sm">Transparent PNG</span>
          {isDownloading === 'png' && (
            <svg className="animate-spin ml-auto h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`flex items-center justify-between h-12 px-3 py-2 diagram-controls ${
      isDarkMode 
        ? "bg-[#201c1c] text-white border-b border-[#282424]/50" 
        : "bg-[#e8dccc] text-[#6a5c4c] border-b border-[#b8a990]"
    } shadow-sm`}>
      <div className="flex items-center space-x-3">
        {!showPromptPanel && (
          <button
            onClick={() => setShowPromptPanel(true)}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? "bg-gray-700 hover:bg-gray-600" 
                : "bg-[#c8bba8] hover:bg-[#b8ab98]"
            }`}
            title="Show AI Assistant"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        
        <div className="flex items-center space-x-1.5 bg-black/10 dark:bg-[#282424]/20 rounded-lg p-1.5">
          <button 
            onClick={() => setScale(Math.min(scale + 0.1, 5))} 
            className={`p-1.5 rounded-md transition-colors ${
              isDarkMode 
                ? "bg-gray-700 hover:bg-gray-600" 
                : "bg-[#c8bba8] hover:bg-[#b8ab98]"
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
            onClick={() => setScale(Math.max(scale - 0.1, 0.1))} 
            className={`p-1.5 rounded-md transition-colors ${
              isDarkMode 
                ? "bg-gray-700 hover:bg-gray-600" 
                : "bg-[#c8bba8] hover:bg-[#b8ab98]"
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
            onClick={resetView} 
            className={`p-1.5 rounded-md transition-colors ${
              isDarkMode 
                ? "bg-gray-700 hover:bg-gray-600" 
                : "bg-[#c8bba8] hover:bg-[#b8ab98]"
            }`}
            title="Reset View"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
          </button>
          
          <span className={`px-2 text-sm font-medium`}>
            {scalePercentage}%
          </span>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <button
          ref={themeButtonRef}
          onClick={() => setShowThemeSelector(true)}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
            isDarkMode 
              ? "bg-gray-700 hover:bg-gray-600" 
              : "bg-[#c8bba8] hover:bg-[#b8ab98]"
          }`}
          title="Change Theme"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5"></circle>
            <path d="M12 1v2"></path>
            <path d="M12 21v2"></path>
            <path d="M4.22 4.22l1.42 1.42"></path>
            <path d="M18.36 18.36l1.42 1.42"></path>
            <path d="M1 12h2"></path>
            <path d="M21 12h2"></path>
            <path d="M4.22 19.78l1.42-1.42"></path>
            <path d="M18.36 5.64l1.42-1.42"></path>
          </svg>
          <span className="text-sm font-medium">Theme</span>
        </button>
        
        <div className="relative">
          <button
            ref={exportButtonRef}
            onClick={() => {
              console.log('Export button clicked, current state:', showExportMenu);
              setShowExportMenu(!showExportMenu);
              console.log('Export menu state after toggle:', !showExportMenu);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
              isDarkMode 
                ? "bg-[#282424] hover:bg-[#343030] focus:ring-2 focus:ring-[#343030] focus:ring-opacity-50" 
                : "bg-[#c8bba8] hover:bg-[#b8ab98] focus:ring-2 focus:ring-[#b8a990] focus:ring-opacity-50"
            } ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''} ${showExportMenu ? 'ring-2 ring-offset-1 ring-opacity-50 ' + (isDarkMode ? 'ring-[#343030]' : 'ring-[#b8a990]') : ''}`}
            title="Export Diagram"
            data-export-button="true"
            disabled={!!isDownloading}
          >
            {isDownloading ? (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="14" x="5" y="5" rx="2" opacity="0.2" stroke="none" fill="currentColor" />
                <rect width="14" height="14" x="5" y="5" rx="2" />
                <path d="M12 9v8" />
                <path d="m9 15 3 3 3-3" />
              </svg>
            )}
            <span className="text-sm font-medium">Export</span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ml-0.5 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {showThemeSelector && (
        <div 
          ref={themeSelectorRef}
          className={`absolute ${isMobile ? 'top-14 left-0 md:left-auto right-auto md:right-4' : 'top-14 right-4'} z-[9999] shadow-xl rounded-lg overflow-hidden border dark:border-[#343030]`}
          style={{ pointerEvents: 'auto' }}
        >
          <DiagramThemeSelector
            currentTheme={currentTheme}
            changeTheme={changeTheme}
            isDarkMode={isDarkMode}
            onClose={() => setShowThemeSelector(false)}
          />
        </div>
      )}
      
      {/* Render export menu through portal */}
      {portalContainer && createPortal(exportMenuJSX, portalContainer)}
    </div>
  );
};

// Default export for backward compatibility
export default DiagramControls; 