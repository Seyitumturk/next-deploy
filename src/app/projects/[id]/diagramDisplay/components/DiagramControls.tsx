'use client';

import React from 'react';
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
  showExportMenu,
  setShowExportMenu,
  isDarkMode,
  isMobile = false,
  isDownloading,
  currentTheme,
  changeTheme,
  diagramType
}) => {
  // State for theme selector
  const [showThemeSelector, setShowThemeSelector] = React.useState(false);

  // Format scale as percentage with safety check for NaN
  const scalePercentage = isNaN(scale) ? 100 : Math.round(scale * 100);

  return (
    <div className={`flex items-center justify-between h-12 px-3 py-2 diagram-controls ${
      isDarkMode 
        ? "bg-gray-800 text-white border-b border-gray-900" 
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
        
        <div className="flex items-center space-x-1.5 bg-black/10 dark:bg-white/5 rounded-lg p-1.5">
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
        
        <button
          onClick={() => setShowExportMenu(!showExportMenu)}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
            isDarkMode 
              ? "bg-gray-700 hover:bg-gray-600" 
              : "bg-[#c8bba8] hover:bg-[#b8ab98]"
          }`}
          title="Export Diagram"
          data-export-button="true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span className="text-sm font-medium">Export</span>
        </button>
      </div>

      {showThemeSelector && (
        <div className="absolute top-14 right-4 z-50 shadow-xl rounded-lg overflow-hidden border dark:border-gray-700">
          <DiagramThemeSelector
            currentTheme={currentTheme}
            changeTheme={changeTheme}
            isDarkMode={isDarkMode}
            onClose={() => setShowThemeSelector(false)}
          />
        </div>
      )}
    </div>
  );
};

// Default export for backward compatibility
export default DiagramControls; 