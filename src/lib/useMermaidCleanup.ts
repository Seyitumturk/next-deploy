"use client";

import { useEffect, RefObject } from 'react';

/**
 * A custom hook that automatically cleans up Mermaid.js error elements
 * from the DOM. This is useful because Mermaid may render error elements
 * that are visually disruptive during streaming diagram updates.
 * 
 * @param diagramRef - A ref to the element containing the Mermaid diagram
 * @param options - Optional configuration
 * @returns void
 */
export function useMermaidCleanup(
  diagramRef: RefObject<HTMLElement>,
  options: {
    interval?: number;      // How often to check for errors (in ms)
    cleanDocument?: boolean; // Whether to clean the entire document or just the diagram
  } = {}
) {
  const { 
    interval = 500, 
    cleanDocument = true 
  } = options;

  useEffect(() => {
    // Function to clean up error elements
    const cleanupErrorElements = () => {
      // List of selectors that match Mermaid error elements
      const errorSelectors = [
        '.error-icon',
        '.error-text',
        '.error-message',
        '.marker.cross',
        'g[class*="error"]',
        'g[class*="flowchart-error"]',
        'g[class*="syntax-error"]',
        'g[class*="mermaid-error"]',
        '[id*="mermaid-error"]',
        '.mermaid > g.error',
        '.mermaid > svg > g.error',
        '.mermaid-error',
        '.diagramError',
        '.diagram-error',
        '.syntax-error',
        'svg[aria-roledescription="error"]',
        'svg[aria-roledescription="syntax-error"]'
      ];

      // Clean up error elements in the diagram container
      if (diagramRef.current) {
        errorSelectors.forEach(selector => {
          diagramRef.current?.querySelectorAll(selector).forEach(el => {
            el.remove();
          });
        });

        // Also remove by ID pattern
        diagramRef.current.querySelectorAll('[id]').forEach(el => {
          if (
            el.id.includes('mermaid-error') || 
            el.id.includes('syntax-error') || 
            el.id.includes('flowchart-error')
          ) {
            el.remove();
          }
        });

        // Also remove by aria-roledescription
        diagramRef.current.querySelectorAll('[aria-roledescription]').forEach(el => {
          if (
            el.getAttribute('aria-roledescription') === 'error' || 
            el.getAttribute('aria-roledescription') === 'syntax-error'
          ) {
            el.remove();
          }
        });
      }

      // If enabled, also clean up error elements in the entire document
      if (cleanDocument) {
        errorSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            el.remove();
          });
        });

        // Look for orphaned error elements by ID
        document.querySelectorAll('[id]').forEach(el => {
          if (
            el.id.includes('mermaid-error') || 
            el.id.includes('syntax-error') || 
            el.id.includes('flowchart-error')
          ) {
            el.remove();
          }
        });
      }
    };

    // Run cleanup immediately
    cleanupErrorElements();

    // Set up interval to continuously clean up error elements during renders
    const intervalId = setInterval(cleanupErrorElements, interval);

    // Clean up the interval when the component unmounts
    return () => {
      clearInterval(intervalId);
    };
  }, [diagramRef, interval, cleanDocument]);
}

/**
 * Custom hook to safely initialize Mermaid on the client side
 */
export function useMermaidInit(theme: string = 'default') {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    console.log('useMermaidInit: Initializing mermaid with theme:', theme);
    
    // Dynamically import mermaid to ensure it only runs on the client
    const initMermaid = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        
        // Force reset mermaid to clear any cached configurations
        if (typeof mermaid.reset === 'function') {
          console.log('useMermaidInit: Resetting mermaid');
          mermaid.reset();
        }
        
        console.log('useMermaidInit: Configuring mermaid');
        mermaid.initialize({
          startOnLoad: false,
          theme: theme as any, // Type cast to avoid type error
          securityLevel: 'loose',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          themeVariables: {
            primaryColor: '#4f46e5',
            primaryTextColor: '#ffffff',
            primaryBorderColor: '#6366f1',
            lineColor: '#64748b',
            secondaryColor: '#f1f5f9',
            tertiaryColor: '#f8fafc',
          },
          flowchart: {
            htmlLabels: true,
            curve: 'basis',
          },
          er: {
            useMaxWidth: false,
          },
          sequence: {
            useMaxWidth: false,
            showSequenceNumbers: false,
          },
          gantt: {
            useMaxWidth: false,
          },
          // @ts-ignore - These properties exist in newer versions of Mermaid
          suppressErrorsInDOM: true,
          errorLabelColor: 'transparent',
        });
        
        // Add custom CSS for mindmap styling
        if (typeof document !== 'undefined') {
          // Remove existing style if it exists
          const existingStyle = document.getElementById('mermaid-mindmap-style');
          if (existingStyle) {
            existingStyle.remove();
          }
          
          // Create new style element
          const style = document.createElement('style');
          style.id = 'mermaid-mindmap-style';
          style.textContent = `
            /* Make root nodes always cloud shape */
            .mindmap-node.section-root rect.node-rect,
            .mindmap-node.section--1 rect.node-rect,
            .mindmap-node.section-root .node-bkg,
            .mindmap-node.section--1 .node-bkg {
              rx: 50px !important;
              ry: 25px !important;
              shape-rendering: auto !important;
              d: path('M0,15 Q0,0 15,0 L85,0 Q100,0 100,15 Q115,15 115,30 L115,70 Q115,85 100,85 L15,85 Q0,85 0,70 Q-15,70 -15,55 L-15,30 Q-15,15 0,15 Z') !important;
              fill-rule: evenodd !important;
            }
            
            /* Make all other nodes fully rounded (not circle) */
            .mindmap-node:not(.section-root):not(.section--1) rect.node-rect,
            .mindmap-node:not(.section-root):not(.section--1) .node-bkg {
              rx: 15px !important;
              ry: 15px !important;
              shape-rendering: auto !important;
            }
          `;
          document.head.appendChild(style);
        }
        
        console.log('useMermaidInit: Mermaid initialized successfully');
      } catch (error) {
        console.error('Failed to initialize mermaid:', error);
      }
    };
    
    initMermaid();
  }, [theme]);
} 