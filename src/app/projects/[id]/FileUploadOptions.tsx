'use client';

import React from 'react';

interface FileUploadOptionsProps {
  showFileUpload: boolean;
  setShowFileUpload: React.Dispatch<React.SetStateAction<boolean>>;
  isProcessingFile: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FileUploadOptions: React.FC<FileUploadOptionsProps> = ({
  showFileUpload,
  setShowFileUpload,
  isProcessingFile,
  handleFileUpload,
}) => {
  return (
    <div className="mb-4">
      <button
        onClick={() => setShowFileUpload(!showFileUpload)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 
          rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 
          dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-600 dark:text-gray-300"
      >
        <div className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a3 3 0 013-3z" clipRule="evenodd" />
          </svg>
          <span>Import from document</span>
        </div>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-4 w-4 transform transition-transform ${showFileUpload ? 'rotate-180' : ''}`} 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {showFileUpload && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button
            onClick={() => document.getElementById('pdf-upload')?.click()}
            disabled={isProcessingFile}
            className="flex flex-col items-center justify-center p-3 bg-white dark:bg-gray-800 
              rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 
              dark:hover:bg-gray-700 transition-colors"
          >
            {isProcessingFile ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500" />
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mb-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 18H17V16H7V18M17 14H7V12H17V14M7 10H11V8H7V10M20.1 3H3.9C3.4 3 3 3.4 3 3.9V20.1C3 20.5 3.4 21 3.9 21H20.1C20.5 21 21 20.5 21 20.1V3.9C21 3.4 20.5 3 20.1 3M19 19H5V5H19V19Z" />
                </svg>
                <span className="text-xs">PDF</span>
              </>
            )}
          </button>

          <button
            onClick={() => document.getElementById('docx-upload')?.click()}
            disabled={isProcessingFile}
            className="flex flex-col items-center justify-center p-3 bg-white dark:bg-gray-800 
              rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 
              dark:hover:bg-gray-700 transition-colors"
          >
            {isProcessingFile ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mb-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6,2H14L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M13,3.5V9H18.5L13,3.5M8,11V13H16V11H8M8,15V17H16V15H8Z" />
                </svg>
                <span className="text-xs">Word</span>
              </>
            )}
          </button>

          <button
            onClick={() => document.getElementById('pptx-upload')?.click()}
            disabled={isProcessingFile}
            className="flex flex-col items-center justify-center p-3 bg-white dark:bg-gray-800 
              rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 
              dark:hover:bg-gray-700 transition-colors"
          >
            {isProcessingFile ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500" />
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500 mb-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6,2H14L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M13,3.5V9H18.5L13,3.5M8,11V13H16V11H8M8,15V17H16V15H8Z" />
                </svg>
                <span className="text-xs">PowerPoint</span>
              </>
            )}
          </button>
        </div>
      )}
      <input
        id="pdf-upload"
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileUpload}
      />
      <input
        id="docx-upload"
        type="file"
        accept=".docx"
        className="hidden"
        onChange={handleFileUpload}
      />
      <input
        id="pptx-upload"
        type="file"
        accept=".pptx"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
};

export default FileUploadOptions; 