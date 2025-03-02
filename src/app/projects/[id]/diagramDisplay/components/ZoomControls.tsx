'use client';

import React from 'react';

interface ZoomControlsProps {
  scale: number;
  setScale: (scale: number) => void;
  resetView: () => void;
  isDarkMode: boolean;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  scale,
  setScale,
  resetView,
  isDarkMode
}) => {
  // Zoom in by 10%
  const zoomIn = () => {
    setScale(Math.min(5, scale + 0.1));
  };
  
  // Zoom out by 10%
  const zoomOut = () => {
    setScale(Math.max(0.2, scale - 0.1));
  };
  
  // Format scale as percentage with safety check for NaN
  const scalePercentage = isNaN(scale) ? 100 : Math.round(scale * 100);
  
  return (
    <div className="absolute bottom-4 right-4 flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-1 z-10">
      {/* Zoom out button */}
      <button
        onClick={zoomOut}
        className={`p-2 rounded-md ${
          isDarkMode 
            ? 'hover:bg-gray-700 text-gray-200' 
            : 'hover:bg-gray-100 text-gray-700'
        } transition-colors duration-150`}
        aria-label="Zoom out"
        disabled={scale <= 0.2}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      </button>
      
      {/* Current zoom level */}
      <div className="text-sm font-medium px-2 min-w-[60px] text-center">
        {scalePercentage}%
      </div>
      
      {/* Zoom in button */}
      <button
        onClick={zoomIn}
        className={`p-2 rounded-md ${
          isDarkMode 
            ? 'hover:bg-gray-700 text-gray-200' 
            : 'hover:bg-gray-100 text-gray-700'
        } transition-colors duration-150`}
        aria-label="Zoom in"
        disabled={scale >= 5}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      </button>
      
      {/* Reset view button */}
      <button
        onClick={resetView}
        className={`p-2 rounded-md ${
          isDarkMode 
            ? 'hover:bg-gray-700 text-gray-200' 
            : 'hover:bg-gray-100 text-gray-700'
        } transition-colors duration-150`}
        aria-label="Reset view"
        title="Reset view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}; 