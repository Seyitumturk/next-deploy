import React, { useState, useEffect } from 'react';
import DiagramRenderer from './DiagramRenderer';
import { FallbackDiagramVisualizer } from './FallbackDiagramVisualizer';
import { validateMermaidCode } from '@/lib/mermaidUtils';

const DiagramTester: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [diagramType, setDiagramType] = useState<string>('flowchart');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [fallbackSvg, setFallbackSvg] = useState<string>('');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string | null }>({
    valid: true,
    message: null
  });
  const [renderedSvg, setRenderedSvg] = useState<string>('');

  // Available diagram types
  const diagramTypes = [
    'flowchart',
    'sequenceDiagram',
    'classDiagram',
    'stateDiagram',
    'entityRelationshipDiagram',
    'userJourney',
    'gantt',
    'pie',
    'mindmap'
  ];

  // Add this function to the component to handle flowchart templates
  const getTemplateForType = (type: string): string => {
    switch (type) {
      case 'flowchart':
        return `flowchart TD
    Start --> Process
    Process --> Decision{Yes or No?}
    Decision -->|Yes| Accept
    Decision -->|No| Reject
    Accept --> End
    Reject --> End
    
    classDef green fill:#d1e7dd,stroke:#0d6832,color:#0d6832
    classDef red fill:#f8d7da,stroke:#842029,color:#842029
    class Accept green
    class Reject red`;
      
      case 'sequence':
        return `sequenceDiagram
    participant User
    participant System
    participant Database
    
    User->>System: Request data
    System->>Database: Query data
    Database-->>System: Return results
    System-->>User: Display results`;
      
      case 'class':
        return `classDiagram
    class User {
      +String username
      +String email
      +login()
      +logout()
    }
    
    class Admin {
      +manageUsers()
    }
    
    User <|-- Admin`;
      
      default:
        return `${type}\n  A simple ${type} diagram example`;
    }
  };

  // Update the fallback SVG when needed
  useEffect(() => {
    if (isProcessing) {
      // Display processing state
      const processingFallback = FallbackDiagramVisualizer({
        type: 'processing',
        diagramType,
        message: 'Processing your diagram...',
        progress: 25
      });
      setFallbackSvg(processingFallback);
    } else if (!input.trim()) {
      // Display empty state
      const emptyFallback = FallbackDiagramVisualizer({
        type: 'loading',
        diagramType,
        message: 'Enter diagram code to begin',
      });
      setFallbackSvg(emptyFallback);
    }
  }, [isProcessing, input, diagramType]);

  // Enhance the useEffect that handles validation - around line 80-100
  useEffect(() => {
    // Handle fallback display based on processing state
    if (isProcessing) {
      setFallbackSvg(FallbackDiagramVisualizer({
        type: 'processing',
        diagramType,
        progress: Math.min(Math.floor(Math.random() * 30) + 50, 95)
      }));
      return;
    }

    // If input is empty, show a loading state
    if (!input.trim()) {
      setFallbackSvg(FallbackDiagramVisualizer({
        type: 'loading',
        diagramType,
      }));
      setValidationResult({ valid: false, message: null });
      return;
    }

    // Validate input
    validateMermaidCode(input).then(result => {
      if (result.valid) {
        setValidationResult({ valid: true, message: null });
        setIsProcessing(false);
      } else {
        setValidationResult({
          valid: false,
          message: result.message || 'Invalid diagram syntax'
        });
        setIsProcessing(false);
        
        // Create a syntax error visualization
        setFallbackSvg(FallbackDiagramVisualizer({
          type: 'syntax_error',
          diagramType,
          message: result.message || 'Syntax error in diagram',
          errorDetails: result.message
        }));
      }
    });
  }, [input, isProcessing, diagramType]);

  const handleDiagramTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDiagramType(e.target.value);
  };

  const handleSvgRendered = (svg: string) => {
    setRenderedSvg(svg);
  };

  const handleError = (error: string) => {
    console.log('Rendering error:', error);
    
    // Update fallback with error state
    const errorFallback = FallbackDiagramVisualizer({
      type: 'error',
      diagramType,
      message: error || 'Unknown error occurred',
    });
    
    setFallbackSvg(errorFallback);
  };

  return (
    <div className="diagram-tester bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            Diagram Tester
          </h2>
          <div className="flex space-x-2">
            <select
              value={diagramType}
              onChange={handleDiagramTypeChange}
              className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1 text-sm"
            >
              {diagramTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-md px-3 py-1 text-sm"
              onClick={() => setInput(getTemplateForType(diagramType))}
            >
              Use Template
            </button>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 flex flex-col">
            <div className="mb-2 flex justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Mermaid Syntax
              </label>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {input.length} chars | {input.split('\n').length} lines
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 min-h-[300px] p-3 text-sm font-mono bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-800 dark:text-gray-200"
              placeholder={`Enter ${diagramType} syntax here...`}
            />
            
            {validationResult?.message && (
              <div className="mt-2 text-sm text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
                <div className="font-medium">Error:</div>
                <div>{validationResult.message}</div>
              </div>
            )}
          </div>
          
          <div className="flex-1 flex flex-col">
            <label className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Diagram Preview
            </label>
            <div className="flex-1 border border-gray-300 dark:border-gray-700 rounded-md overflow-hidden bg-white dark:bg-gray-800">
              {validationResult?.valid && input.trim() ? (
                <DiagramRenderer
                  content={input}
                  fallbackSvg={validationResult?.valid ? undefined : fallbackSvg}
                  diagramType={diagramType}
                  suppressErrors={true}
                  onError={() => {
                    setFallbackSvg(FallbackDiagramVisualizer({
                      type: 'syntax_error',
                      diagramType: diagramType,
                      errorDetails: validationResult?.message || ''
                    }));
                  }}
                />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: fallbackSvg }} />
              )}
            </div>
          </div>
        </div>
        
        {/* Add instruction panel */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-sm rounded-md">
          <h3 className="font-medium mb-1">Tips:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Use the template button to get started with a basic diagram structure</li>
            <li>Check the error messages if your diagram doesn't render correctly</li>
            <li>For flowcharts, avoid using reserved words like "end" in class names</li>
            <li>Make sure your syntax matches the selected diagram type</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DiagramTester; 