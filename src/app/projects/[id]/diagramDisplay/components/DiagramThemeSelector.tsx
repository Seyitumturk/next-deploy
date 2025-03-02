'use client';

import React, { useEffect, useRef } from 'react';
import { MermaidTheme } from '../../diagramEditor/types';

interface DiagramThemeSelectorProps {
  currentTheme: MermaidTheme;
  changeTheme: (theme: MermaidTheme) => void;
  isDarkMode: boolean;
  onClose: () => void;
}

export const DiagramThemeSelector: React.FC<DiagramThemeSelectorProps> = ({
  currentTheme,
  changeTheme,
  isDarkMode,
  onClose
}) => {
  const selectorRef = useRef<HTMLDivElement>(null);
  
  // Available themes
  const themes: MermaidTheme[] = [
    'default',
    'forest',
    'dark',
    'neutral',
    'base'
  ];
  
  // Handle click outside to close the selector
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  // Handle theme selection
  const handleThemeSelect = (theme: MermaidTheme) => {
    changeTheme(theme);
    onClose();
  };

  return (
    <div 
      ref={selectorRef}
      className={`p-2 rounded-lg ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      } shadow-xl w-56`}
    >
      <div className="mb-2 px-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium">Select Theme</h3>
      </div>
      <div className="space-y-1" role="menu" aria-orientation="vertical">
        {themes.map((theme) => (
          <button
            key={theme}
            onClick={() => handleThemeSelect(theme)}
            className={`flex items-center w-full rounded-md px-3 py-2 transition-colors ${
              theme === currentTheme 
                ? isDarkMode 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-indigo-100 text-indigo-800'
                : isDarkMode
                  ? 'text-gray-200 hover:bg-gray-700'
                  : 'text-gray-700 hover:bg-gray-100'
            }`}
            role="menuitem"
          >
            <span className="mr-2">
              {theme === currentTheme ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                </svg>
              )}
            </span>
            {theme.charAt(0).toUpperCase() + theme.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
};

// Add default export for backward compatibility
export default DiagramThemeSelector; 