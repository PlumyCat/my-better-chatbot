"use client";

import { useRef, useEffect, useState } from "react";
import DOMPurify from "dompurify";
import type { Artifact } from "../../types";
import { cn } from "lib/utils";
import { AlertCircle } from "lucide-react";

interface HtmlArtifactProps {
  artifact: Artifact;
  className?: string;
}

export function HtmlArtifact({ artifact, className }: HtmlArtifactProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    try {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;

      if (!doc) {
        setLoadError("Unable to access iframe document");
        return;
      }

      // Sanitize and create a complete HTML document with proper structure
      const sanitizedContent = DOMPurify.sanitize(artifact.content, {
        ALLOWED_TAGS: [
          "div",
          "span",
          "p",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "ul",
          "ol",
          "li",
          "table",
          "thead",
          "tbody",
          "tr",
          "th",
          "td",
          "a",
          "img",
          "br",
          "hr",
          "strong",
          "em",
          "b",
          "i",
          "u",
          "small",
          "code",
          "pre",
          "blockquote",
          "button",
          "input",
          "label",
          "form",
          "select",
          "option",
          "textarea",
          "fieldset",
          "legend",
        ],
        ALLOWED_ATTR: [
          "class",
          "id",
          "style",
          "href",
          "src",
          "alt",
          "title",
          "type",
          "value",
          "placeholder",
          "name",
          "for",
          "colspan",
          "rowspan",
        ],
        ALLOW_DATA_ATTR: false,
        FORBID_TAGS: ["script", "object", "embed", "base", "link"],
        FORBID_ATTR: [
          "onerror",
          "onload",
          "onclick",
          "onmouseover",
          "onfocus",
          "onblur",
        ],
      });

      const htmlContent = createSafeHtmlDocument(
        sanitizedContent,
        artifact.title,
      );

      doc.open();
      doc.write(htmlContent);
      doc.close();

      setLoadError(null);
    } catch (error) {
      console.error("Error rendering HTML artifact:", error);
      setLoadError(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    }
  }, [artifact.content, artifact.title]);

  if (loadError) {
    return (
      <div className={cn("w-full", className)}>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Failed to render HTML</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "bg-background overflow-hidden",
          !className?.includes("border-0") && "border border-border",
          !className?.includes("rounded-none") && "rounded-lg",
        )}
      >
        <div className="relative bg-white min-h-[300px]">
          <iframe
            ref={iframeRef}
            className="w-full min-h-[400px] border-0"
            sandbox="allow-scripts allow-same-origin allow-forms"
            title={artifact.title || "HTML Artifact"}
            style={{
              colorScheme: "light",
              background: "white",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function createSafeHtmlDocument(content: string, title?: string): string {
  // Check if content is already a complete HTML document
  const hasDoctype = content.trim().toLowerCase().startsWith("<!doctype");
  const hasHtmlTag = /<html[\s>]/i.test(content);

  if (hasDoctype && hasHtmlTag) {
    return content;
  }

  // If it's just HTML content without structure, wrap it
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || "HTML Artifact"}</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }
    
    /* Basic styling for common elements */
    h1, h2, h3, h4, h5, h6 {
      margin-top: 0;
      margin-bottom: 0.5em;
    }
    
    p {
      margin-bottom: 1em;
    }
    
    a {
      color: #007bff;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    code {
      background: #f8f9fa;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.9em;
    }
    
    pre {
      background: #f8f9fa;
      padding: 1em;
      border-radius: 5px;
      overflow-x: auto;
    }
    
    pre code {
      background: none;
      padding: 0;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 1em;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
    }
    
    th {
      background-color: #f8f9fa;
      font-weight: 600;
    }
    
    img {
      max-width: 100%;
      height: auto;
    }
    
    .container {
      max-width: 100%;
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>`;
}
