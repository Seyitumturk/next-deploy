export interface ChatMessageProps {
  message: ChatMessageData;
  onDiagramVersionSelect: (version: string) => Promise<void>;
  onRetry: () => void;
  isDarkMode?: boolean;
  isFirstUserMessage?: boolean;
  messageIndex?: number;
  onCollapseMessage?: () => void;
} 