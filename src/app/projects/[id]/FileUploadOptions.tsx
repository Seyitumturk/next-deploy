'use client';

import React, { useState, useRef } from 'react';
import { LoadingSpinner, UploadIcon, FileIcon, ImageIcon, CloseIcon, GlobeIcon } from '../../../components/icons/LoadingSpinner';

interface FileUploadOptionsProps {
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isProcessingFile: boolean;
  isProcessingImage: boolean;
  showFileUpload: boolean;
  setShowFileUpload: (show: boolean) => void;
  isDarkMode: boolean;
  processWebsite?: (url: string) => void;
}

export default function FileUploadOptions({
  handleFileUpload,
  handleImageUpload,
  isProcessingFile,
  isProcessingImage,
  showFileUpload,
  setShowFileUpload,
  isDarkMode,
  processWebsite,
}: FileUploadOptionsProps) {
  const [showWebsiteInput, setShowWebsiteInput] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [processingOption, setProcessingOption] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Create separate refs for each file type
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);
  const pptxInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const websiteInputRef = useRef<HTMLInputElement>(null);
  
  const isProcessing = isProcessingFile || isProcessingImage;

  const handleWebsiteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (websiteUrl && processWebsite) {
      setProcessingOption('website');
      processWebsite(websiteUrl);
      setShowFileUpload(false);
    }
  };

  const handleFileUploadWithTracking = (option: string, e: React.ChangeEvent<HTMLInputElement>) => {
    setProcessingOption(option);
    if (option === 'image-upload') {
      handleImageUpload && handleImageUpload(e);
    } else {
      handleFileUpload(e);
    }
    setShowFileUpload(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const fileType = file.type;
      
      if (fileType.startsWith('image/')) {
        // Create a synthetic event to pass to the image upload handler
        const syntheticEvent = {
          target: {
            files: e.dataTransfer.files
          }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleImageUpload && handleImageUpload(syntheticEvent);
        setProcessingOption('image-upload');
      } else if (fileType === 'application/pdf') {
        // Create a synthetic event for PDF upload
        const syntheticEvent = {
          target: {
            files: e.dataTransfer.files
          }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileUpload(syntheticEvent);
        setProcessingOption('pdf-upload');
      } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // Create a synthetic event for Word document upload
        const syntheticEvent = {
          target: {
            files: e.dataTransfer.files
          }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileUpload(syntheticEvent);
        setProcessingOption('word-upload');
      } else if (fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        // Create a synthetic event for PowerPoint upload
        const syntheticEvent = {
          target: {
            files: e.dataTransfer.files
          }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileUpload(syntheticEvent);
        setProcessingOption('pptx-upload');
      } else if (fileType === 'text/plain') {
        // Create a synthetic event for text file upload
        const syntheticEvent = {
          target: {
            files: e.dataTransfer.files
          }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileUpload(syntheticEvent);
        setProcessingOption('text-upload');
      }
    }
  };

  // Handle keyboard events for the website input
  const handleWebsiteInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Close the modal on Escape key
    if (e.key === 'Escape') {
      setShowWebsiteInput(false);
      setWebsiteUrl('');
      setShowFileUpload(false);
    }
  };

  return (
    <div className="w-full rounded-lg overflow-hidden z-50 transition-all duration-300 ease-in-out">
      <div className={`${isDarkMode ? "bg-[#282424]" : "bg-white"} p-4 rounded-lg shadow-xl border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
        {/* Drag and drop area */}
        <div 
          className={`border-2 border-dashed ${
            dragActive 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : isDarkMode 
                ? 'border-gray-600 hover:border-gray-500' 
                : 'border-gray-300 hover:border-gray-400'
          } rounded-lg p-4 mb-4 text-center transition-colors duration-200 ease-in-out`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-2">
              <LoadingSpinner size={24} className="text-blue-500 mb-2" />
              <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                {isProcessingFile ? 'Processing document...' : 'Processing image...'}
              </p>
            </div>
          ) : (
            <>
              <UploadIcon size={24} className={`mx-auto ${isDarkMode ? "text-gray-400" : "text-gray-500"} mb-2`} />
              <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"} mb-1`}>
                Drag files here or click an option below
              </p>
            </>
          )}
        </div>

        {/* File type options */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <button
            type="button"
            onClick={() => pdfInputRef.current?.click()}
            className={`flex flex-col items-center justify-center p-3 rounded-md ${
              isDarkMode 
                ? "bg-[#343030] hover:bg-[#3e3a3a] text-gray-200" 
                : "bg-[#f0e8dc] hover:bg-[#e8dccc] text-[#6a5c4c]"
            } ${isProcessingFile && processingOption === 'pdf-upload' ? 'animate-pulse' : ''} transition-colors`}
            title="Upload PDF Document"
            disabled={isProcessing}
          >
            {isProcessingFile && processingOption === 'pdf-upload' ? (
              <LoadingSpinner size={20} className="text-red-500" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <path d="M9 15v-2h6v2"></path>
                <path d="M12 13v5"></path>
              </svg>
            )}
            <span className="text-xs mt-1">PDF</span>
          </button>

          <button
            type="button"
            onClick={() => wordInputRef.current?.click()}
            className={`flex flex-col items-center justify-center p-3 rounded-md ${
              isDarkMode 
                ? "bg-[#343030] hover:bg-[#3e3a3a] text-gray-200" 
                : "bg-[#f0e8dc] hover:bg-[#e8dccc] text-[#6a5c4c]"
            } ${isProcessingFile && processingOption === 'word-upload' ? 'animate-pulse' : ''} transition-colors`}
            title="Upload Word Document"
            disabled={isProcessing}
          >
            {isProcessingFile && processingOption === 'word-upload' ? (
              <LoadingSpinner size={20} className="text-blue-500" />
            ) : (
              <FileIcon size={24} className="text-blue-500 mb-1" />
            )}
            <span className="text-xs mt-1">Word</span>
          </button>

          <button
            type="button"
            onClick={() => pptxInputRef.current?.click()}
            className={`flex flex-col items-center justify-center p-3 rounded-md ${
              isDarkMode 
                ? "bg-[#343030] hover:bg-[#3e3a3a] text-gray-200" 
                : "bg-[#f0e8dc] hover:bg-[#e8dccc] text-[#6a5c4c]"
            } ${isProcessingFile && processingOption === 'pptx-upload' ? 'animate-pulse' : ''} transition-colors`}
            title="Upload PowerPoint Presentation"
            disabled={isProcessing}
          >
            {isProcessingFile && processingOption === 'pptx-upload' ? (
              <LoadingSpinner size={20} className="text-orange-500" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <rect x="8" y="12" width="8" height="6" rx="1" />
              </svg>
            )}
            <span className="text-xs mt-1">PPTX</span>
          </button>

          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className={`flex flex-col items-center justify-center p-3 rounded-md ${
              isDarkMode 
                ? "bg-[#343030] hover:bg-[#3e3a3a] text-gray-200" 
                : "bg-[#f0e8dc] hover:bg-[#e8dccc] text-[#6a5c4c]"
            } ${isProcessingImage && processingOption === 'image-upload' ? 'animate-pulse' : ''} transition-colors`}
            title="Upload Image"
            disabled={isProcessing}
          >
            {isProcessingImage && processingOption === 'image-upload' ? (
              <LoadingSpinner size={20} className="text-purple-500" />
            ) : (
              <ImageIcon size={24} className="text-purple-500 mb-1" />
            )}
            <span className="text-xs mt-1">Image</span>
          </button>
        </div>

        {/* Website import option */}
        {processWebsite && (
          <div className="mt-2">
            {!showWebsiteInput ? (
              <button
                type="button"
                onClick={() => {
                  setShowWebsiteInput(true);
                  // Focus the input after a short delay to allow the UI to update
                  setTimeout(() => websiteInputRef.current?.focus(), 50);
                }}
                className={`w-full flex items-center justify-center p-3 rounded-md text-sm ${
                  isDarkMode 
                    ? "bg-[#343030] hover:bg-[#3e3a3a] text-gray-200" 
                    : "bg-[#f0e8dc] hover:bg-[#e8dccc] text-[#6a5c4c]"
                } ${isProcessingFile && processingOption === 'website' ? 'animate-pulse' : ''} transition-colors`}
                title="Import from Website"
                disabled={isProcessing}
              >
                {isProcessingFile && processingOption === 'website' ? (
                  <LoadingSpinner size={18} className="mr-2 text-green-500" />
                ) : (
                  <GlobeIcon size={20} className="mr-2 text-green-500" />
                )}
                <span>Import from Website</span>
              </button>
            ) : (
              <form onSubmit={handleWebsiteSubmit} className="mt-3 w-full">
                <div className="flex w-full">
                  <div className="relative w-full flex items-center">
                    <input
                      ref={websiteInputRef}
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      onKeyDown={handleWebsiteInputKeyDown}
                      placeholder="Enter website URL"
                      className={`w-full h-10 px-3 py-2 text-sm rounded-l-md ${
                        isDarkMode
                          ? "bg-[#343030] border-[#444] text-white placeholder-gray-400"
                          : "bg-[#f0e8dc] border-[#d8cbb8] text-[#6a5c4c] placeholder-[#8a7a66]"
                      } border focus:outline-none focus:ring-1 focus:ring-blue-500`}
                      disabled={isProcessing}
                      required
                    />
                    {websiteUrl && (
                      <button
                        type="button"
                        onClick={() => setWebsiteUrl('')}
                        className={`absolute right-2 ${
                          isDarkMode ? "text-gray-400 hover:text-gray-300" : "text-[#8a7a66] hover:text-[#6a5c4c]"
                        }`}
                        aria-label="Clear input"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    className={`h-10 px-4 py-2 text-sm font-medium rounded-r-md ${
                      isDarkMode
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors`}
                    disabled={isProcessing || !websiteUrl}
                  >
                    {isProcessingFile && processingOption === 'website' ? (
                      <LoadingSpinner size={16} />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="flex justify-between mt-2">
                  <button
                    type="button"
                    onClick={() => setShowWebsiteInput(false)}
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400 hover:text-gray-300" : "text-[#8a7a66] hover:text-[#6a5c4c]"
                    }`}
                  >
                    Cancel
                  </button>
                  <span className={`text-xs ${
                    isDarkMode ? "text-gray-400" : "text-[#8a7a66]"
                  }`}>
                    {websiteUrl ? 'Press Enter to import' : 'Enter a valid URL'}
                  </span>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Processing message */}
        {isProcessing && (
          <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-[#8a7a66]"} text-center mt-2`}>
            <p>Processing may take a few moments...</p>
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={pdfInputRef}
        onChange={(e) => handleFileUploadWithTracking('pdf-upload', e)}
        accept=".pdf"
        className="hidden"
        disabled={isProcessing}
      />
      
      <input
        type="file"
        ref={wordInputRef}
        onChange={(e) => handleFileUploadWithTracking('word-upload', e)}
        accept=".docx,.doc"
        className="hidden"
        disabled={isProcessing}
      />
      
      <input
        type="file"
        ref={pptxInputRef}
        onChange={(e) => handleFileUploadWithTracking('pptx-upload', e)}
        accept=".pptx,.ppt"
        className="hidden"
        disabled={isProcessing}
      />
      
      <input
        type="file"
        ref={imageInputRef}
        onChange={(e) => handleFileUploadWithTracking('image-upload', e)}
        accept="image/*"
        className="hidden"
        disabled={isProcessing}
      />
    </div>
  );
} 