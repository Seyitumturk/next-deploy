'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { PPTXLoader } from "@langchain/community/document_loaders/fs/pptx";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

// Modularized component imports
import ChatMessage from './ChatMessage';
import FileUploadOptions from './FileUploadOptions';
import DiagramControls from './DiagramControls';
import PromptPanel from './PromptPanel';
import DiagramDisplay from './DiagramDisplay';
// Import our custom hook
import useDiagramEditor, { EditorProps } from './useDiagramEditor';

const DiagramEditor: React.FC<EditorProps> = (props) => {
  const router = useRouter();
  const editor = useDiagramEditor(props);

  // Add dark mode toggle state
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Toggle the 'dark' class on the document element based on state
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? "bg-gradient-to-br from-gray-900 to-gray-800" : "bg-[#e8dccc]"}`}>
      {/* Header */}
      <header className="h-12 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="h-full px-4 flex items-center justify-between">
          {/* Desktop view: show project title and diagram type */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/projects"
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <img src="/logo-green.svg" alt="Chartable Logo" className="h-6 w-6" />
              <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[150px] md:max-w-none">
                {props.projectTitle}
              </span>
            </Link>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {props.diagramType.charAt(0).toUpperCase() +
                props.diagramType.slice(1).replace('_', ' ')} Diagram
            </span>
          </div>
          {/* Mobile view: show logo and diagram type */}
          <div className="flex md:hidden items-center space-x-2">
            <Link href="/projects" className="flex items-center hover:opacity-80 transition-opacity">
              <img src="/logo-green.svg" alt="Chartable Logo" className="h-6 w-6" />
            </Link>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {props.diagramType.charAt(0).toUpperCase() +
                props.diagramType.slice(1).replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            {/* Dark/Light Mode Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
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
                  className="h-5 w-5 text-gray-300"
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
              <div className="flex items-center space-x-1 h-8 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-500 dark:text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Credits:
                  <span className="font-mono ml-1">{props.user.credits}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

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
          processWebsite={editor.processWebsite}
          isProcessingFile={editor.isProcessingFile}
          documentSummary={editor.documentSummary}
          showFileUpload={editor.showFileUpload}
          setShowFileUpload={editor.setShowFileUpload}
          handleCodeChange={editor.handleCodeChange}
          currentDiagram={editor.currentDiagram}
          setCurrentDiagram={editor.setCurrentDiagram}
          renderDiagram={editor.renderDiagram}
          setIsEditorReady={editor.setIsEditorReady}
          setShowPromptPanel={editor.setShowPromptPanel}
        />
        <DiagramDisplay
          showPromptPanel={editor.showPromptPanel}
          downloadSVG={editor.downloadSVG}
          downloadPNG={editor.downloadPNG}
          showExportMenu={editor.showExportMenu}
          setShowExportMenu={editor.setShowExportMenu}
          setShowPromptPanel={editor.setShowPromptPanel}
          scale={editor.scale}
          setScale={editor.setScale}
          setPosition={editor.setPosition}
          isGenerating={editor.isGenerating}
          isDragging={editor.isDragging}
          svgOutput={editor.svgOutput}
          diagramRef={editor.diagramRef}
          svgRef={editor.svgRef}
          handleMouseDown={editor.handleMouseDown}
          position={editor.position}
        />
      </div>
    </div>
  );
};

export default DiagramEditor; 