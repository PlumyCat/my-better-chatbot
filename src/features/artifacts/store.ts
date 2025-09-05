import { create } from 'zustand';
import type { Artifact } from './types';

export interface ArtifactPanelState {
  isOpen: boolean;
  selectedArtifactId: string | null;
  selectedVersion: number | null;
  artifacts: Artifact[];
  loading: boolean;
  error: string | null;
}

interface ArtifactPanelActions {
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  selectArtifact: (artifactId: string, version?: number) => void;
  addArtifact: (artifact: Artifact) => void;
  updateArtifact: (artifact: Artifact) => void;
  setArtifacts: (artifacts: Artifact[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

export type ArtifactPanelStore = ArtifactPanelState & ArtifactPanelActions;

const initialState: ArtifactPanelState = {
  isOpen: false,
  selectedArtifactId: null,
  selectedVersion: null,
  artifacts: [],
  loading: false,
  error: null,
};

export const useArtifactPanelStore = create<ArtifactPanelStore>((set, get) => ({
  ...initialState,

  openPanel: () => set({ isOpen: true }),
  
  closePanel: () => set({ isOpen: false }),
  
  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
  
  selectArtifact: (artifactId: string, version?: number) => {
    set({ 
      selectedArtifactId: artifactId,
      selectedVersion: version || null,
      isOpen: true, // Auto-open when selecting an artifact
    });
  },
  
  addArtifact: (artifact: Artifact) => {
    const { artifacts } = get();
    const existingIndex = artifacts.findIndex(
      (a) => a.identifier === artifact.identifier && a.conversationId === artifact.conversationId
    );
    
    if (existingIndex >= 0) {
      // Update existing artifact (higher version)
      const updatedArtifacts = [...artifacts];
      if (artifact.version > updatedArtifacts[existingIndex].version) {
        updatedArtifacts[existingIndex] = artifact;
      }
      set({ artifacts: updatedArtifacts });
    } else {
      // Add new artifact
      set({ artifacts: [...artifacts, artifact] });
    }
    
    // Auto-open panel and select the new/updated artifact
    set({ 
      isOpen: true,
      selectedArtifactId: artifact.identifier,
      selectedVersion: artifact.version,
    });
  },
  
  updateArtifact: (artifact: Artifact) => {
    const { artifacts } = get();
    const updatedArtifacts = artifacts.map((a) => 
      a.id === artifact.id ? artifact : a
    );
    set({ artifacts: updatedArtifacts });
  },
  
  setArtifacts: (artifacts: Artifact[]) => {
    set({ artifacts });
  },
  
  setLoading: (loading: boolean) => {
    set({ loading });
  },
  
  setError: (error: string | null) => {
    set({ error });
  },
  
  clearError: () => {
    set({ error: null });
  },
  
  reset: () => {
    set(initialState);
  },
}));

// Convenience hooks
export const useArtifactPanel = () => {
  const store = useArtifactPanelStore();
  return {
    isOpen: store.isOpen,
    selectedArtifactId: store.selectedArtifactId,
    selectedVersion: store.selectedVersion,
    loading: store.loading,
    error: store.error,
    openPanel: store.openPanel,
    closePanel: store.closePanel,
    togglePanel: store.togglePanel,
    selectArtifact: store.selectArtifact,
    clearError: store.clearError,
  };
};

export const useArtifacts = () => {
  const store = useArtifactPanelStore();
  return {
    artifacts: store.artifacts,
    loading: store.loading,
    error: store.error,
    addArtifact: store.addArtifact,
    updateArtifact: store.updateArtifact,
    setArtifacts: store.setArtifacts,
    setLoading: store.setLoading,
    setError: store.setError,
  };
};

// Get specific artifact by identifier and version
export const useArtifact = (identifier: string, version?: number) => {
  return useArtifactPanelStore((state) => {
    const artifact = state.artifacts.find((a) => {
      if (version) {
        return a.identifier === identifier && a.version === version;
      }
      // Get latest version if no version specified
      const allVersions = state.artifacts.filter((a) => a.identifier === identifier);
      const latest = allVersions.reduce((latest, current) => 
        current.version > latest.version ? current : latest
      , allVersions[0]);
      return a === latest;
    });
    
    return artifact || null;
  });
};