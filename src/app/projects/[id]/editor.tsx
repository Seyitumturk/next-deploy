'use client';

import React from 'react';
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="h-12 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/projects" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <img src="/logo-green.svg" alt="Chartable Logo" className="h-6 w-6" />
              <span className="font-semibold text-gray-900 dark:text-white">{props.projectTitle}</span>
            </Link>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {props.diagramType.charAt(0).toUpperCase() + props.diagramType.slice(1).replace('_', ' ')} Diagram
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Credits: <span className="font-mono">{props.user.credits}</span>
                </span>
              </div>
              <div className="h-8 w-8 rounded-full bg-white dark:bg-white flex items-center justify-center text-black text-sm font-medium shadow-lg">
                {props.user.initials}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
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