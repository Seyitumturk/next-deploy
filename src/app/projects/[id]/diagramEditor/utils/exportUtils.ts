/**
 * Utility functions for exporting diagrams in different formats
 */

/**
 * Prepares an SVG element for export by cleaning up and optimizing
 */
export function prepareSvgForExport(svgElement: SVGElement): SVGElement {
  // Clone the SVG to avoid modifying the original
  const clonedSvg = svgElement.cloneNode(true) as SVGElement;
  
  // Process viewBox and dimensions
  let hasViewBox = clonedSvg.hasAttribute('viewBox');
  let hasWidth = clonedSvg.hasAttribute('width');
  let hasHeight = clonedSvg.hasAttribute('height');
  
  // Try to get dimensions from various sources
  let width: number | null = null;
  let height: number | null = null;
  let viewBox: number[] | null = null;
  
  // First check for explicit dimensions
  if (hasWidth && hasHeight) {
    width = parseFloat(clonedSvg.getAttribute('width') || '0');
    height = parseFloat(clonedSvg.getAttribute('height') || '0');
  }
  
  // Then check for viewBox
  if (hasViewBox) {
    const viewBoxAttr = clonedSvg.getAttribute('viewBox') || '';
    const viewBoxValues = viewBoxAttr.split(/\s+/).map(parseFloat);
    
    if (viewBoxValues.length === 4 && !viewBoxValues.some(isNaN)) {
      viewBox = viewBoxValues;
      
      // Use viewBox dimensions if we don't have width/height
      if (!width || !height) {
        width = viewBox[2];
        height = viewBox[3];
      }
    }
  }
  
  // Try to compute bounding box as a last resort
  if (!width || !height || width <= 0 || height <= 0) {
    try {
      if (svgElement.getBBox) {
        const bbox = svgElement.getBBox();
        width = bbox.width;
        height = bbox.height;
        
        // Create a viewBox if none exists
        if (!hasViewBox) {
          viewBox = [bbox.x, bbox.y, bbox.width, bbox.height];
          clonedSvg.setAttribute('viewBox', viewBox.join(' '));
        }
      }
    } catch (e) {
      // Fallback values if all else fails
      width = width || 800;
      height = height || 600;
    }
  }
  
  // Ensure SVG has proper dimensions
  if (width && height) {
    clonedSvg.setAttribute('width', width.toString());
    clonedSvg.setAttribute('height', height.toString());
    
    // If we have no viewBox, create one that matches the dimensions
    if (!hasViewBox && width && height) {
      clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
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
    
    // Add crossorigin attribute to any images or other elements with external resources
    if (el.tagName.toLowerCase() === 'image' && el.hasAttribute('href')) {
      el.setAttribute('crossorigin', 'anonymous');
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
      
      // Get the SVG's dimensions - first try to get from the viewBox for accuracy
      let width, height, viewBox;
      
      if (cleanedSvg.hasAttribute('viewBox')) {
        viewBox = cleanedSvg.getAttribute('viewBox')?.split(/\s+/).map(Number);
        if (viewBox && viewBox.length === 4) {
          // viewBox format: minX minY width height
          width = viewBox[2];
          height = viewBox[3];
        }
      }
      
      // If viewBox didn't work, try width/height attributes
      if (!width || !height) {
        width = parseInt(cleanedSvg.getAttribute('width') || '800', 10);
        height = parseInt(cleanedSvg.getAttribute('height') || '600', 10);
      }
      
      // Get the SVG's bounding box as a fallback
      if (!width || !height || width <= 0 || height <= 0) {
        try {
          const bbox = cleanedSvg.getBBox();
          width = bbox.width;
          height = bbox.height;
          
          // Update viewBox if needed
          if (!cleanedSvg.hasAttribute('viewBox')) {
            cleanedSvg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
          }
        } catch (e) {
          // Fallback dimensions if getBBox fails
          width = 800;
          height = 600;
        }
      }
      
      // Scale up for high-quality export (2x resolution)
      const scale = 2;
      const exportWidth = width * scale;
      const exportHeight = height * scale;
      
      // Ensure proper dimensions are set on the SVG
      cleanedSvg.setAttribute('width', `${width}`);
      cleanedSvg.setAttribute('height', `${height}`);
      
      // Create a serialized SVG string
      const svgString = new XMLSerializer().serializeToString(cleanedSvg);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      // Create an Image object to load the SVG
      const img = new Image();
      img.crossOrigin = "anonymous";  // Prevent tainted canvas
      
      // When the image loads, draw it to a canvas and convert to PNG
      img.onload = () => {
        // Create a canvas with the scaled dimensions for high quality
        const canvas = document.createElement('canvas');
        canvas.width = exportWidth;
        canvas.height = exportHeight;
        
        // Get drawing context
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas 2D context'));
          return;
        }
        
        // Set image smoothing for high quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // If transparent, don't fill background
        if (!transparent) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, exportWidth, exportHeight);
        }
        
        // Draw the image, preserving aspect ratio
        ctx.drawImage(img, 0, 0, exportWidth, exportHeight);
        
        try {
          // Convert canvas to PNG blob with high quality
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert SVG to PNG'));
            }
            
            // Clean up
            URL.revokeObjectURL(url);
          }, 'image/png', 1.0); // Use maximum quality (1.0)
        } catch (canvasError) {
          // If the canvas is tainted, try alternative approach
          console.warn('Canvas tainted, trying alternative approach:', canvasError);
          fallbackSvgToPng(svgString, exportWidth, exportHeight, transparent)
            .then(resolve)
            .catch(reject)
            .finally(() => URL.revokeObjectURL(url));
        }
      };
      
      // Handle errors
      img.onerror = (error) => {
        URL.revokeObjectURL(url);
        reject(new Error(`Failed to load SVG: ${error}`));
      };
      
      // Trigger the loading process - Don't set width/height on the image
      // Let the natural dimensions of the SVG be preserved
      img.src = url;
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Fallback method to convert SVG to PNG using data URLs
 * This approach is more reliable for SVGs with embedded images
 */
async function fallbackSvgToPng(svgString: string, width: number, height: number, transparent: boolean = false): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // Convert SVG string to a data URL
      const svgData = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
      
      // Create an Image object
      const img = new Image();
      
      img.onload = () => {
        // Create canvas with the proper dimensions
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }
        
        // Enable high quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Set background if not transparent
        if (!transparent) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        
        // Calculate scaling to preserve aspect ratio
        const scale = Math.min(
          width / img.naturalWidth,
          height / img.naturalHeight
        );
        
        // Center the image
        const x = (width - img.naturalWidth * scale) / 2;
        const y = (height - img.naturalHeight * scale) / 2;
        
        // Draw the image with proper scaling
        ctx.drawImage(
          img, 
          0, 0, img.naturalWidth, img.naturalHeight,
          x, y, img.naturalWidth * scale, img.naturalHeight * scale
        );
        
        // Export as blob with high quality
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create PNG blob from canvas'));
          }
        }, 'image/png', 1.0); // Maximum quality
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load SVG data URL'));
      };
      
      img.src = svgData;
      
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