'use client';

import React, { useEffect, useRef, useState } from 'react';

// Add styles to prevent text selection in the SVG
const noSelectStyles = `
  .svg-content-wrapper svg {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }
  
  .svg-content-wrapper text {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    pointer-events: none;
  }
`;

interface DiagramRendererProps {
  svgOutput: string;
  versionId: string;
}

export const DiagramRenderer: React.FC<DiagramRendererProps> = ({ 
  svgOutput, 
  versionId 
}) => {
  const renderContainerRef = useRef<HTMLDivElement>(null);
  // Generate stable unique ID with a deterministic prefix based on versionId
  const stablePrefix = `svg-content-${versionId || 'default'}`;
  
  // Use this stable ID for both server-side rendering and initial client render to prevent hydration mismatch
  const [uniqueId, setUniqueId] = useState<string>(stablePrefix);
  
  // Track hydration state to prevent client/server mismatches
  const [isHydrated, setIsHydrated] = useState(false);
  // Track if content has been rendered
  const [contentRendered, setContentRendered] = useState(false);
  
  // Update uniqueId on client-side only after hydration to ensure it's truly unique
  useEffect(() => {
    // Mark component as hydrated
    setIsHydrated(true);
    
    // Generate a truly unique ID only on client-side
    const randomSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    setUniqueId(`${stablePrefix}-${randomSuffix}`);
  }, [stablePrefix]);
  
  // Set content rendered flag after SVG is inserted into DOM
  useEffect(() => {
    if (svgOutput && svgOutput.trim() !== '') {
      // Short delay to ensure DOM is updated
      const timer = setTimeout(() => {
        setContentRendered(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [svgOutput]);
  
  // Clean up SVG content on unmount
  useEffect(() => {
    console.log(`SVG Renderer mounted for version: ${versionId || 'unknown'}`);
    
    return () => {
      console.log(`SVG Renderer unmounted for version: ${versionId || 'unknown'}`);
    };
  }, [versionId]);
  
  // Disable text selection in SVG after it's rendered
  useEffect(() => {
    if (!renderContainerRef.current || !contentRendered) return;
    
    const svgElement = renderContainerRef.current.querySelector('svg');
    if (!svgElement) return;
    
    // Apply non-selectable attributes to all text elements
    const textElements = svgElement.querySelectorAll('text');
    textElements.forEach(text => {
      text.style.userSelect = 'none';
      text.style.webkitUserSelect = 'none';
      text.style.pointerEvents = 'none';
    });
    
  }, [contentRendered, svgOutput]);
  
  // Safe DOM manipulations after render - with enhanced null checks
  useEffect(() => {
    // Only run this effect after hydration, when we have SVG content, and when the container is available
    if (!isHydrated || !svgOutput || !renderContainerRef.current || !contentRendered) {
      return;
    }
    
    // Use a longer timeout to ensure the DOM is fully ready and hydrated
    const timer = setTimeout(() => {
      try {
        // Get the container safely
        const container = renderContainerRef.current;
        
        // Extra safety check before proceeding
        if (!container) {
          console.warn('Container ref is null despite previous check');
          return;
        }
        
        // Check if firstChild exists before accessing it
        if (container.childNodes && container.childNodes.length > 0) {
          const firstChild = container.firstChild;
          console.log('SVG container has content:', !!firstChild);
          
          // Only proceed with operations if firstChild exists
          if (firstChild) {
            // Additional DOM operations would go here
          } else {
            console.warn('firstChild is null despite container having childNodes');
          }
        } else {
          console.warn('SVG container has no childNodes for version:', versionId);
        }
      } catch (err) {
        console.error('Error manipulating SVG content:', err);
      }
    }, 150); // Increased timeout for better reliability
    
    return () => clearTimeout(timer);
  }, [svgOutput, uniqueId, isHydrated, versionId, contentRendered]);
  
  // Don't render empty content - return an empty container without any error text
  if (!svgOutput || svgOutput.trim() === '') {
    return (
      <div 
        className="empty-svg-placeholder" 
        data-version-id={versionId || 'empty'} 
        data-hydrated={isHydrated ? 'true' : 'false'}
      />
    );
  }
  
  // Quick validation that we have SVG content - silently handle invalid content
  if (!svgOutput.includes('<svg') || !svgOutput.includes('</svg>')) {
    return (
      <div 
        ref={renderContainerRef}
        id={uniqueId} 
        className="svg-content-wrapper"
        key={uniqueId}
        data-version-id={versionId || 'unknown'}
        data-hydrated={isHydrated ? 'true' : 'false'}
      />
    );
  }
  
  // Display valid SVG content
  return (
    <>
      <style jsx global>{noSelectStyles}</style>
      <div 
        ref={renderContainerRef}
        id={uniqueId} 
        className="svg-content-wrapper"
        key={uniqueId}
        data-version-id={versionId || 'unknown'}
        data-hydrated={isHydrated ? 'true' : 'false'}
        dangerouslySetInnerHTML={{ __html: svgOutput }} 
      />
    </>
  );
}; 