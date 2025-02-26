'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Modularized component imports
import PromptPanel from './PromptPanel';
import DiagramDisplay from './DiagramDisplay';
// Import our custom hook
import useDiagramEditor, { EditorProps } from './useDiagramEditor';
import { motion } from 'framer-motion';

const DiagramEditor: React.FC<EditorProps> = (props) => {
  const editor = useDiagramEditor(props);

  // Add dark mode toggle state
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Add a new useEffect to load the dark mode preference from localStorage:
  useEffect(() => {
    const storedPref = localStorage.getItem('isDarkMode');
    if (storedPref !== null) {
      setIsDarkMode(storedPref === 'true');
    }
  }, []);

  // Update the dark mode effect to also persist the new setting:
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('isDarkMode', isDarkMode.toString());
  }, [isDarkMode]);

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" : "bg-gradient-to-br from-[#f0eee6] via-white to-[#f0eee6]"}`}>
      {/* Header */}
      <header className={`h-16 backdrop-blur-md border-b ${
        isDarkMode 
          ? "bg-gray-900/80 border-gray-800/50" 
          : "bg-[#e8dccc]/80 border-[#e8dccc]/50"
      } sticky top-0 z-50`}>
        <div className="h-full px-6 flex items-center justify-between">
          {/* Desktop view: show project title and diagram type */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/projects"
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <Image src="/logo-green.svg" alt="Chartable Logo" width={24} height={24} className="h-6 w-6" />
              <span className={`font-semibold truncate max-w-[150px] md:max-w-none ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}>
                {props.projectTitle}
              </span>
            </Link>
            <div className={`h-4 w-px ${isDarkMode ? "bg-gray-700" : "bg-[#d8cbb8]"}`} />
            <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-[#8a7a66]"}`}>
              {props.diagramType.charAt(0).toUpperCase() +
                props.diagramType.slice(1).replace('_', ' ')} Diagram
            </span>
          </div>
          {/* Mobile view: show logo and diagram type */}
          <div className="flex md:hidden items-center space-x-2">
            <Link href="/projects" className="flex items-center hover:opacity-80 transition-opacity">
              <Image src="/logo-green.svg" alt="Chartable Logo" width={24} height={24} className="h-6 w-6" />
            </Link>
            <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-[#8a7a66]"}`}>
              {props.diagramType.charAt(0).toUpperCase() +
                props.diagramType.slice(1).replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            {/* Dark/Light Mode Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full ${isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200"} transition-colors`}
              title="Toggle Dark Mode"
            >
              {isDarkMode ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-yellow-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 4.364l-1.414-1.414M7.05 7.05L5.636 5.636m12.728 0l-1.414 1.414M7.05 16.95l-1.414 1.414M12 8a4 4 0 100 8 4 4 0 000-8z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
                  />
                </svg>
              )}
            </button>
            <div className="flex items-center">
              <div className={`flex items-center space-x-1 h-8 px-3 py-1 rounded-lg ${
                isDarkMode 
                  ? "bg-gray-800/50 text-gray-300" 
                  : "bg-[#d8cbb8]/70 text-[#6a5c4c]"
              } flex-shrink-0`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 ${isDarkMode ? "text-primary" : "text-primary"}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-[#6a5c4c]"}`}>
                  Credits:
                  <span className="font-mono ml-1">{props.user.credits}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

      {/* Main Content */}
      <div className="flex-1 flex overflow-auto">
        <PromptPanel
          isVisible={editor.showPromptPanel}
          editorMode={editor.editorMode}
          setEditorMode={editor.setEditorMode}
          chatHistory={editor.chatHistory}
          chatContainerRef={editor.chatContainerRef}
          prompt={editor.prompt}
          setPrompt={editor.setPrompt}
          isGenerating={editor.isGenerating}
          error={editor.error}
          handleGenerateDiagram={editor.handleGenerateDiagram}
          handleFileUpload={editor.handleFileUpload}
          handleImageUpload={editor.handleImageUpload}
          processWebsite={editor.processWebsite}
          isProcessingFile={editor.isProcessingFile}
          isProcessingImage={editor.isProcessingImage}
          documentSummary={editor.documentSummary}
          showFileUpload={editor.showFileUpload}
          setShowFileUpload={editor.setShowFileUpload}
          handleCodeChange={editor.handleCodeChange}
          currentDiagram={editor.currentDiagram}
          setCurrentDiagram={editor.setCurrentDiagram}
          onRenderDiagram={editor.renderDiagram}
          setIsEditorReady={editor.setIsEditorReady}
          setShowPromptPanel={editor.setShowPromptPanel}
          isDarkMode={isDarkMode}
          onDiagramVersionSelect={editor.handleDiagramVersionSelect}
          downloadSVG={editor.downloadSVG}
          downloadPNG={editor.downloadPNG}
        />
        <DiagramDisplay
          showPromptPanel={editor.showPromptPanel}
          setShowPromptPanel={editor.setShowPromptPanel}
          scale={editor.scale}
          setScale={editor.setScale}
          position={editor.position}
          setPosition={editor.setPosition}
          isGenerating={editor.isGenerating}
          isDragging={editor.isDragging}
          setIsDragging={editor.setIsDragging}
          svgOutput={editor.svgOutput}
          diagramRef={editor.diagramRef}
          svgRef={editor.svgRef}
          handleMouseDown={(e) => {
            if (editor.isDragging) return;
            editor.setIsDragging(true);
            editor.setDragStart({ x: e.pageX, y: e.pageY });
          }}
          downloadSVG={editor.downloadSVG}
          downloadPNG={editor.downloadPNG}
          showExportMenu={editor.showExportMenu}
          setShowExportMenu={editor.setShowExportMenu}
          isDarkMode={isDarkMode}
          currentDiagram={editor.currentDiagram}
          setCurrentDiagram={editor.setCurrentDiagram}
          renderError={editor.renderError}
          isLoading={editor.isLoading}
          isDownloading={editor.isDownloading}
          currentTheme={editor.currentTheme}
          changeTheme={editor.changeTheme}
          diagramType={props.diagramType}
          isVersionSelectionInProgress={editor.isVersionSelectionInProgress}
        />
      </div>
    </div>
  );
};

export default DiagramEditor; 