'use client';

import React, { useState, useEffect } from 'react';

interface FileUploadOptionsProps {
  showFileUpload: boolean;
  setShowFileUpload: React.Dispatch<React.SetStateAction<boolean>>;
  isProcessingFile: boolean;
  isProcessingImage?: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  processWebsite: (url: string) => void;
  isDarkMode: boolean;
}

const FileUploadOptions: React.FC<FileUploadOptionsProps> = ({
  showFileUpload,
  setShowFileUpload,
  isProcessingFile,
  isProcessingImage,
  handleFileUpload,
  handleImageUpload,
  processWebsite,
  isDarkMode,
}) => {
  const [showWebsiteInput, setShowWebsiteInput] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [processingOption, setProcessingOption] = useState<string | null>(null);

  const handleWebsiteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (websiteUrl.trim()) {
      setProcessingOption('website');
      processWebsite(websiteUrl.trim());
      setWebsiteUrl('');
      setShowWebsiteInput(false);
    }
  };

  const handleFileUploadWithTracking = (
    option: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setProcessingOption(option);
    setShowFileUpload(false);
    
    if (option === 'image-upload' && handleImageUpload) {
      handleImageUpload(e);
    } else {
      handleFileUpload(e);
    }
  };

  useEffect(() => {
    if (!isProcessingFile && !isProcessingImage) {
      setProcessingOption(null);
    }
  }, [isProcessingFile, isProcessingImage]);

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
          <div className="mt-2 grid grid-cols-1 gap-2">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => document.getElementById('pdf-upload')?.click()}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-md text-sm ${
                  isDarkMode 
                    ? "bg-gray-800 hover:bg-gray-700 text-gray-300" 
                    : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c] border border-[#b8a990]"
                } ${isProcessingFile ? 'animate-pulse' : ''}`}
                title="Upload PDF Document"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <path d="M9 15v-2h6v2"></path>
                  <path d="M12 13v5"></path>
                </svg>
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={() => document.getElementById('powerpoint-upload')?.click()}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-md text-sm ${
                  isDarkMode 
                    ? "bg-gray-800 hover:bg-gray-700 text-gray-300" 
                    : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c] border border-[#b8a990]"
                } ${isProcessingFile ? 'animate-pulse' : ''}`}
                title="Upload PowerPoint Document"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <rect x="8" y="12" width="8" height="6"></rect>
                </svg>
                <span>PowerPoint</span>
              </button>

              <button
                type="button"
                onClick={() => document.getElementById('word-upload')?.click()}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-md text-sm ${
                  isDarkMode 
                    ? "bg-gray-800 hover:bg-gray-700 text-gray-300" 
                    : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c] border border-[#b8a990]"
                } ${isProcessingFile ? 'animate-pulse' : ''}`}
                title="Upload Word Document"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                  <line x1="8" y1="16" x2="14" y2="16"></line>
                </svg>
                <span>Word</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => document.getElementById('image-upload')?.click()}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-md text-sm ${
                  isDarkMode 
                    ? "bg-gray-800 hover:bg-gray-700 text-gray-300" 
                    : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c] border border-[#b8a990]"
                } ${isProcessingImage ? 'animate-pulse' : ''}`}
                title="Upload Image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <span>Image</span>
              </button>

              <button
                type="button"
                onClick={() => setShowWebsiteInput(prev => !prev)}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-md text-sm ${
                  isDarkMode 
                    ? "bg-gray-800 hover:bg-gray-700 text-gray-300" 
                    : "bg-[#d8cbb8] hover:bg-[#c8bba8] text-[#6a5c4c] border border-[#b8a990]"
                } ${isProcessingFile && processingOption === 'website' ? 'animate-pulse' : ''}`}
                title="Import from Website"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                <span>Website</span>
              </button>
            </div>
          </div>
        )}
      </div>
      <input
        id="pdf-upload"
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => handleFileUploadWithTracking('pdf-upload', e)}
      />
      <input
        id="powerpoint-upload"
        type="file"
        accept=".ppt,.pptx"
        className="hidden"
        onChange={(e) => handleFileUploadWithTracking('powerpoint-upload', e)}
      />
      <input
        id="word-upload"
        type="file"
        accept=".doc,.docx"
        className="hidden"
        onChange={(e) => handleFileUploadWithTracking('word-upload', e)}
      />
      <input
        id="image-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUploadWithTracking('image-upload', e)}
      />
      
      {showWebsiteInput && (
        <form onSubmit={handleWebsiteSubmit} className="mt-2">
          <div className="flex">
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="Enter website URL"
              className={`flex-1 rounded-l-lg border px-3 py-2 text-sm ${
                isDarkMode
                  ? "border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                  : "border-[#d8cbb8] bg-[#e8dccc] text-[#6a5c4c] placeholder:text-[#8a7a66]"
              }`}
              required
            />
            <button
              type="submit"
              disabled={isProcessingFile || !websiteUrl.trim()}
              className={`rounded-r-lg px-3 py-2 ${
                isDarkMode
                  ? "bg-primary text-white hover:bg-primary-dark disabled:bg-gray-700"
                  : "bg-primary text-white hover:bg-primary-dark disabled:bg-[#d8cbb8]"
              } transition-colors disabled:cursor-not-allowed`}
            >
              {isProcessingFile && processingOption === 'website' ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                "Process"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default FileUploadOptions; 