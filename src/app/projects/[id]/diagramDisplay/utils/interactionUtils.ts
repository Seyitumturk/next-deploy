/**
 * Utility functions for handling diagram interactions like zoom and pan
 */

interface InteractionOptions {
  scale: number;
  position: { x: number; y: number };
  setScale: (scale: number) => void;
  setPosition: (position: { x: number; y: number }) => void;
}

/**
 * Sets up event handlers for SVG interactions (zoom and pan)
 * Returns a cleanup function to remove event listeners
 */
export function setupSvgInteractions(
  element: HTMLElement,
  options: InteractionOptions
): () => void {
  const { scale, position, setScale, setPosition } = options;
  
  // Apply CSS to prevent text selection
  const disableTextSelection = () => {
    document.body.classList.add('diagram-dragging');
  };
  
  // Remove CSS to re-enable text selection
  const enableTextSelection = () => {
    document.body.classList.remove('diagram-dragging');
  };
  
  // Handle mouse move for panning
  const handleMouseMove = (e: MouseEvent) => {
    // Check if we're in dragging mode (set by parent component)
    const isDragging = element.classList.contains('cursor-grabbing');
    if (!isDragging) return;
    
    e.preventDefault();
    
    // Get the initial position from data attributes or current position
    const initialX = parseFloat(element.dataset.initialPositionX || position.x.toString());
    const initialY = parseFloat(element.dataset.initialPositionY || position.y.toString());
    
    // Get drag start coordinates
    const dragStartX = parseFloat(element.dataset.dragStartX || '0');
    const dragStartY = parseFloat(element.dataset.dragStartY || '0');
    
    // Calculate new position based on mouse movement
    const newX = initialX + (e.clientX - dragStartX);
    const newY = initialY + (e.clientY - dragStartY);
    
    // Update position
    setPosition({
      x: newX,
      y: newY
    });
  };

  // Handle mouse down to set drag start position
  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return; // Only process left mouse button
    
    // Prevent default to stop text selection
    e.preventDefault();
    
    // Disable text selection during dragging
    disableTextSelection();
    
    // Store initial position before dragging starts
    element.dataset.initialPositionX = position.x.toString();
    element.dataset.initialPositionY = position.y.toString();
    
    // Store drag start position
    element.dataset.dragStartX = e.clientX.toString();
    element.dataset.dragStartY = e.clientY.toString();
    
    // Ensure dragging class is added
    element.classList.add('cursor-grabbing');
    element.classList.remove('cursor-grab');
  };

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    element.classList.remove('cursor-grabbing');
    element.classList.add('cursor-grab');
    
    // Re-enable text selection
    enableTextSelection();
    
    // Clear drag data - commented out to fix panning issues after first drag
    // We want to keep the last known values to ensure continuity
    // delete element.dataset.dragStartX;
    // delete element.dataset.dragStartY;
  };

  // Handle wheel for zooming
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    
    // Calculate zoom factor (slower when zooming out, faster when zooming in)
    const delta = -Math.sign(e.deltaY) * 0.1;
    
    // Limit scale to reasonable bounds
    const newScale = Math.max(0.2, Math.min(5, scale + delta));
    
    // Only update if scale changed
    if (newScale !== scale) {
      // Get mouse position relative to the element
      const rect = element.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Calculate new position to zoom toward mouse cursor
      const newPosition = {
        x: position.x - ((mouseX / scale - mouseX / newScale) * newScale),
        y: position.y - ((mouseY / scale - mouseY / newScale) * newScale)
      };
      
      setScale(newScale);
      setPosition(newPosition);
    }
  };

  // Add event listeners
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  element.addEventListener('wheel', handleWheel, { passive: false });
  element.addEventListener('mousedown', handleMouseDown);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    element.removeEventListener('wheel', handleWheel);
    element.removeEventListener('mousedown', handleMouseDown);
    enableTextSelection(); // Ensure text selection is enabled when component unmounts
  };
}

/**
 * Calculates the scale needed to fit a diagram within a container
 */
export function calculateFitToViewScale(
  containerWidth: number,
  containerHeight: number,
  diagramWidth: number,
  diagramHeight: number
): number {
  if (diagramWidth <= 0 || diagramHeight <= 0) {
    return 1;
  }
  
  const scaleX = containerWidth / diagramWidth;
  const scaleY = containerHeight / diagramHeight;
  
  // Use the smaller scale to ensure the entire diagram fits
  // Also cap at 1.0 to avoid scaling up small diagrams
  return Math.min(scaleX, scaleY, 1) * 0.95; // 95% to add just a slight margin
}

/**
 * Calculates the position to center a diagram in its container
 */
export function calculateCenterPosition(
  containerWidth: number,
  containerHeight: number,
  diagramWidth: number,
  diagramHeight: number,
  scale: number
): { x: number; y: number } {
  // Ensure we're working with valid numbers
  const safeScale = isNaN(scale) ? 1 : scale;
  const safeDiagramWidth = isNaN(diagramWidth) || diagramWidth <= 0 ? containerWidth : diagramWidth;
  const safeDiagramHeight = isNaN(diagramHeight) || diagramHeight <= 0 ? containerHeight : diagramHeight;
  
  return {
    x: Math.round((containerWidth - safeDiagramWidth * safeScale) / 2),
    y: Math.round((containerHeight - safeDiagramHeight * safeScale) / 2)
  };
} 