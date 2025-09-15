"use client";

import { useState, useRef, useCallback } from "react";
import DOMPurify from "dompurify";
import type { Artifact } from "../../types";
import { cn } from "lib/utils";
import {
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
} from "lucide-react";
import { Button } from "ui/button";

interface SvgArtifactProps {
  artifact: Artifact;
  className?: string;
}

export function SvgArtifact({ artifact, className }: SvgArtifactProps) {
  const [renderError, setRenderError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.2, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.2, 0.1));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  const handleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const sanitizedSvg = sanitizeSvgContent(artifact.content);

  if (renderError) {
    return (
      <div className={cn("w-full", className)}>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Failed to render SVG</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{renderError}</p>
        </div>
      </div>
    );
  }

  const containerClasses = cn(
    "w-full",
    isFullscreen && "fixed inset-0 z-50 bg-background",
    className,
  );

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
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="h-7 w-7 p-0"
              title="Zoom Out"
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetZoom}
              className="h-7 px-2 text-xs"
              title="Reset Zoom"
            >
              {Math.round(zoom * 100)}%
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="h-7 w-7 p-0"
              title="Zoom In"
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetZoom}
              className="h-7 w-7 p-0"
              title="Reset"
            >
              <RotateCcw className="h-3 w-3" />
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

        {/* SVG Container */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-white flex items-center justify-center p-4"
          style={{ minHeight: isFullscreen ? "calc(100vh - 60px)" : "400px" }}
        >
          <div
            className="transition-transform duration-200 ease-out"
            style={{ transform: `scale(${zoom})` }}
          >
            <div
              className="svg-container"
              dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
              onError={() => setRenderError("Invalid SVG content")}
            />
          </div>
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

function sanitizeSvgContent(content: string): string {
  try {
    // Basic SVG validation and sanitization
    let svgContent = content.trim();

    // If content doesn't start with <svg, wrap it
    if (!svgContent.toLowerCase().startsWith("<svg")) {
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">${svgContent}</svg>`;
    }

    // Use DOMPurify for comprehensive SVG sanitization
    const sanitized = DOMPurify.sanitize(svgContent, {
      USE_PROFILES: { svg: true, svgFilters: true },
      ALLOWED_TAGS: [
        "svg",
        "g",
        "path",
        "circle",
        "ellipse",
        "line",
        "rect",
        "polyline",
        "polygon",
        "text",
        "tspan",
        "textPath",
        "defs",
        "clipPath",
        "mask",
        "pattern",
        "image",
        "switch",
        "foreignObject",
        "marker",
        "symbol",
        "use",
        "linearGradient",
        "radialGradient",
        "stop",
        "filter",
        "feColorMatrix",
        "feOffset",
        "feFlood",
        "feComposite",
        "feGaussianBlur",
        "title",
        "desc",
      ],
      ALLOWED_ATTR: [
        "x",
        "y",
        "x1",
        "y1",
        "x2",
        "y2",
        "cx",
        "cy",
        "r",
        "rx",
        "ry",
        "width",
        "height",
        "d",
        "fill",
        "stroke",
        "stroke-width",
        "stroke-dasharray",
        "stroke-linecap",
        "stroke-linejoin",
        "opacity",
        "fill-opacity",
        "stroke-opacity",
        "transform",
        "viewBox",
        "xmlns",
        "xmlns:xlink",
        "xlink:href",
        "id",
        "class",
        "style",
        "points",
        "dx",
        "dy",
        "textAnchor",
        "font-family",
        "font-size",
        "font-weight",
        "text-anchor",
        "dominant-baseline",
        "alignment-baseline",
      ],
      FORBID_TAGS: ["script", "object", "embed", "iframe", "link"],
      FORBID_ATTR: [
        "onerror",
        "onload",
        "onclick",
        "onmouseover",
        "onfocus",
        "onblur",
      ],
    });

    return (
      sanitized ||
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><text x="10" y="50" fill="red">Error: Invalid SVG</text></svg>'
    );
  } catch (error) {
    console.error("Error sanitizing SVG:", error);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><text x="10" y="50" fill="red">Error: Invalid SVG</text></svg>';
  }
}
