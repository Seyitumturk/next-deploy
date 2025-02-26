import { useEffect, RefObject } from 'react';

/**
 * Custom hook to clean up Mermaid error elements from the DOM
 * This helps prevent hydration errors and keeps the UI clean
 */
export function useMermaidCleanup(containerRef: RefObject<HTMLElement>) {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Function to remove error elements
    const cleanupErrorElements = () => {
      if (!containerRef.current) return;
      
      // Find and remove error elements
      const errorElements = containerRef.current.querySelectorAll('.error-icon, .error-text, .error-message');
      errorElements.forEach(el => {
        try {
          el.parentNode?.removeChild(el);
        } catch (err) {
          // Ignore errors if element was already removed
        }
      });
    };
    
    // Run cleanup initially and set up an observer
    cleanupErrorElements();
    
    // Use MutationObserver to detect when new error elements are added
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any added nodes are error elements
          mutation.addedNodes.forEach(node => {
            if (node instanceof HTMLElement) {
              if (
                node.classList.contains('error-icon') ||
                node.classList.contains('error-text') ||
                node.classList.contains('error-message')
              ) {
                // Remove the error element
                try {
                  node.parentNode?.removeChild(node);
                } catch (err) {
                  // Ignore errors if element was already removed
                }
              }
            }
          });
        }
      });
    });
    
    // Start observing the container
    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true });
    }
    
    // Clean up the observer when the component unmounts
    return () => {
      observer.disconnect();
    };
  }, [containerRef]);
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
          theme: theme,
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
        
        console.log('useMermaidInit: Mermaid initialized successfully');
      } catch (error) {
        console.error('Failed to initialize mermaid:', error);
      }
    };
    
    initMermaid();
  }, [theme]);
} 