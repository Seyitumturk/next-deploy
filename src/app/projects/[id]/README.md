# Project Structure

This project has been modularized to improve maintainability and separation of concerns. Here's an overview of the key components:

## Chat Message System

The chat message system has been modularized into the following structure:

### 1. Data Model (`chatMessage.ts`)
- Contains the `ChatMessageData` interface that defines the structure of chat messages
- Provides utility functions for creating different types of messages (user, assistant, system, document)
- Exports a default `ChatMessage` object with utility methods

### 2. UI Component (`components/ChatMessage.tsx`)
- Renders chat messages with different styles based on their role
- Handles user interactions like expanding/collapsing messages, reactions, etc.
- Uses the `ChatMessageData` interface from `chatMessage.ts`

### 3. Usage in `PromptPanel.tsx`
- Imports the `ChatMessage` component from `./components/ChatMessage`
- Imports the `ChatMessageData` interface from `./chatMessage`
- Passes the appropriate props to the `ChatMessage` component

## Alternative Structure (chatMessage directory)

There's also a more complex modular structure in the `chatMessage` directory that breaks down the component into smaller pieces:

- `chatMessage/ChatMessage.tsx`: Main component
- `chatMessage/components/`: Subcomponents
  - `TypingIndicator.tsx`
  - `MessageContent.tsx`
  - `MessageActions.tsx`
- `chatMessage/utils/`: Utility functions
  - `formatUtils.ts`
- `chatMessage/index.ts`: Exports all components and types

## Diagram Renderer

The `DiagramRenderer` component has been updated to handle null references properly:

- Added null checks for `firstChild` access
- Ensures the component doesn't render empty content
- Uses a stable ID generation approach to prevent hydration mismatches

## Next Steps

1. Consider consolidating the two different chat message implementations
2. Update any remaining imports that might be pointing to the wrong location
3. Fix TypeScript errors in other parts of the codebase (not related to our modularization) 