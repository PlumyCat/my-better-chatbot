"use client";

import { ExternalLink } from "lucide-react";
import { useArtifactPanelStore } from "@/features/artifacts/store";
import type { Artifact } from "@/features/artifacts/types";
import { cn } from "lib/utils";

interface ArtifactLinkProps {
  artifact: Artifact;
  className?: string;
}

export function ArtifactLink({ artifact, className }: ArtifactLinkProps) {
  const { setCurrentArtifact, openPanel } = useArtifactPanelStore();

  const handleViewArtifact = () => {
    console.log("🔍 Viewing artifact:", artifact.title);
    setCurrentArtifact(artifact);
    openPanel();
    console.log("✅ Panel should be open now");
  };

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

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case "text/html":
        return "🌐";
      case "image/svg+xml":
        return "🎨";
      case "application/vnd.artifact.mermaid":
        return "📊";
      default:
        if (type.startsWith("application/vnd.artifact.code")) {
          return "💻";
        }
        return "📄";
    }
  };

  return (
    <div
      className={cn(
        "border border-border rounded-lg bg-card transition-colors",
        className,
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <span className="text-2xl">{getArtifactIcon(artifact.type)}</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-foreground mb-1 truncate">
                {artifact.title}
              </h3>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground flex-wrap">
                <span className="bg-muted px-2 py-1 rounded">
                  {getArtifactTypeLabel(artifact.type)}
                </span>
                <span>•</span>
                <span>{artifact.content.length} caractères</span>
                <span>•</span>
                <span>Version {artifact.version}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleViewArtifact}
            className="flex items-center space-x-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors cursor-pointer text-sm font-medium whitespace-nowrap"
            type="button"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Voir</span>
          </button>
        </div>

        {/* Preview line */}
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground font-mono truncate">
            {artifact.content.split("\n")[0].substring(0, 100)}
            {artifact.content.length > 100 && "..."}
          </p>
        </div>
      </div>
    </div>
  );
}
