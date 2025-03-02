import { useState, useCallback, useEffect } from 'react';
import { DiagramVersionData } from '../types';

interface UseHistoryProps {
  initialDiagram?: string;
  initialHistory?: DiagramVersionData[];
}

/**
 * Hook for managing diagram version history
 */
export function useHistory({ initialDiagram, initialHistory = [] }: UseHistoryProps) {
  // Track the current diagram content
  const [currentDiagram, setCurrentDiagram] = useState<string | undefined>(initialDiagram || '');
  
  // Track the history of diagram versions
  const [diagramHistory, setDiagramHistory] = useState<DiagramVersionData[]>(initialHistory);
  
  // Initialize with initial history if provided
  useEffect(() => {
    if (initialHistory && initialHistory.length > 0 && diagramHistory.length === 0) {
      setDiagramHistory(initialHistory);
      
      // Set current diagram to the latest version from history if not already set
      if (!currentDiagram && initialHistory[0]?.diagram) {
        setCurrentDiagram(initialHistory[0].diagram);
      }
    }
  }, [initialHistory, currentDiagram, diagramHistory.length]);
  
  /**
   * Update the diagram history with a new version
   */
  const updateHistory = useCallback((newData: {
    diagram: string;
    prompt?: string;
    diagram_img?: string;
    updateType: 'chat' | 'code' | 'reversion';
  }) => {
    const newVersion: DiagramVersionData = {
      _id: Date.now().toString(), // Generate a temporary ID
      ...newData,
      updatedAt: new Date().toISOString()
    };
    
    // Add the new version to the beginning of the history array
    setDiagramHistory(prev => [newVersion, ...prev]);
    
    // Update the current diagram
    setCurrentDiagram(newData.diagram);
    
    return newVersion;
  }, []);
  
  return {
    currentDiagram,
    setCurrentDiagram,
    diagramHistory,
    setDiagramHistory,
    updateHistory
  };
}

// Default export for backward compatibility
export default useHistory; 