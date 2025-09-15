"use client";

import { useState } from "react";
import { X, Download, Copy, ExternalLink, Code, Eye } from "lucide-react";
import { Button } from "ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";
import {
  useArtifactPanelStore,
  useCurrentConversationArtifacts,
} from "../store";
import { HtmlArtifact } from "./renderers/HtmlArtifact";
import { SvgArtifact } from "./renderers/SvgArtifact";
import { MermaidArtifact } from "./renderers/MermaidArtifact";
import { CodeArtifact } from "./renderers/CodeArtifact";
import { toast } from "sonner";
import { cn } from "lib/utils";
import type { Artifact } from "../types";

export function ArtifactPanel() {
  const { isOpen, closePanel, selectArtifact, currentArtifact } =
    useArtifactPanelStore();

  const conversationArtifacts = useCurrentConversationArtifacts();
  const [activeTab, setActiveTab] = useState<"preview" | "source">("preview");

  // Get unique identifiers for dropdown (only from current conversation)
  const uniqueArtifacts = conversationArtifacts.reduce((acc, artifact) => {
    const existing = acc.find((a) => a.identifier === artifact.identifier);
    if (!existing || artifact.version > existing.version) {
      return [
        ...acc.filter((a) => a.identifier !== artifact.identifier),
        artifact,
      ];
    }
    return acc;
  }, [] as Artifact[]);

  // Get all versions of current artifact (only from current conversation)
  const currentArtifactVersions = currentArtifact?.identifier
    ? conversationArtifacts
        .filter((a) => a.identifier === currentArtifact.identifier)
        .sort((a, b) => b.version - a.version)
    : [];

  const handleCopy = async () => {
    if (!currentArtifact) return;

    try {
      await navigator.clipboard.writeText(currentArtifact.content);
      toast.success("Artifact content copied to clipboard");
    } catch (_error) {
      toast.error("Failed to copy content");
    }
  };

  const handleDownload = async () => {
    if (!currentArtifact) return;

    try {
      const response = await fetch(
        `/api/artifacts/${currentArtifact.identifier}/export?conversationId=${currentArtifact.conversationId}&version=${currentArtifact.version}`,
        { method: "POST" },
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const filename =
          response.headers
            .get("Content-Disposition")
            ?.split("filename=")[1]
            ?.replace(/"/g, "") || `${currentArtifact.identifier}.txt`;

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success("Artifact downloaded");
      } else {
        toast.error("Failed to download artifact");
      }
    } catch (_error) {
      toast.error("Failed to download artifact");
    }
  };

  const handleDetach = () => {
    if (!currentArtifact) return;

    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${currentArtifact.title || currentArtifact.identifier}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
            pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow: auto; }
          </style>
        </head>
        <body>
          ${
            currentArtifact.type === "text/html"
              ? currentArtifact.content
              : `<pre><code>${currentArtifact.content}</code></pre>`
          }
        </body>
        </html>
      `);
      newWindow.document.close();
      toast.success("Artifact opened in new tab");
    }
  };

  const renderArtifact = () => {
    if (!currentArtifact) return null;

    const props = { artifact: currentArtifact };

    switch (currentArtifact.type) {
      case "text/html":
        return <HtmlArtifact {...props} />;
      case "image/svg+xml":
        return <SvgArtifact {...props} />;
      case "application/.artifacts.mermaid":
        return <MermaidArtifact {...props} />;
      case "application/.artifacts.code":
        return <CodeArtifact {...props} />;
      default:
        return <CodeArtifact {...props} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-full w-1/2 bg-background border-l border-border shadow-lg z-50",
        "flex flex-col",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-4 flex-1">
          {/* Artifact Selector */}
          <Select
            value={currentArtifact?.identifier || ""}
            onValueChange={(value) => selectArtifact(value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select artifact" />
            </SelectTrigger>
            <SelectContent>
              {uniqueArtifacts.map((artifact) => (
                <SelectItem
                  key={artifact.identifier}
                  value={artifact.identifier}
                >
                  {artifact.title || artifact.identifier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Version Selector */}
          {currentArtifactVersions.length > 1 && (
            <Select
              value={currentArtifact?.version?.toString() || ""}
              onValueChange={(value) =>
                selectArtifact(
                  currentArtifact?.identifier || "",
                  parseInt(value),
                )
              }
            >
              <SelectTrigger className="w-24">
                <SelectValue placeholder="v1" />
              </SelectTrigger>
              <SelectContent>
                {currentArtifactVersions.map((artifact) => (
                  <SelectItem
                    key={artifact.version}
                    value={artifact.version.toString()}
                  >
                    v{artifact.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!currentArtifact}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!currentArtifact}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDetach}
            disabled={!currentArtifact}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={closePanel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {currentArtifact ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="flex-1 flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
              <TabsTrigger
                value="preview"
                className="flex items-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </TabsTrigger>
              <TabsTrigger
                value="source"
                className="flex items-center space-x-2"
              >
                <Code className="h-4 w-4" />
                <span>Source</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="preview"
              className="flex-1 overflow-hidden mt-4"
            >
              <div className="h-full overflow-auto p-4">{renderArtifact()}</div>
            </TabsContent>

            <TabsContent value="source" className="flex-1 overflow-hidden mt-4">
              <div className="h-full overflow-auto">
                <CodeArtifact
                  artifact={{
                    ...currentArtifact,
                    language:
                      currentArtifact.language ||
                      getLanguageFromType(currentArtifact.type),
                  }}
                  showLineNumbers={true}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No artifact selected</p>
            <p className="text-sm">
              Select an artifact from the dropdown above
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function getLanguageFromType(type: string): string {
  switch (type) {
    case "text/html":
      return "html";
    case "image/svg+xml":
      return "xml";
    case "application/.artifacts.mermaid":
      return "mermaid";
    case "application/.artifacts.code":
      return "javascript";
    default:
      return "text";
  }
}
