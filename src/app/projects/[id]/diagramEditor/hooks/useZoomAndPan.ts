import { useState, useCallback, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

const useZoomAndPan = () => {
  // State for zoom and pan
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [lastPosition, setLastPosition] = useState<Position>({ x: 0, y: 0 });

  // Track last position whenever position changes
  useEffect(() => {
    setLastPosition(position);
  }, [position]);

  // Handle mouse down for starting drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only enable dragging with left mouse button
    if (e.button !== 0) return;
    
    e.preventDefault();
    setIsDragging(true);
    
    // Use current mouse position relative to the current position
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [position]);

  // Function to handle mouse move for panning
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    // Calculate new position based on current mouse position and drag start point
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Apply smooth transition by limiting the change per frame if needed
    setPosition({
      x: newX,
      y: newY
    });
  }, [isDragging, dragStart]);

  // Function to handle mouse up to stop dragging
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      
      // Remove text selection prevention class
      document.body.classList.remove('diagram-dragging');
      
      // Store the last position to ensure continuity on next drag
      setLastPosition(position);
    }
  }, [isDragging, position]);

  // Function to handle zoom with wheel
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    // Calculate zoom factor - more precise control
    // Use smaller steps for smoother zooming
    const delta = -Math.sign(e.deltaY) * 0.05;
    
    // Limit scale to reasonable bounds
    const newScale = Math.max(0.2, Math.min(5, scale + delta));
    
    // Only update if scale changed
    if (newScale !== scale) {
      // Get the position where zooming is happening (mouse position)
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Calculate new position to zoom toward mouse cursor
      // This makes the zoom feel more natural - the point under the cursor stays fixed
      const newPosition = {
        x: position.x - ((mouseX / scale - mouseX / newScale) * newScale),
        y: position.y - ((mouseY / scale - mouseY / newScale) * newScale)
      };
      
      setScale(newScale);
      setPosition(newPosition);
    }
  }, [scale, position]);

  // Setup and cleanup event handlers
  const setupEventHandlers = useCallback((elementRef: HTMLElement | null) => {
    if (!elementRef) return;
    
    // Add event listeners
    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp);
    elementRef.addEventListener('wheel', handleWheel, { passive: false });
    
    // Return cleanup function
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      elementRef.removeEventListener('wheel', handleWheel);
      
      // Ensure text selection is re-enabled when component unmounts
      document.body.classList.remove('diagram-dragging');
    };
  }, [handleMouseMove, handleMouseUp, handleWheel]);

  // Reset zoom and position
  const resetView = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setLastPosition({ x: 0, y: 0 });
  }, []);

  // Fit diagram to container
  const fitToContainer = useCallback((containerWidth: number, containerHeight: number, diagramWidth: number, diagramHeight: number) => {
    if (diagramWidth <= 0 || diagramHeight <= 0) return;
    
    // Calculate scale to fit
    const scaleX = containerWidth / diagramWidth;
    const scaleY = containerHeight / diagramHeight;
    const newScale = Math.min(scaleX, scaleY, 1) * 0.95; // 95% to add a small margin
    
    // Center the diagram
    const newX = (containerWidth - diagramWidth * newScale) / 2;
    const newY = (containerHeight - diagramHeight * newScale) / 2;
    
    setScale(newScale);
    setPosition({ x: newX, y: newY });
    setLastPosition({ x: newX, y: newY });
  }, []);

  return {
    scale,
    setScale,
    position,
    setPosition,
    isDragging,
    setIsDragging,
    dragStart,
    setDragStart,
    handleMouseDown,
    setupEventHandlers,
    resetView,
    fitToContainer,
    lastPosition
  };
};

export default useZoomAndPan; 