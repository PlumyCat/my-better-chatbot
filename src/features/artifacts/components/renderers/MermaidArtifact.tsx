"use client";

import { useEffect, useRef, useState } from "react";
import type { Artifact } from "../../types";
import { cn } from "lib/utils";
import { AlertCircle, Download, Maximize2 } from "lucide-react";
import { Button } from "ui/button";

interface MermaidArtifactProps {
  artifact: Artifact;
  className?: string;
}

export function MermaidArtifact({ artifact, className }: MermaidArtifactProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const renderMermaid = async () => {
      if (!containerRef.current) return;

      try {
        setIsLoading(true);
        setRenderError(null);

        // Dynamically import mermaid to avoid SSR issues
        const mermaid = await import("mermaid");

        // Configure mermaid
        mermaid.default.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "sandbox",
          htmlLabels: false,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        });

        // Clear the container
        const container = containerRef.current;
        container.innerHTML = "";

        // Generate unique ID for this diagram
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        try {
          // Validate and render the diagram
          const { svg } = await mermaid.default.render(id, artifact.content);

          if (mounted) {
            container.innerHTML = svg;
            setIsLoading(false);
          }
        } catch (parseError) {
          console.error("Mermaid parse error:", parseError);
          if (mounted) {
            setRenderError(
              parseError instanceof Error
                ? parseError.message
                : "Invalid diagram syntax",
            );
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error("Mermaid render error:", error);
        if (mounted) {
          setRenderError("Failed to load Mermaid renderer");
          setIsLoading(false);
        }
      }
    };

    renderMermaid();

    return () => {
      mounted = false;
    };
  }, [artifact.content]);

  const handleDownload = () => {
    if (!containerRef.current) return;

    const svgElement = containerRef.current.querySelector("svg");
    if (!svgElement) return;

    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml" });
      const url = URL.createObjectURL(svgBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${artifact.identifier || "mermaid-diagram"}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  const handleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const containerClasses = cn(
    "w-full",
    isFullscreen && "fixed inset-0 z-50 bg-background",
    className,
  );

  if (renderError) {
    return (
      <div className={cn("w-full", className)}>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              Failed to render Mermaid diagram
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{renderError}</p>

          {/* Show the raw content for debugging */}
          <details className="mt-3">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              Show diagram source
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
              {artifact.content}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <div className="bg-background border border-border rounded-lg overflow-hidden h-full flex flex-col">
        {/* Header */}
        <div className="px-4 py-2 bg-muted/40 border-b border-border flex items-center justify-between">
          <div>
            {artifact.title && (
              <h3 className="text-sm font-medium text-foreground">
                {artifact.title}
              </h3>
            )}
            <p className="text-xs text-muted-foreground">Mermaid Diagram</p>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-7 w-7 p-0"
              title="Download SVG"
              disabled={isLoading}
            >
              <Download className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFullscreen}
              className="h-7 w-7 p-0"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Diagram Container */}
        <div className="flex-1 overflow-auto bg-white flex items-center justify-center p-4">
          {isLoading ? (
            <div className="flex items-center justify-center text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current mr-2"></div>
              <span className="text-sm">Rendering diagram...</span>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="mermaid-container max-w-full max-h-full flex items-center justify-center"
              style={{
                minHeight: isFullscreen ? "calc(100vh - 120px)" : "300px",
              }}
            />
          )}
        </div>

        {isFullscreen && (
          <div className="absolute top-4 right-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFullscreen}
              className="bg-background"
            >
              Exit Fullscreen
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
