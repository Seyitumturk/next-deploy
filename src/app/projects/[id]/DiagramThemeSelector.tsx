'use client';

import React, { useState, useEffect, useRef } from 'react';

// Define valid mermaid theme types
type MermaidTheme = 'default' | 'forest' | 'dark' | 'neutral' | 'base';

interface DiagramThemeSelectorProps {
  currentTheme: MermaidTheme;
  changeTheme: (theme: MermaidTheme) => void;
  isDarkMode: boolean;
  diagramType: string;
}

interface ThemeOption {
  id: MermaidTheme;
  label: string;
  color: string;
  description?: string;
}

const DiagramThemeSelector: React.FC<DiagramThemeSelectorProps> = ({
  currentTheme,
  changeTheme,
  isDarkMode,
  diagramType
}) => {
  const [showThemeOptions, setShowThemeOptions] = useState(false);
  const themeSelectorRef = useRef<HTMLDivElement>(null);
  
  // Available themes in Mermaid.js - only using officially supported themes
  const themes: ThemeOption[] = [
    { id: 'default', label: 'Default', color: '#1f2937', description: 'Standard Mermaid theme' },
    { id: 'neutral', label: 'Neutral', color: '#5c6370', description: 'Neutral color palette' },
    { id: 'dark', label: 'Dark', color: '#0c0c0d', description: 'Dark background theme' },
    { id: 'forest', label: 'Forest', color: '#2d7324', description: 'Green-focused theme' },
    { id: 'base', label: 'Base', color: '#8fbcbb', description: 'Simple foundation theme' }
  ];
  
  // Close the theme options when clicking outside
  useEffect(() => {
    if (!showThemeOptions) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (
        themeSelectorRef.current && 
        !themeSelectorRef.current.contains(event.target as Node)
      ) {
        setShowThemeOptions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showThemeOptions]);
  
  const handleThemeButtonClick = () => {
    console.log("Theme button clicked");
    setShowThemeOptions(!showThemeOptions);
  };
  
  return (
    <div className="flex items-center" ref={themeSelectorRef}>
      <button
        onClick={handleThemeButtonClick}
        className={`px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center justify-center space-x-1.5 ${
          isDarkMode 
            ? "bg-gray-800 hover:bg-gray-700 text-white" 
            : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c]"
        } ${showThemeOptions ? (isDarkMode ? 'bg-gray-700' : 'bg-[#c8bba8]') : ''}`}
        title="Change Diagram Theme"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-4 w-4" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        <span className="text-sm font-medium">Theme</span>
        
        {/* Small indicator that the menu is open */}
        {showThemeOptions && (
          <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-primary"></span>
        )}
      </button>
      
      {showThemeOptions && (
        <div className={`ml-2 flex items-center space-x-2 overflow-x-auto p-2 rounded-lg shadow-md z-20 ${
          isDarkMode 
            ? "bg-gray-800 border border-gray-700" 
            : "bg-[#f0eee6] border border-[#d8cbb8]"
        }`}>
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                console.log(`Selecting theme: ${theme.id}`);
                changeTheme(theme.id);
                setShowThemeOptions(false);
              }}
              className={`flex-shrink-0 w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                currentTheme === theme.id
                  ? (isDarkMode ? 'border-white ring-2 ring-primary/50' : 'border-primary ring-2 ring-primary/50')
                  : (isDarkMode ? 'border-gray-700 hover:border-gray-500' : 'border-[#d8cbb8] hover:border-[#c8bba8]')
              }`}
              style={{ backgroundColor: theme.color }}
              title={`${theme.label}: ${theme.description}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DiagramThemeSelector; 