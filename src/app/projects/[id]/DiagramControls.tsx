'use client';

import React, { useState, useEffect } from 'react';

interface DiagramControlsProps {
  showPromptPanel: boolean;
  setShowPromptPanel: React.Dispatch<React.SetStateAction<boolean>>;
  scale: number;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  setPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  downloadSVG: () => void;
  downloadPNG: (transparent?: boolean) => void;
  showExportMenu: boolean;
  setShowExportMenu: React.Dispatch<React.SetStateAction<boolean>>;
  isDarkMode: boolean;
  isMobile?: boolean;
}

const DiagramControls: React.FC<DiagramControlsProps> = ({
  showPromptPanel,
  setShowPromptPanel,
  scale,
  setScale,
  setPosition,
  downloadSVG,
  downloadPNG,
  showExportMenu,
  setShowExportMenu,
  isDarkMode,
  isMobile,
}) => {
  return (
    <div className={`${isMobile 
      ? 'w-full rounded-none border-b h-12 py-0 px-4 flex items-center' 
      : 'bottom-4 right-4 rounded-xl p-2 fixed'} 
      shadow-lg backdrop-blur-md ${
      isDarkMode 
        ? "bg-gray-900/80 border-gray-800/50" 
        : "bg-[#e8dccc]/80 border-[#d8cbb8]/50"
    }`}>
      <div className={`flex ${isMobile ? 'justify-between items-center w-full' : 'flex-col space-y-2'}`}>
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
          
          <div className={`flex items-center space-x-1 bg-white/10 dark:bg-gray-800/50 rounded-lg ${isMobile ? 'p-1' : 'p-1'}`}>
            <button 
              onClick={() => setScale(s => Math.min(s + 0.1, 5))} 
              className={`${isMobile ? 'p-1.5' : 'p-1.5'} rounded-md transition-all duration-200 ${
                isDarkMode 
                  ? "bg-gray-800 hover:bg-gray-700 text-white" 
                  : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c]"
              }`}
              title="Zoom In"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
            </button>
            <button 
              onClick={() => setScale(s => Math.max(s - 0.1, 0.1))} 
              className={`${isMobile ? 'p-1.5' : 'p-1.5'} rounded-md transition-all duration-200 ${
                isDarkMode 
                  ? "bg-gray-800 hover:bg-gray-700 text-white" 
                  : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c]"
              }`}
              title="Zoom Out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              className={`${isMobile ? 'p-1.5' : 'p-1.5'} rounded-md transition-all duration-200 ${
                isDarkMode 
                  ? "bg-gray-800 hover:bg-gray-700 text-white" 
                  : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c]"
              }`}
              title="Reset View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
            </button>
            <div className={`${isMobile ? 'px-2 text-sm' : 'px-2 text-sm'} text-gray-500 dark:text-gray-400 font-medium`}>
              {Math.round(scale * 100)}%
            </div>
          </div>
        </div>
        
        {!isMobile && <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-600 to-transparent opacity-30"></div>}
        
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className={`${isMobile ? 'px-3 py-1.5' : 'px-3 py-1.5'} rounded-lg transition-all duration-200 flex items-center justify-center space-x-1 ${
              isDarkMode 
                ? "bg-gray-800 hover:bg-gray-700 text-white" 
                : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c]"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span className={`${isMobile ? 'text-sm' : 'text-sm'}`}>Export</span>
          </button>
          <div 
            className={`${isMobile ? 'right-0 top-full mt-2 z-50' : 'right-0'} absolute top-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-black/5 dark:ring-white/10 flex items-center px-1 transition-all duration-300 ease-out origin-right ${showExportMenu ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0 pointer-events-none'}`}
          >
            <button
              onClick={() => {
                downloadSVG();
                setShowExportMenu(false);
              }}
              className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group relative ${
                isDarkMode 
                  ? "bg-gray-800 hover:bg-gray-700 text-white" 
                  : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c]"
              }`}
              title="Download SVG"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <path d="M3 15h6"></path>
                <path d="M6 12v6"></path>
              </svg>
              <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs font-medium bg-gray-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                SVG Vector
              </span>
            </button>
            <button
              onClick={() => {
                downloadPNG(false);
                setShowExportMenu(false);
              }}
              className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group relative ${
                isDarkMode 
                  ? "bg-gray-800 hover:bg-gray-700 text-white" 
                  : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c]"
              }`}
              title="Download PNG with Background"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <rect x="4" y="12" width="6" height="6"></rect>
              </svg>
              <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs font-medium bg-gray-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                PNG with Background
              </span>
            </button>
            <button
              onClick={() => {
                downloadPNG(true);
                setShowExportMenu(false);
              }}
              className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group relative ${
                isDarkMode 
                  ? "bg-gray-800 hover:bg-gray-700 text-white" 
                  : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c]"
              }`}
              title="Download Transparent PNG"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <path d="M4 12h.01M8 12h.01M12 12h.01M16 12h.01M20 12h.01"></path>
              </svg>
              <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs font-medium bg-gray-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Transparent PNG
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagramControls; 