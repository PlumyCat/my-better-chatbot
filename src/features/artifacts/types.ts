export interface ArtifactMeta {
  identifier: string;
  type: string;
  title?: string;
  language?: string;
}

export interface Artifact extends ArtifactMeta {
  id: string;
  conversationId: string;
  messageId: string;
  version: number;
  content: string;
  createdAt: Date;
}

export type ArtifactChunkEvent =
  | { kind: 'text'; text: string }
  | { kind: 'artifact-start'; meta: ArtifactMeta }
  | { kind: 'artifact-chunk'; text: string }
  | { kind: 'artifact-end' };

export type ArtifactType = 
  | 'text/html'
  | 'image/svg+xml'
  | 'application/.artifacts.mermaid'
  | 'application/.artifacts.code';

export interface ArtifactVersion {
  version: number;
  content: string;
  createdAt: Date;
}

export interface ArtifactPanelState {
  isOpen: boolean;
  selectedArtifactId: string | null;
  selectedVersion: number | null;
  artifacts: Artifact[];
  loading: boolean;
  error: string | null;
}