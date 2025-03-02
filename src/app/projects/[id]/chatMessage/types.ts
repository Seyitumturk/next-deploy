/**
 * Types for the chat message system
 */

export interface ChatMessageData {
  role: 'user' | 'assistant' | 'system' | 'document';
  content: string;
  timestamp: Date | number;
  messageId?: string;
  diagramVersion?: string;
  diagram_img?: string;
  error?: string;
  isTyping?: boolean;
  reactions?: string[];
  documentSource?: string;
}

export interface ChatMessageProps {
  message: ChatMessageData;
  onDiagramVersionSelect: (version: string) => Promise<void>;
  onRetry: () => void;
  isDarkMode?: boolean;
  isFirstUserMessage?: boolean;
  onReaction?: (messageIndex: number, reaction: string) => void;
  messageIndex?: number;
  onCollapseMessage?: () => void;
} 