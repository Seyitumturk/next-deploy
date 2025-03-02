/**
 * Chat Message System
 * 
 * This module provides a complete system for displaying and interacting with chat messages
 * in the diagram editor application. It includes:
 * 
 * - Components for rendering messages and their various states
 * - Types for type safety
 * - Utility functions for creating and formatting messages
 */

// Export the main component
export { ChatMessage } from './ChatMessage';

// Export component subparts for granular usage
export { MessageContent } from './components/MessageContent';
export { MessageActions } from './components/MessageActions';
export { TypingIndicator } from './components/TypingIndicator';

// Export types for external use
export type { ChatMessageData, ChatMessageProps } from './types';

// Export utilities
export { formatTime, formatDate, formatDateTime, getRelativeTimeString } from './utils/formatUtils';
export { default as ChatMessageUtils, createEmpty, createUserMessage, createAssistantMessage, createSystemMessage, createDocumentMessage } from './utils/createMessage'; 