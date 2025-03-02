'use client';

import { useState, useRef, useCallback, RefObject } from 'react';
import { MermaidTheme } from '../../diagramEditor/types';
import { calculateCenterPosition, calculateFitToViewScale } from '../utils/interactionUtils';
import { getSvgDimensions } from '../utils/svgUtils';

interface Position {
  x: number;
  y: number;
}

interface UseDiagramStateOptions {
  initialTheme?: MermaidTheme;
  initialScale?: number;
  initialPosition?: Position;
  onThemeChange?: (theme: MermaidTheme) => void;
}

interface UseDiagramStateReturn {
  theme: MermaidTheme;
  scale: number;
  position: Position;
  isDragging: boolean;
  renderError: string | null;
  changeTheme: (theme: MermaidTheme) => void;
  setScale: (scale: number) => void;
  setPosition: (position: Position) => void;
  setIsDragging: (isDragging: boolean) => void;
  setRenderError: (error: string | null) => void;
  resetView: (containerRef?: RefObject<HTMLDivElement>, svgRef?: RefObject<SVGSVGElement>) => void;
}

/**
 * Custom hook for managing diagram state
 */
export function useDiagramState(
  options: UseDiagramStateOptions = {}
): UseDiagramStateReturn {
  const {
    initialTheme = 'default',
    initialScale = 1,
    initialPosition = { x: 0, y: 0 },
    onThemeChange
  } = options;
  
  // State for diagram display
  const [theme, setTheme] = useState<MermaidTheme>(initialTheme);
  const [scale, setScale] = useState<number>(initialScale);
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  
  // Change theme with callback
  const changeTheme = useCallback((newTheme: MermaidTheme) => {
    setTheme(newTheme);
    if (onThemeChange) {
      onThemeChange(newTheme);
    }
  }, [onThemeChange]);
  
  /**
   * Reset the view to fit the diagram in the container
   */
  const resetView = useCallback((
    containerRef?: RefObject<HTMLDivElement>,
    svgRef?: RefObject<SVGSVGElement>
  ) => {
    if (!containerRef?.current || !svgRef?.current) {
      // If no refs provided, reset to default values
      setScale(1);
      setPosition({ x: 0, y: 0 });
      return;
    }
    
    // Get container and SVG dimensions
    const containerRect = containerRef.current.getBoundingClientRect();
    const svgDimensions = getSvgDimensions(svgRef.current);
    
    // Calculate scale to fit diagram in container
    const newScale = calculateFitToViewScale(
      svgDimensions.width,
      svgDimensions.height,
      containerRect.width,
      containerRect.height
    );
    
    // Calculate position to center diagram in container
    const newPosition = calculateCenterPosition(
      svgDimensions.width,
      svgDimensions.height,
      containerRect.width,
      containerRect.height,
      newScale
    );
    
    // Update state
    setScale(newScale);
    setPosition(newPosition);
  }, []);
  
  return {
    theme,
    scale,
    position,
    isDragging,
    renderError,
    changeTheme,
    setScale,
    setPosition,
    setIsDragging,
    setRenderError,
    resetView
  };
} 