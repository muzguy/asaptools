'use client';

import React, { useMemo } from 'react';
import CodeMirror, { Extension, ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { SupportedLanguage } from '@/lib/code-playground-utils';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: SupportedLanguage;
  isDark: boolean;
  onRun?: () => void;
  readOnly?: boolean;
}

export default function CodeEditor({
  value,
  onChange,
  language,
  isDark,
  onRun,
  readOnly = false,
}: CodeEditorProps) {
  const editorRef = React.useRef<ReactCodeMirrorRef>(null);

  // Compute extensions based on language
  const extensions = useMemo(() => {
    const list: Extension[] = [];

    if (language === 'c' || language === 'cpp') {
      list.push(cpp());
    } else if (language === 'python') {
      list.push(python());
    }

    return list;
  }, [language]);

  // Handle Ctrl+Enter / Cmd+Enter to Run
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (onRun) {
        onRun();
      }
    }
  };

  return (
    <div
      className="w-full h-full relative font-mono text-xs sm:text-sm overflow-hidden"
      onKeyDown={handleKeyDown}
    >
      <CodeMirror
        ref={editorRef}
        value={value}
        height="100%"
        minHeight="480px"
        extensions={extensions}
        theme={isDark ? oneDark : 'light'}
        onChange={onChange}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          history: true,
          foldGutter: true,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: false,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          searchKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true,
        }}
        className="h-full border-none focus:outline-none"
        style={{
          fontSize: '13px',
          fontFamily:
            'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        }}
      />
    </div>
  );
}
