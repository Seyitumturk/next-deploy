import { useCallback } from 'react';

interface UseFileProcessingProps {
  setPrompt: (prompt: string) => void;
  setError: (error: string) => void;
}

/**
 * Hook for processing files and websites for diagram generation
 */
export function useFileProcessing({ setPrompt, setError }: UseFileProcessingProps) {
  /**
   * Process a document file to extract content for diagram generation
   */
  const processDocument = useCallback(async (file: File) => {
    try {
      // For now, just return a placeholder implementation
      if (!file) {
        setError("No file selected");
        return;
      }

      const fileType = file.type;
      const fileName = file.name;
      
      // Simple text reading for demo purposes
      if (fileType.includes('text/plain')) {
        const text = await file.text();
        setPrompt((prev) => 
          prev + `\n\nContent from ${fileName}:\n${text.substring(0, 1000)}${text.length > 1000 ? '...' : ''}`
        );
        return;
      }
      
      // For other file types, we'd need more complex processing
      setPrompt((prev) => 
        prev + `\n\nPlease analyze ${fileName} and create a diagram based on its content.`
      );
    } catch (err) {
      console.error('Error processing document:', err);
      setError(`Failed to process document: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [setPrompt, setError]);

  /**
   * Process a website URL to extract content for diagram generation
   */
  const processWebsite = useCallback(async (url: string) => {
    try {
      if (!url) {
        setError("No URL provided");
        return;
      }

      // Validate URL format
      try {
        new URL(url);
      } catch (e) {
        setError("Invalid URL format");
        return;
      }

      // In a real implementation, we would use an API to fetch and process website content
      setPrompt((prev) => 
        prev + `\n\nPlease analyze the content from ${url} and create a diagram based on it.`
      );
    } catch (err) {
      console.error('Error processing website:', err);
      setError(`Failed to process website: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [setPrompt, setError]);

  /**
   * Handle file upload event
   */
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setError("No file selected");
      return;
    }

    processDocument(file);
    
    // Reset the input value to allow selecting the same file again
    e.target.value = '';
  }, [processDocument, setError]);

  return {
    processDocument,
    processWebsite,
    handleFileUpload
  };
}

// Default export for backward compatibility
export default useFileProcessing; 