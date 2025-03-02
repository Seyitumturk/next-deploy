import { ChatMessageData } from '../chatMessage';
import mermaid from 'mermaid';

// Add global mermaid declaration for TypeScript
declare global {
  interface Window {
    mermaid: typeof mermaid;
  }
}

/**
 * Types for the diagram editor module
 */

// Mermaid theme options
export type MermaidTheme = 'default' | 'forest' | 'dark' | 'neutral' | 'base';

// Diagram version interface
export interface DiagramVersion {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// Position interface for diagram panning
export interface Position {
  x: number;
  y: number;
}

// Diagram editor state interface
export interface DiagramEditorState {
  content: string;
  theme: MermaidTheme;
  scale: number;
  position: Position;
  isDragging: boolean;
  renderError: string | null;
  isDownloading: string | null; // 'svg', 'png', or null
  versions: DiagramVersion[];
  currentVersionId: string | null;
}

export interface EditorProps {
  projectId: string;
  projectTitle: string;
  diagramType: string;
  initialDiagram?: string;
  user: {
    credits: number;
    initials: string;
  };
  history: {
    _id: string;
    prompt?: string;
    diagram: string;
    diagram_img?: string;
    updateType: 'chat' | 'code' | 'reversion';
    updatedAt: string;
  }[];
}

export interface DiagramVersionData {
  _id: string;
  prompt?: string;
  diagram: string;
  diagram_img?: string;
  updateType: 'chat' | 'code' | 'reversion';
  updatedAt: string;
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
  content?: string;
  extractedText?: string;
  error?: string;
}

export interface ProcessImageResponse {
  success: boolean;
  text?: string;
  error?: string;
} 