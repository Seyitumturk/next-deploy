/**
 * Utility functions for exporting diagrams in different formats
 */

/**
 * Prepares an SVG element for export by cleaning up and optimizing
 */
export function prepareSvgForExport(svgElement: SVGElement): SVGElement {
  // Clone the SVG to avoid modifying the original
  const clonedSvg = svgElement.cloneNode(true) as SVGElement;
  
  // Ensure SVG has proper dimensions
  if (!clonedSvg.hasAttribute('width') || !clonedSvg.hasAttribute('height')) {
    if (clonedSvg.hasAttribute('viewBox')) {
      const viewBox = clonedSvg.getAttribute('viewBox')?.split(' ');
      if (viewBox && viewBox.length === 4) {
        if (!clonedSvg.hasAttribute('width')) {
          clonedSvg.setAttribute('width', viewBox[2]);
        }
        if (!clonedSvg.hasAttribute('height')) {
          clonedSvg.setAttribute('height', viewBox[3]);
        }
      }
    }
  }
  
  // Ensure SVG has XML declaration and doctype
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  
  // Remove any scripts or event handlers for security
  const scripts = clonedSvg.querySelectorAll('script');
  scripts.forEach(script => script.remove());
  
  // Remove any elements with event handlers
  const allElements = clonedSvg.querySelectorAll('*');
  allElements.forEach(el => {
    // Remove all attributes that start with 'on'
    for (let i = el.attributes.length - 1; i >= 0; i--) {
      const attr = el.attributes[i];
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    }
  });
  
  return clonedSvg;
}

/**
 * Creates a download anchor element and triggers download
 */
export function downloadFile(fileName: string, contents: string | Blob, mimeType: string) {
  // Create a download link
  const downloadLink = document.createElement('a');
  
  // Set file name and contents as appropriate
  downloadLink.download = fileName;
  
  if (contents instanceof Blob) {
    // If contents is already a Blob, use it directly
    downloadLink.href = URL.createObjectURL(contents);
  } else {
    // Convert string to Blob with the specified MIME type
    const blob = new Blob([contents], { type: mimeType });
    downloadLink.href = URL.createObjectURL(blob);
  }
  
  // Add link to document temporarily, click it, and remove it
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  
  // Clean up the object URL to avoid memory leaks
  setTimeout(() => {
    if (downloadLink.href.startsWith('blob:')) {
      URL.revokeObjectURL(downloadLink.href);
    }
  }, 100);
}

/**
 * Converts an SVG element to a PNG image
 */
export async function convertSvgToPng(svgElement: SVGElement, transparent: boolean = false): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // Clone and prepare the SVG
      const cleanedSvg = prepareSvgForExport(svgElement);
      
      // Set background color if not transparent
      if (!transparent) {
        cleanedSvg.style.backgroundColor = '#ffffff';
      }
      
      // Get dimensions
      const width = parseInt(cleanedSvg.getAttribute('width') || '800', 10);
      const height = parseInt(cleanedSvg.getAttribute('height') || '600', 10);
      
      // Create a serialized SVG string
      const svgString = new XMLSerializer().serializeToString(cleanedSvg);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      // Create an Image object to load the SVG
      const img = new Image();
      img.width = width;
      img.height = height;
      
      // When the image loads, draw it to a canvas and convert to PNG
      img.onload = () => {
        // Create a canvas of the same dimensions
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Get drawing context
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas 2D context'));
          return;
        }
        
        // If transparent, don't fill background
        if (!transparent) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        
        // Draw the image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert canvas to PNG blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert SVG to PNG'));
          }
          
          // Clean up
          URL.revokeObjectURL(url);
        }, 'image/png');
      };
      
      // Handle errors
      img.onerror = (error) => {
        URL.revokeObjectURL(url);
        reject(new Error(`Failed to load SVG: ${error}`));
      };
      
      // Trigger the loading process
      img.src = url;
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Formats a date for use in filenames
 */
export function getFormattedDate(): string {
  const date = new Date();
  return date.toISOString()
    .replace(/T/, '_')
    .replace(/\..+/, '')
    .replace(/:/g, '-');
}

/**
 * Gets a formatted filename for diagram export
 */
export function getFormattedFileName(title: string, extension: string, transparent: boolean = false): string {
  const datePart = getFormattedDate();
  const transparentPart = transparent ? '_transparent' : '';
  const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  return `${sanitizedTitle}_diagram${transparentPart}_${datePart}.${extension}`;
} 