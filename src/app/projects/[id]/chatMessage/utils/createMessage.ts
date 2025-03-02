/**
 * Utility functions for creating different types of chat messages
 */

import { ChatMessageData } from '../types';

/**
 * Helper to generate a unique message ID
 */
const generateMessageId = (prefix: string = 'msg'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Creates an empty message with default values
 */
export const createEmpty = (): ChatMessageData => ({
  role: 'system',
  content: '',
  timestamp: Date.now(),
  messageId: generateMessageId()
});

/**
 * Creates a user message with the given content
 */
export const createUserMessage = (content: string, diagramVersion?: string): ChatMessageData => ({
  role: 'user',
  content,
  timestamp: Date.now(),
  messageId: generateMessageId('msg_user'),
  diagramVersion
});

/**
 * Creates an assistant message with the given content
 */
export const createAssistantMessage = (content: string, isTyping: boolean = false): ChatMessageData => ({
  role: 'assistant',
  content,
  timestamp: Date.now(),
  messageId: generateMessageId('msg_assistant'),
  isTyping,
  reactions: []
});

/**
 * Creates a system message with the given content
 */
export const createSystemMessage = (content: string): ChatMessageData => ({
  role: 'system',
  content,
  timestamp: Date.now(),
  messageId: generateMessageId('msg_system')
});

/**
 * Creates a document message with the given content and source
 */
export const createDocumentMessage = (content: string, documentSource?: string): ChatMessageData => ({
  role: 'document',
  content,
  timestamp: Date.now(),
  messageId: generateMessageId('msg_doc'),
  documentSource
});

// Exported as an object for backwards compatibility
export const ChatMessage = {
  createEmpty,
  createUserMessage,
  createAssistantMessage,
  createSystemMessage,
  createDocumentMessage
};

export default ChatMessage; 