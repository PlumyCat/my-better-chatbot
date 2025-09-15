"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Artifact } from "../../types";
import { cn } from "lib/utils";

interface CodeArtifactProps {
  artifact: Artifact;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeArtifact({
  artifact,
  showLineNumbers = false,
  className,
}: CodeArtifactProps) {
  const language = getLanguageForHighlighter(artifact.language);

  return (
    <div className={cn("w-full", className)}>
      <div className="bg-muted/20 border border-border rounded-lg overflow-hidden">
        {artifact.title && (
          <div className="px-4 py-2 bg-muted/40 border-b border-border">
            <h3 className="text-sm font-medium text-foreground">
              {artifact.title}
            </h3>
          </div>
        )}

        <div className="relative">
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            showLineNumbers={showLineNumbers}
            customStyle={{
              margin: 0,
              padding: "1rem",
              background: "transparent",
              fontSize: "0.875rem",
              lineHeight: "1.5",
            }}
            codeTagProps={{
              style: {
                fontFamily:
                  'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              },
            }}
          >
            {artifact.content}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}

function getLanguageForHighlighter(language?: string): string {
  if (!language) return "text";

  // Map some common language names to Prism-supported ones
  const languageMap: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    jsx: "jsx",
    tsx: "tsx",
    py: "python",
    rb: "ruby",
    yml: "yaml",
    sh: "bash",
    md: "markdown",
    json: "json",
    css: "css",
    scss: "scss",
    less: "less",
    html: "html",
    xml: "xml",
    sql: "sql",
    php: "php",
    go: "go",
    rust: "rust",
    cpp: "cpp",
    c: "c",
    java: "java",
    kotlin: "kotlin",
    swift: "swift",
  };

  return languageMap[language.toLowerCase()] || language.toLowerCase();
}
