import { useCallback } from 'react';

interface UseImageProcessingProps {
  setIsUploadingImage: (isUploading: boolean) => void;
  setPrompt: (prompt: string) => void;
  setError?: (error: string) => void;
}

/**
 * Hook for processing and uploading images
 */
export function useImageProcessing({ 
  setIsUploadingImage, 
  setPrompt, 
  setError 
}: UseImageProcessingProps) {
  
  /**
   * Process an image for analysis and diagram generation
   */
  const processImage = useCallback(async (file: File) => {
    try {
      setIsUploadingImage(true);
      
      if (!file) {
        if (setError) setError("No image selected");
        setIsUploadingImage(false);
        return;
      }

      const imageName = file.name;
      
      // Check if the file is an image
      if (!file.type.startsWith('image/')) {
        if (setError) setError("Selected file is not an image");
        setIsUploadingImage(false);
        return;
      }
      
      // In a real implementation, you would:
      // 1. Upload the image to a server or process it locally
      // 2. Extract information from the image (using OCR or image analysis API)
      // 3. Format the extracted information into a diagram

      // For now, just add a placeholder prompt
      setTimeout(() => {
        setPrompt((prev) => 
          prev + `\n\nPlease analyze the image ${imageName} and create a diagram based on its content.`
        );
        setIsUploadingImage(false);
      }, 1000);
    } catch (err) {
      console.error('Error processing image:', err);
      if (setError) setError(`Failed to process image: ${err instanceof Error ? err.message : String(err)}`);
      setIsUploadingImage(false);
    }
  }, [setIsUploadingImage, setPrompt, setError]);

  /**
   * Handle image upload from input element
   */
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      if (setError) setError("No image selected");
      return;
    }

    processImage(file);
    
    // Reset the input value to allow selecting the same image again
    e.target.value = '';
  }, [processImage, setError]);

  return {
    processImage,
    handleImageUpload
  };
}

// Default export for backward compatibility
export default useImageProcessing; 