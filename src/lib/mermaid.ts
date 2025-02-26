import mermaid from 'mermaid';

// Initialize mermaid with improved configuration for streaming
mermaid.initialize({
  startOnLoad: false, // Don't auto-render on load
  theme: 'default',
  securityLevel: 'loose',
  flowchart: { useMaxWidth: true, htmlLabels: true },
  sequence: { useMaxWidth: true },
  gantt: { useMaxWidth: true },
  er: { useMaxWidth: true },
  pie: { useMaxWidth: true },
  architecture: { useMaxWidth: true },
  logLevel: 'error', // Reduce log noise during streaming
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  
  // Add better error handling for streaming context
  deterministicIds: false, // This prevents duplicate IDs issues
  deterministicIDSeed: null, // Let Mermaid generate truly unique IDs
  
  // Suppress error blocks from being added to the DOM
  suppressErrorsInDOM: true,
  errorLabelColor: 'transparent',
});

// Function to remove Mermaid error elements from the DOM
const removeMermaidErrorElements = () => {
  if (typeof document === 'undefined') return;
  
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
  
  // Remove all error elements
  errorSelectors.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(el => {
        el.remove();
      });
    } catch (e) {
      console.error('Error removing selector', selector, e);
    }
  });
  
  // Also remove by ID pattern
  try {
    document.querySelectorAll('[id]').forEach(el => {
      if (
        el.id.includes('mermaid-error') || 
        el.id.includes('syntax-error') || 
        el.id.includes('flowchart-error')
      ) {
        el.remove();
      }
    });
  } catch (e) {
    console.error('Error removing by ID', e);
  }
  
  // Also remove by aria-roledescription
  try {
    document.querySelectorAll('[aria-roledescription]').forEach(el => {
      if (
        el.getAttribute('aria-roledescription') === 'error' || 
        el.getAttribute('aria-roledescription') === 'syntax-error'
      ) {
        el.remove();
      }
    });
  } catch (e) {
    console.error('Error removing by aria-roledescription', e);
  }
};

// Create a custom render function that handles errors better
const safeRender = async (id: string, code: string) => {
  try {
    // First try to render
    const result = await mermaid.render(id, code);
    
    // Clean up any error elements after rendering
    setTimeout(removeMermaidErrorElements, 0);
    setTimeout(removeMermaidErrorElements, 100);
    
    return result;
  } catch (error) {
    console.error('Mermaid rendering error:', error);
    
    // Clean up any error elements if rendering fails
    setTimeout(removeMermaidErrorElements, 0);
    setTimeout(removeMermaidErrorElements, 100);
    
    // Return a minimal SVG to prevent UI breakage
    return {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 50">
        <rect width="100%" height="100%" fill="transparent" />
      </svg>`
    };
  }
};

// Set up a MutationObserver to watch for and remove error elements
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Run once on load to clean up any existing error elements
  window.addEventListener('DOMContentLoaded', () => {
    removeMermaidErrorElements();
  });

  // Create a MutationObserver to watch for new error elements
  const observer = new MutationObserver(() => {
    removeMermaidErrorElements();
  });

  // Start observing the document with the configured parameters
  if (document.body) {
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id', 'aria-roledescription']
    });
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'id', 'aria-roledescription']
      });
    });
  }
  
  // Run frequently to catch any new error elements
  setInterval(removeMermaidErrorElements, 100);
  
  // Override the mermaid.render method to use our safe render
  mermaid.render = safeRender;
}

// Register architecture diagram type if needed
try {
  console.log("Mermaid version:", mermaid.version());
  console.log("Supported diagram types:", mermaid.diagrams);
} catch (error) {
  console.error("Error checking mermaid configuration:", error);
}

export default mermaid; 