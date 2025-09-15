"use client";

import { useState, memo } from "react";
import { Button } from "ui/button";
import {
  Code,
  Eye,
  Copy,
  Download,
  ExternalLink,
  MoreHorizontal,
  Edit3,
} from "lucide-react";
import { cn } from "lib/utils";
import { useCopy } from "@/hooks/use-copy";
import type { Artifact } from "../types";
import { CodeArtifact } from "./renderers/CodeArtifact";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { toast } from "sonner";

interface ArtifactContainerProps {
  artifact: Artifact;
  children: React.ReactNode;
  className?: string;
}

export const ArtifactContainer = memo(function ArtifactContainer({
  artifact,
  children,
  className,
}: ArtifactContainerProps) {
  const [viewMode, setViewMode] = useState<"preview" | "source">("preview");
  const { copy } = useCopy();

  const handleCopy = async () => {
    await copy(artifact.content);
    toast.success("Code copié dans le presse-papiers");
  };

  const handleDownload = () => {
    const blob = new Blob([artifact.content], {
      type: getDownloadMimeType(artifact.type),
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${artifact.identifier}.${getFileExtension(artifact.type)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Fichier téléchargé");
  };

  const handleOpenInNewTab = () => {
    if (artifact.type === "text/html") {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(artifact.content);
        newWindow.document.close();
      }
    } else {
      toast.info(
        "Ouverture dans un nouvel onglet disponible uniquement pour HTML",
      );
    }
  };

  // const toggleViewMode = () => {
  //   setViewMode(viewMode === 'preview' ? 'source' : 'preview');
  // };

  const getArtifactTypeLabel = (type: string) => {
    switch (type) {
      case "text/html":
        return "HTML";
      case "image/svg+xml":
        return "SVG";
      case "application/vnd.artifact.mermaid":
        return "Mermaid";
      default:
        if (type.startsWith("application/vnd.artifact.code")) {
          const lang = artifact.language || type.split("+")[1] || "Code";
          return lang.toUpperCase();
        }
        return "Code";
    }
  };

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg overflow-hidden shadow-sm",
        "max-w-4xl mx-auto my-4",
        className,
      )}
    >
      {/* Header - Style Claude Desktop */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-sm font-medium text-foreground">
              {artifact.title}
            </span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
              {getArtifactTypeLabel(artifact.type)}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Toggle View/Source */}
          <div className="flex items-center bg-muted rounded-md p-1">
            <Button
              variant={viewMode === "preview" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("preview")}
              className="h-8 px-3 text-xs font-medium cursor-pointer hover:bg-secondary/80"
            >
              <Eye className="h-3 w-3 mr-1.5" />
              Aperçu
            </Button>
            <Button
              variant={viewMode === "source" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("source")}
              className="h-8 px-3 text-xs font-medium cursor-pointer hover:bg-secondary/80"
            >
              <Code className="h-3 w-3 mr-1.5" />
              Code
            </Button>
          </div>

          {/* Action Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 cursor-pointer hover:bg-muted/60"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copier le code
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </DropdownMenuItem>
              {artifact.type === "text/html" && (
                <DropdownMenuItem onClick={handleOpenInNewTab}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ouvrir dans un onglet
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <Edit3 className="h-4 w-4 mr-2" />
                Modifier (bientôt)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative">
        {viewMode === "preview" ? (
          <div className="min-h-[200px]">{children}</div>
        ) : (
          <div className="bg-muted/10">
            <CodeArtifact
              artifact={artifact}
              showLineNumbers={true}
              className="border-0 rounded-none"
            />
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 bg-muted/20 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>
            Version {artifact.version} • {artifact.content.length} caractères
          </span>
          <span>ID: {artifact.identifier}</span>
        </div>
      </div>
    </div>
  );
});

function getDownloadMimeType(artifactType: string): string {
  switch (artifactType) {
    case "text/html":
      return "text/html";
    case "image/svg+xml":
      return "image/svg+xml";
    case "application/vnd.artifact.mermaid":
      return "text/plain";
    default:
      return "text/plain";
  }
}

function getFileExtension(artifactType: string): string {
  switch (artifactType) {
    case "text/html":
      return "html";
    case "image/svg+xml":
      return "svg";
    case "application/vnd.artifact.mermaid":
      return "mmd";
    default:
      if (artifactType.startsWith("application/vnd.artifact.code")) {
        const lang = artifactType.split("+")[1];
        switch (lang) {
          case "javascript":
            return "js";
          case "typescript":
            return "ts";
          case "python":
            return "py";
          case "java":
            return "java";
          case "cpp":
            return "cpp";
          case "c":
            return "c";
          default:
            return "txt";
        }
      }
      return "txt";
  }
}
