/**
 * Utility functions for SVG manipulation and processing
 */

/**
 * Gets the dimensions of an SVG element
 */
export function getSvgDimensions(svgElement: SVGElement): { width: number; height: number } {
  // Try to get width and height from attributes
  let width = svgElement.hasAttribute('width') 
    ? parseFloat(svgElement.getAttribute('width') || '0') 
    : 0;
  
  let height = svgElement.hasAttribute('height') 
    ? parseFloat(svgElement.getAttribute('height') || '0') 
    : 0;
  
  // If width or height is not available from attributes, try viewBox
  if (width === 0 || height === 0) {
    const viewBox = svgElement.getAttribute('viewBox');
    if (viewBox) {
      const [, , viewBoxWidth, viewBoxHeight] = viewBox.split(' ').map(parseFloat);
      
      if (width === 0 && !isNaN(viewBoxWidth)) {
        width = viewBoxWidth;
      }
      
      if (height === 0 && !isNaN(viewBoxHeight)) {
        height = viewBoxHeight;
      }
    }
  }
  
  // If still no dimensions, try to get from bounding box
  if (width === 0 || height === 0) {
    const bbox = svgElement.getBBox();
    if (width === 0) {
      width = bbox.width;
    }
    if (height === 0) {
      height = bbox.height;
    }
  }
  
  // Fallback to default dimensions if all else fails
  if (width === 0) width = 800;
  if (height === 0) height = 600;
  
  return { width, height };
}

/**
 * Ensures an SVG element has proper dimensions
 */
export function ensureSvgDimensions(svgElement: SVGElement): SVGElement {
  // Clone the SVG to avoid modifying the original
  const clonedSvg = svgElement.cloneNode(true) as SVGElement;
  
  // Get dimensions
  const { width, height } = getSvgDimensions(clonedSvg);
  
  // Set width and height attributes if not present
  if (!clonedSvg.hasAttribute('width')) {
    clonedSvg.setAttribute('width', width.toString());
  }
  
  if (!clonedSvg.hasAttribute('height')) {
    clonedSvg.setAttribute('height', height.toString());
  }
  
  // Add preserveAspectRatio attribute if not present
  if (!clonedSvg.hasAttribute('preserveAspectRatio')) {
    clonedSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }
  
  return clonedSvg;
}

/**
 * Optimizes an SVG for display by removing unnecessary attributes and elements
 */
export function optimizeSvgForDisplay(svgElement: SVGElement): SVGElement {
  // Clone the SVG to avoid modifying the original
  const clonedSvg = svgElement.cloneNode(true) as SVGElement;
  
  // Remove any scripts for security
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
 * Converts an SVG string to an SVG element
 */
export function svgStringToElement(svgString: string): SVGElement | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    
    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      console.error('Error parsing SVG:', parserError.textContent);
      return null;
    }
    
    return doc.documentElement as SVGElement;
  } catch (error) {
    console.error('Error converting SVG string to element:', error);
    return null;
  }
}

/**
 * Converts an SVG element to a string
 */
export function svgElementToString(svgElement: SVGElement): string {
  return new XMLSerializer().serializeToString(svgElement);
} 