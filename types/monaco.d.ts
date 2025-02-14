declare module '@monaco-editor/react' {
  import { editor } from 'monaco-editor';
  import * as React from 'react';

  interface EditorProps {
    defaultLanguage?: string;
    defaultValue?: string;
    value?: string;
    language?: string;
    theme?: string | 'vs-dark' | 'light';
    height?: number | string;
    width?: number | string;
    loading?: React.ReactNode;
    options?: editor.IStandaloneEditorConstructionOptions;
    onChange?: (value: string | undefined, ev: editor.IModelContentChangedEvent) => void;
    onMount?: (editor: editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => void;
    beforeMount?: (monaco: typeof import('monaco-editor')) => void;
  }

  export default function Editor(props: EditorProps): JSX.Element;
} 