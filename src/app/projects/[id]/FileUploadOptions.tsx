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
  
  const isProcessing = isProcessingFile || isProcessingImage;

  const handleWebsiteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (websiteUrl && processWebsite) {
      setProcessingOption('website');
      processWebsite(websiteUrl);
    }
  };

  const handleFileUploadWithTracking = (option: string, e: React.ChangeEvent<HTMLInputElement>) => {
    setProcessingOption(option);
    if (option === 'image-upload') {
      handleImageUpload && handleImageUpload(e);
    } else {
      handleFileUpload(e);
    }
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
          disabled={isProcessing}
        >
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a3 3 0 013-3z" clipRule="evenodd" />
            </svg>
            <span>Import from document or image</span>
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
          <div className="mt-2">
            {/* Drag and drop area */}
            <div 
              className={`border-2 border-dashed ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'} 
                        rounded-lg p-4 mb-4 text-center transition-colors duration-200 ease-in-out`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center py-2">
                  <LoadingSpinner size={24} className="text-blue-500 mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {isProcessingFile ? 'Processing document...' : 'Processing image...'}
                  </p>
                </div>
              ) : (
                <>
                  <UploadIcon size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                    Drag and drop files here, or use the options below
                  </p>
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-md text-sm ${
                  isDarkMode 
                    ? "bg-gray-800 hover:bg-gray-700 text-gray-300" 
                    : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c] border border-[#b8a990]"
                } ${isProcessingFile && processingOption === 'pdf-upload' ? 'animate-pulse' : ''}`}
                title="Upload PDF Document"
                disabled={isProcessing}
              >
                {isProcessingFile && processingOption === 'pdf-upload' ? (
                  <LoadingSpinner size={20} className="mb-1 text-red-500" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M9 15v-2h6v2"></path>
                    <path d="M12 13v5"></path>
                  </svg>
                )}
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={() => wordInputRef.current?.click()}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-md text-sm ${
                  isDarkMode 
                    ? "bg-gray-800 hover:bg-gray-700 text-gray-300" 
                    : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c] border border-[#b8a990]"
                } ${isProcessingFile && processingOption === 'word-upload' ? 'animate-pulse' : ''}`}
                title="Upload Word Document"
                disabled={isProcessing}
              >
                {isProcessingFile && processingOption === 'word-upload' ? (
                  <LoadingSpinner size={20} className="mb-1 text-indigo-500" />
                ) : (
                  <FileIcon size={20} className="mb-1 text-indigo-500" />
                )}
                <span>Word</span>
              </button>

              <button
                type="button"
                onClick={() => pptxInputRef.current?.click()}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-md text-sm ${
                  isDarkMode 
                    ? "bg-gray-800 hover:bg-gray-700 text-gray-300" 
                    : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c] border border-[#b8a990]"
                } ${isProcessingFile && processingOption === 'pptx-upload' ? 'animate-pulse' : ''}`}
                title="Upload PowerPoint Presentation"
                disabled={isProcessing}
              >
                {isProcessingFile && processingOption === 'pptx-upload' ? (
                  <LoadingSpinner size={20} className="mb-1 text-orange-500" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <rect x="8" y="12" width="8" height="6" rx="1" />
                  </svg>
                )}
                <span>PPTX</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 mt-2">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-md text-sm ${
                  isDarkMode 
                    ? "bg-gray-800 hover:bg-gray-700 text-gray-300" 
                    : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c] border border-[#b8a990]"
                } ${isProcessingImage && processingOption === 'image-upload' ? 'animate-pulse' : ''}`}
                title="Upload Image"
                disabled={isProcessing}
              >
                {isProcessingImage && processingOption === 'image-upload' ? (
                  <LoadingSpinner size={20} className="mb-1 text-purple-500" />
                ) : (
                  <ImageIcon size={20} className="mb-1 text-purple-500" />
                )}
                <span>Image</span>
              </button>
            </div>

            {processWebsite && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowWebsiteInput(prev => !prev)}
                  className={`w-full flex items-center justify-center px-3 py-2 rounded-md text-sm ${
                    isDarkMode 
                      ? "bg-gray-800 hover:bg-gray-700 text-gray-300" 
                      : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c] border border-[#b8a990]"
                  } ${isProcessingFile && processingOption === 'website' ? 'animate-pulse' : ''}`}
                  title="Import from Website"
                  disabled={isProcessing}
                >
                  {isProcessingFile && processingOption === 'website' ? (
                    <LoadingSpinner size={20} className="mr-2 text-green-500" />
                  ) : (
                    <GlobeIcon size={20} className="mr-2 text-green-500" />
                  )}
                  <span>Import from Website</span>
                </button>

                {showWebsiteInput && (
                  <form onSubmit={handleWebsiteSubmit} className="mt-2">
                    <div className="flex">
                      <input
                        type="url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="Enter website URL"
                        className={`flex-1 px-3 py-2 text-sm rounded-l-md ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            : "bg-white border-gray-300 text-gray-700 placeholder-gray-400"
                        } border focus:outline-none focus:ring-1 focus:ring-blue-500`}
                        disabled={isProcessing}
                        required
                      />
                      <button
                        type="submit"
                        className={`px-3 py-2 text-sm font-medium rounded-r-md ${
                          isDarkMode
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-blue-500 hover:bg-blue-600 text-white"
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                        disabled={isProcessing || !websiteUrl}
                      >
                        {isProcessingFile && processingOption === 'website' ? (
                          <LoadingSpinner size={20} />
                        ) : (
                          "Import"
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Separate file inputs for each document type */}
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
      
      {isProcessing && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          <p>Processing may take a few moments. Please wait...</p>
          <p className="mt-1">You can type your question in the input box below while processing.</p>
        </div>
      )}
    </div>
  );
} 