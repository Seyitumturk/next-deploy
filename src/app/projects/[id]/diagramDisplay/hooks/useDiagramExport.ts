'use client';

import { useState, useRef, RefObject } from 'react';
import { optimizeSvgForDisplay, ensureSvgDimensions, svgElementToString } from '../utils/svgUtils';

interface UseDiagramExportOptions {
  diagramTitle?: string;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: Error) => void;
}

interface UseDiagramExportReturn {
  isDownloading: string | null;
  downloadSVG: () => void;
  downloadPNG: (transparent?: boolean) => Promise<void>;
  exportSVGString: () => string | null;
  exportPNGDataUrl: (transparent?: boolean) => Promise<string | null>;
}

/**
 * Custom hook for handling diagram exports in SVG and PNG formats
 */
export function useDiagramExport(
  svgRef: RefObject<SVGSVGElement>,
  options: UseDiagramExportOptions = {}
): UseDiagramExportReturn {
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const {
    diagramTitle = 'diagram',
    onExportStart,
    onExportComplete,
    onExportError
  } = options;
  
  /**
   * Creates a download for the given content
   */
  const createDownload = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };
  
  /**
   * Exports the current SVG as a string
   */
  const exportSVGString = (): string | null => {
    try {
      if (!svgRef.current) {
        throw new Error('SVG reference is not available');
      }
      
      // Clone the SVG to avoid modifying the displayed one
      const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
      
      // Ensure the SVG has proper dimensions and optimize it
      const optimizedSvg = optimizeSvgForDisplay(ensureSvgDimensions(svgClone));
      
      // Convert to string
      return svgElementToString(optimizedSvg);
    } catch (error) {
      if (onExportError && error instanceof Error) {
        onExportError(error);
      }
      console.error('Error exporting SVG:', error);
      return null;
    }
  };
  
  /**
   * Downloads the current diagram as an SVG file
   */
  const downloadSVG = () => {
    try {
      if (onExportStart) onExportStart();
      setIsDownloading('svg');
      
      const svgString = exportSVGString();
      if (!svgString) {
        throw new Error('Failed to generate SVG string');
      }
      
      createDownload(svgString, `${diagramTitle}.svg`, 'image/svg+xml');
      
      if (onExportComplete) onExportComplete();
      setIsDownloading(null);
    } catch (error) {
      setIsDownloading(null);
      if (onExportError && error instanceof Error) {
        onExportError(error);
      }
      console.error('Error downloading SVG:', error);
    }
  };
  
  /**
   * Exports the current SVG as a PNG data URL
   */
  const exportPNGDataUrl = async (transparent = false): Promise<string | null> => {
    try {
      if (!svgRef.current) {
        throw new Error('SVG reference is not available');
      }
      
      // Get SVG string
      const svgString = exportSVGString();
      if (!svgString) {
        throw new Error('Failed to generate SVG string');
      }
      
      // Create a new Image element
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            // Create canvas if it doesn't exist
            if (!canvasRef.current) {
              canvasRef.current = document.createElement('canvas');
            }
            
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              throw new Error('Failed to get canvas context');
            }
            
            // Set canvas dimensions
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Clear canvas with white or transparent background
            if (transparent) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            } else {
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            // Draw the image
            ctx.drawImage(img, 0, 0);
            
            // Convert to data URL
            const dataUrl = canvas.toDataURL('image/png');
            URL.revokeObjectURL(url);
            resolve(dataUrl);
          } catch (error) {
            URL.revokeObjectURL(url);
            reject(error);
          }
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load SVG as image'));
        };
        
        img.src = url;
      });
    } catch (error) {
      if (onExportError && error instanceof Error) {
        onExportError(error);
      }
      console.error('Error exporting PNG:', error);
      return null;
    }
  };
  
  /**
   * Downloads the current diagram as a PNG file
   */
  const downloadPNG = async (transparent = false) => {
    try {
      if (onExportStart) onExportStart();
      setIsDownloading('png');
      
      const dataUrl = await exportPNGDataUrl(transparent);
      if (!dataUrl) {
        throw new Error('Failed to generate PNG data URL');
      }
      
      // Create download link
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${diagramTitle}${transparent ? '_transparent' : ''}.png`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      
      if (onExportComplete) onExportComplete();
      setIsDownloading(null);
    } catch (error) {
      setIsDownloading(null);
      if (onExportError && error instanceof Error) {
        onExportError(error);
      }
      console.error('Error downloading PNG:', error);
    }
  };
  
  return {
    isDownloading,
    downloadSVG,
    downloadPNG,
    exportSVGString,
    exportPNGDataUrl
  };
} 