'use client';

import React, { useState, useEffect } from 'react';

interface FileUploadOptionsProps {
  showFileUpload: boolean;
  setShowFileUpload: React.Dispatch<React.SetStateAction<boolean>>;
  isProcessingFile: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  processWebsite: (url: string) => void;
  isDarkMode: boolean;
}

const FileUploadOptions: React.FC<FileUploadOptionsProps> = ({
  showFileUpload,
  setShowFileUpload,
  isProcessingFile,
  handleFileUpload,
  processWebsite,
  isDarkMode,
}) => {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [showWebsiteInput, setShowWebsiteInput] = useState(false);

  return (
    <div className="flex flex-col space-y-4">
      <div className="mb-4">
        <button
          onClick={() => setShowFileUpload(!showFileUpload)}
          className={`w-full flex items-center justify-between rounded-lg border ${
            isDarkMode
              ? "border-gray-700 hover:bg-gray-700 bg-gray-800 text-white"
              : "border-[#d8cbb8] hover:bg-[#d8cbb8] bg-[#e8dccc] text-[#6a5c4c]"
          } transition-colors text-sm font-medium px-3 py-2`}
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
          <div className="mt-2 grid grid-cols-4 gap-2">
            <button
              onClick={() => document.getElementById('pdf-upload')?.click()}
              disabled={isProcessingFile}
              className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${
                isDarkMode
                  ? "bg-gray-800 text-white border border-gray-700 hover:bg-gray-700"
                  : "bg-[#e8dccc] text-[#6a5c4c] border border-[#d8cbb8] hover:bg-[#d8cbb8]"
              }`}
            >
              {isProcessingFile ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500" />
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 18H17V16H7V18M17 14H7V12H17V14M7 10H11V8H7V10M20.1 3H3.9C3.4 3 3 3.4 3 3.9V20.1C3 20.5 3.4 21 3.9 21H20.1C20.5 21 21 20.5 21 20.1V3.9C21 3.4 20.5 3 20.1 3M19 19H5V5H19V19Z" />
                  </svg>
                  <span className="text-xs">PDF</span>
                </>
              )}
            </button>

            <button
              onClick={() => document.getElementById('docx-upload')?.click()}
              disabled={isProcessingFile}
              className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${
                isDarkMode
                  ? "bg-gray-800 text-white border border-gray-700 hover:bg-gray-700"
                  : "bg-[#e8dccc] text-[#6a5c4c] border border-[#d8cbb8] hover:bg-[#d8cbb8]"
              }`}
            >
              {isProcessingFile ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6,2H14L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M13,3.5V9H18.5L13,3.5M8,11V13H16V11H8M8,15V17H16V15H8Z" />
                  </svg>
                  <span className="text-xs">Word</span>
                </>
              )}
            </button>

            <button
              onClick={() => document.getElementById('pptx-upload')?.click()}
              disabled={isProcessingFile}
              className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${
                isDarkMode
                  ? "bg-gray-800 text-white border border-gray-700 hover:bg-gray-700"
                  : "bg-[#e8dccc] text-[#6a5c4c] border border-[#d8cbb8] hover:bg-[#d8cbb8]"
              }`}
            >
              {isProcessingFile ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500" />
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6,2H14L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M13,3.5V9H18.5L13,3.5M8,11V13H16V11H8M8,15V17H16V15H8Z" />
                  </svg>
                  <span className="text-xs">PowerPoint</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowWebsiteInput(prev => !prev)}
              disabled={isProcessingFile}
              className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${
                isDarkMode
                  ? "bg-gray-800 text-white border border-gray-700 hover:bg-gray-700"
                  : "bg-[#e8dccc] text-[#6a5c4c] border border-[#d8cbb8] hover:bg-[#d8cbb8]"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 00-7.07 17.07l-1.41 1.41A1 1 0 005 22h14a1 1 0 00.78-1.62l-1.41-1.41A10 10 0 0012 2zm0 2a8 8 0 01.894 15.978L12 20a8 8 0 01-6.32-13.32l1.45 1.45A6 6 0 1012 4z" />
              </svg>
              <span className="text-xs">Website</span>
            </button>
          </div>
        )}
      </div>
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

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showWebsiteInput ? 'max-h-16 opacity-100 mt-0' : 'max-h-0 opacity-0'}`}>
        <div className="flex items-center space-x-2 mt-1 mb-1">
          <input
            id="website-url"
            type="text"
            placeholder="Enter website URL"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className={`w-full px-4 py-2 rounded-l-xl border ${isDarkMode 
              ? "border-gray-700 bg-gray-800 text-white focus:ring-primary/50" 
              : "border-[#d8cbb8] bg-[#e8dccc]/70 text-[#6a5c4c] focus:ring-primary/50"
            } text-sm focus:outline-none focus:ring-2`}
          />
          <button
            type="button"
            onClick={() => processWebsite(websiteUrl)}
            className="flex items-center justify-center p-2 rounded-r-xl bg-primary hover:bg-primary-dark text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-4 4a4 4 0 01-5.656-5.656l1.414-1.414M10.172 13.828a4 4 0 010-5.656l4-4a4 4 0 015.656 5.656l-1.414 1.414" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileUploadOptions; 