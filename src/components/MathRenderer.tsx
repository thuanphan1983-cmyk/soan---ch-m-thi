'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  text: string;
  className?: string;
  displayMode?: boolean;
}

export default function MathRenderer({ text, className = '', displayMode = false }: MathRendererProps) {
  const renderedContent = useMemo(() => {
    if (!text) return [];

    // Split text by $$...$$ and $...$
    // Regex matches either $$...$$ or $...$
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$]+?\$)/g);

    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const latex = part.slice(2, -2).trim();
        try {
          const html = katex.renderToString(latex, {
            throwOnError: false,
            displayMode: true,
          });
          return (
            <span
              key={index}
              className="block my-2 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <span key={index} className="text-red-500 font-mono">{part}</span>;
        }
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const latex = part.slice(1, -1).trim();
        try {
          const html = katex.renderToString(latex, {
            throwOnError: false,
            displayMode: false,
          });
          return (
            <span
              key={index}
              className="inline-math inline-block mx-0.5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <span key={index} className="text-red-500 font-mono">{part}</span>;
        }
      } else {
        // Normal text, preserve line breaks
        return (
          <span key={index} className="whitespace-pre-wrap">
            {part}
          </span>
        );
      }
    });
  }, [text]);

  return <span className={`math-renderer ${className}`}>{renderedContent}</span>;
}
