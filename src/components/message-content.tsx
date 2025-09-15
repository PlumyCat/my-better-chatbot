"use client";

import { useMemo, useEffect } from "react";
import { Markdown } from "./markdown";
// import { createArtifactsParser } from "@/features/artifacts/parser";
import { ArtifactLink } from "./artifact-link";
import { useArtifactPanelStore } from "@/features/artifacts/store";
import type { Artifact } from "@/features/artifacts/types";

interface MessageContentProps {
  content: string;
}

export function MessageContent({ content }: MessageContentProps) {
  const { addArtifact } = useArtifactPanelStore();

  const parsedContent = useMemo(() => {
    // const parser = createArtifactsParser(); // Unused for now
    const artifacts: Artifact[] = [];
    let currentArtifact: Partial<Artifact> | null = null;

    // Parse le contenu pour extraire les artefacts
    const lines = content.split("\n");
    const nonArtifactContent: string[] = [];
    let inArtifact = false;
    let artifactContent: string[] = [];

    for (const line of lines) {
      if (line.trim().startsWith("<Artifact")) {
        // Début d'un artefact
        inArtifact = true;
        artifactContent = [];

        // Parser les attributs de l'artefact
        const identifierMatch = line.match(/identifier="([^"]+)"/);
        const typeMatch = line.match(/type="([^"]+)"/);
        const titleMatch = line.match(/title="([^"]+)"/);
        const languageMatch = line.match(/language="([^"]+)"/);

        if (identifierMatch && typeMatch && titleMatch) {
          currentArtifact = {
            id: identifierMatch[1],
            identifier: identifierMatch[1],
            type: typeMatch[1],
            title: titleMatch[1],
            language: languageMatch ? languageMatch[1] : undefined,
            version: 1,
            content: "",
          };
        }
      } else if (
        line.trim() === "</Artifact>" &&
        inArtifact &&
        currentArtifact
      ) {
        // Fin d'un artefact
        inArtifact = false;
        currentArtifact.content = artifactContent.join("\n");
        artifacts.push(currentArtifact as Artifact);

        // Ajouter le placeholder dans le contenu principal
        nonArtifactContent.push(`\n[ARTIFACT:${currentArtifact.identifier}]\n`);

        currentArtifact = null;
      } else if (inArtifact) {
        // Contenu de l'artefact
        artifactContent.push(line);
      } else if (
        !line.trim().startsWith("<Thinking>") &&
        !line.trim().startsWith("</Thinking>")
      ) {
        // Contenu normal (ignorer les blocs Thinking)
        if (!inThinking(line)) {
          nonArtifactContent.push(line);
        }
      }
    }

    // Filtrer les blocs Thinking
    let cleanContent = nonArtifactContent.join("\n");
    cleanContent = cleanContent
      .replace(/<Thinking>[\s\S]*?<\/Thinking>/g, "")
      .trim();

    return {
      textContent: cleanContent,
      artifacts,
    };
  }, [content]);

  const { textContent, artifacts } = parsedContent;

  // Ajouter les artefacts au store global
  const { currentConversationId } = useArtifactPanelStore();
  useEffect(() => {
    artifacts.forEach((artifact) => {
      // Ajouter des propriétés manquantes pour que l'artefact soit complet
      const completeArtifact: Artifact = {
        ...artifact,
        id: artifact.id || `${artifact.identifier}-${artifact.version}`,
        conversationId: currentConversationId || "unknown",
        messageId: "current", // Temporaire - devrait être le vrai messageId
        createdAt: new Date(),
      };
      addArtifact(completeArtifact);
    });
  }, [artifacts, addArtifact, currentConversationId]);

  // Fonction pour rendre le contenu avec les artefacts intégrés
  const renderContentWithArtifacts = () => {
    if (!textContent || !textContent.trim()) {
      // S'il n'y a pas de texte, afficher juste les artefacts
      return artifacts.map((artifact) => (
        <div key={artifact.identifier} className="my-3">
          <ArtifactLink artifact={artifact} />
        </div>
      ));
    }

    const parts = textContent.split(/\[ARTIFACT:([^\]]+)\]/);
    const elements: React.JSX.Element[] = [];

    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // Contenu texte normal
        const trimmedPart = parts[i].trim();
        if (trimmedPart) {
          elements.push(
            <div key={`text-${i}`} className="prose prose-sm max-w-none">
              <Markdown>{trimmedPart}</Markdown>
            </div>,
          );
        }
      } else {
        // Placeholder d'artefact - remplacer par le lien vers l'artefact
        const artifact = artifacts.find((a) => a.identifier === parts[i]);
        if (artifact) {
          elements.push(
            <div key={`artifact-${i}`} className="my-3">
              <ArtifactLink artifact={artifact} />
            </div>,
          );
        }
      }
    }

    // Ajouter les artefacts qui n'ont pas été intégrés dans le texte
    const unmatchedArtifacts = artifacts.filter(
      (artifact) => !textContent.includes(`[ARTIFACT:${artifact.identifier}]`),
    );

    unmatchedArtifacts.forEach((artifact) => {
      elements.push(
        <div key={`unmatched-${artifact.identifier}`} className="my-3">
          <ArtifactLink artifact={artifact} />
        </div>,
      );
    });

    return elements;
  };

  return (
    <div className="flex flex-col gap-2">{renderContentWithArtifacts()}</div>
  );
}

function inThinking(_line: string): boolean {
  // Simple check - this could be improved with a proper state machine
  return false; // For now, we handle this in the main parsing logic
}
