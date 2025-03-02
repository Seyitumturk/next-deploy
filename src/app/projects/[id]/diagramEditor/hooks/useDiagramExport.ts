import { useCallback } from 'react';
import { downloadFile, convertSvgToPng, getFormattedFileName } from '../utils/exportUtils';

interface UseDiagramExportProps {
  projectTitle: string;
  svgRef: React.RefObject<HTMLDivElement>;
  svgOutput: string;
  setIsDownloading: React.Dispatch<React.SetStateAction<string | null>>;
  diagramType: string;
}

const useDiagramExport = ({
  projectTitle,
  svgRef,
  svgOutput,
  setIsDownloading,
  diagramType
}: UseDiagramExportProps) => {
  // Download SVG function
  const downloadSVG = useCallback(() => {
    if (!svgOutput || !svgRef.current) {
      console.error('No SVG content to download');
      return;
    }
    
    try {
      setIsDownloading('svg');
      
      // Get the SVG element
      const svgElement = svgRef.current.querySelector('svg');
      if (!svgElement) {
        throw new Error('SVG element not found');
      }
      
      // Process SVG for download
      const sanitizedSvg = new XMLSerializer().serializeToString(svgElement);
      
      // Generate filename
      const fileName = getFormattedFileName(projectTitle || diagramType, 'svg');
      
      // Trigger download
      downloadFile(fileName, sanitizedSvg, 'image/svg+xml');
      
    } catch (error) {
      console.error('Error downloading SVG:', error);
    } finally {
      setIsDownloading(null);
    }
  }, [svgOutput, svgRef, projectTitle, diagramType, setIsDownloading]);

  // Download PNG function
  const downloadPNG = useCallback(async (transparent: boolean = false) => {
    if (!svgOutput || !svgRef.current) {
      console.error('No SVG content to download as PNG');
      return;
    }
    
    try {
      setIsDownloading('png');
      
      // Get the SVG element
      const svgElement = svgRef.current.querySelector('svg');
      if (!svgElement) {
        throw new Error('SVG element not found');
      }
      
      // Convert SVG to PNG
      const pngBlob = await convertSvgToPng(svgElement, transparent);
      
      // Generate filename
      const fileName = getFormattedFileName(projectTitle || diagramType, 'png', transparent);
      
      // Trigger download
      downloadFile(fileName, pngBlob, 'image/png');
      
    } catch (error) {
      console.error('Error downloading PNG:', error);
    } finally {
      setIsDownloading(null);
    }
  }, [svgOutput, svgRef, projectTitle, diagramType, setIsDownloading]);

  return {
    downloadSVG,
    downloadPNG
  };
};

export default useDiagramExport; 