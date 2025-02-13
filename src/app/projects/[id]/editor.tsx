'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import mermaid from 'mermaid';

interface EditorProps {
  projectId: string;
  diagramType: string;
  initialDiagram?: string;
}

export default function DiagramEditor({ projectId, diagramType, initialDiagram }: EditorProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showPromptPanel, setShowPromptPanel] = useState(true);
  const [svgOutput, setSvgOutput] = useState<string>('');
  const [scale, setScale] = useState(1);
  const [currentDiagram, setCurrentDiagram] = useState(initialDiagram || '');
  const [streamBuffer, setStreamBuffer] = useState('');
  const svgRef = useRef<HTMLDivElement>(null);
  const bufferTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (initialDiagram) {
      setCurrentDiagram(initialDiagram);
      renderDiagram(initialDiagram);
    }
  }, [initialDiagram]);

  // Enhanced rendering with error handling and retries
  const renderDiagram = async (diagramText: string): Promise<boolean> => {
    const maxRetries = 3;
    let currentTry = 0;

    while (currentTry < maxRetries) {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'loose',
          fontFamily: 'var(--font-geist-sans)',
        });
        
        const { svg } = await mermaid.render('diagram-' + Date.now(), diagramText);
        setSvgOutput(svg);
        return true;
      } catch (err) {
        console.error(`Failed to render diagram (attempt ${currentTry + 1}/${maxRetries}):`, err);
        currentTry++;
        if (currentTry < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    return false;
  };

  // Buffered update function for smoother streaming
  const updateDiagramWithBuffer = (newContent: string) => {
    setStreamBuffer(newContent);
    
    // Clear existing timeout
    if (bufferTimeoutRef.current) {
      clearTimeout(bufferTimeoutRef.current);
    }

    // Set new timeout for rendering
    bufferTimeoutRef.current = setTimeout(async () => {
      setCurrentDiagram(newContent);
      await renderDiagram(newContent);
    }, 100); // Adjust buffer time as needed
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1);
  };

  const downloadSVG = () => {
    if (!svgOutput) return;
    const blob = new Blob([svgOutput], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagram-${projectId}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPNG = async (transparent: boolean = false) => {
    if (!svgOutput || !svgRef.current) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgOutput], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      if (!transparent) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `diagram-${projectId}${transparent ? '-transparent' : ''}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  async function handleGenerateDiagram(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError('');
    let accumulatedDiagram = '';

    try {
      const response = await fetch('/api/diagrams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          diagramType,
          textPrompt: prompt,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate diagram');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the stream chunk and split into SSE messages
        const chunk = decoder.decode(value);
        const messages = chunk
          .split('\n\n')
          .filter(msg => msg.trim().startsWith('data: '))
          .map(msg => JSON.parse(msg.replace('data: ', '')));

        // Process each message
        for (const message of messages) {
          if (message.mermaidSyntax) {
            accumulatedDiagram = message.mermaidSyntax;
            updateDiagramWithBuffer(accumulatedDiagram);
            
            if (message.isComplete) {
              // Final update
              setCurrentDiagram(accumulatedDiagram);
              await renderDiagram(accumulatedDiagram);
              setPrompt('');
              
              // Update the UI immediately without refresh
              router.refresh();
              break;
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsGenerating(false);
      // Clear any pending buffer updates
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }
    }
  }

  return (
    <div className="relative h-[calc(100vh-3rem)] flex bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Left Sidebar - Chat Panel */}
      <div 
        className={`h-full glass-panel transition-all duration-300 ease-in-out ${
          showPromptPanel ? 'w-96' : 'w-0'
        }`}
      >
        <div className="h-full flex flex-col overflow-hidden">
          {showPromptPanel && (
            <div className="flex-1 flex flex-col p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary to-accent-2 flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12zm-1-5a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold bg-gradient-to-r from-secondary to-accent-2 text-transparent bg-clip-text">AI Assistant</h2>
                </div>
                <button
                  onClick={() => setShowPromptPanel(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl mb-4 border border-red-100 dark:border-red-800">
                  {error}
                </div>
              )}

              <form onSubmit={handleGenerateDiagram} className="flex-1 flex flex-col">
                <div className="flex-1 glass-panel rounded-xl p-1">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full h-full px-4 py-3 rounded-lg bg-transparent focus:ring-2 focus:ring-secondary/50 focus:border-transparent resize-none"
                    placeholder={`Describe how you'd like to modify your ${diagramType} diagram...`}
                    disabled={isGenerating}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isGenerating || !prompt.trim()}
                  className="mt-4 w-full h-12 rounded-xl disabled:opacity-50 flex items-center justify-center bg-gradient-to-r from-secondary via-accent-2 to-secondary hover:opacity-90 transition-opacity text-white font-medium"
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    'Generate Diagram'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Control Bar */}
        <div className="h-12 glass-panel border-b backdrop-blur-xl px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {!showPromptPanel && (
              <button
                onClick={() => setShowPromptPanel(true)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Show AI Assistant"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            <div className="h-6 border-r border-gray-200 dark:border-gray-700 mx-2" />
            <div className="flex items-center space-x-1 bg-white/10 dark:bg-gray-800/50 rounded-lg p-1">
              <button onClick={handleZoomIn} className="p-1.5 hover:bg-white/10 rounded-md transition-colors" title="Zoom In">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
              <button onClick={handleZoomOut} className="p-1.5 hover:bg-white/10 rounded-md transition-colors" title="Zoom Out">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
              <button onClick={handleResetZoom} className="p-1.5 hover:bg-white/10 rounded-md transition-colors" title="Reset View">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* Download Options */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-white/10 dark:bg-gray-800/50 rounded-lg p-1">
              <button
                onClick={downloadSVG}
                className="px-3 py-1.5 text-sm hover:bg-white/10 rounded-md transition-colors flex items-center space-x-1"
                title="Download SVG"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>SVG</span>
              </button>
              <button
                onClick={() => downloadPNG(false)}
                className="px-3 py-1.5 text-sm hover:bg-white/10 rounded-md transition-colors flex items-center space-x-1"
                title="Download PNG"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>PNG</span>
              </button>
              <button
                onClick={() => downloadPNG(true)}
                className="px-3 py-1.5 text-sm hover:bg-white/10 rounded-md transition-colors flex items-center space-x-1"
                title="Download Transparent PNG"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>Transparent</span>
              </button>
            </div>
          </div>
        </div>

        {/* Diagram Area - Updated with loading state */}
        <div className="flex-1 overflow-auto">
          <div className="w-full h-full flex items-center justify-center p-8">
            {isGenerating && !svgOutput && (
              <div className="absolute inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg flex items-center space-x-3">
                  <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generating diagram...</span>
                </div>
              </div>
            )}
            {svgOutput ? (
              <div 
                ref={svgRef}
                dangerouslySetInnerHTML={{ __html: svgOutput }} 
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease-in-out',
                }}
                className="w-full h-full flex items-center justify-center"
              />
            ) : (
              <div className="text-gray-400 flex flex-col items-center glass-panel rounded-2xl p-8">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-secondary to-accent-2 flex items-center justify-center text-white mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-600 dark:text-gray-300">No diagram yet</p>
                <p className="text-sm text-gray-400">Use the AI Assistant to generate one</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 