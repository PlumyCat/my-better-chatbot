import { useState, useEffect } from 'react';
import { FileMetadata } from '@/types/file-attachment';

export function useFileMetadata(fileIds: string[]) {
  const [metadata, setMetadata] = useState<Record<string, FileMetadata>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchMetadata = async () => {
      for (const fileId of fileIds) {
        if (metadata[fileId] || loading[fileId]) continue;

        setLoading(prev => ({ ...prev, [fileId]: true }));
        setError(prev => ({ ...prev, [fileId]: '' }));

        try {
          const response = await fetch(`/api/files/${fileId}/metadata`);
          if (!response.ok) {
            throw new Error(`Failed to fetch metadata: ${response.statusText}`);
          }

          const fileMetadata = await response.json();
          setMetadata(prev => ({ ...prev, [fileId]: fileMetadata }));
        } catch (err) {
          setError(prev => ({ 
            ...prev, 
            [fileId]: err instanceof Error ? err.message : 'Failed to load file metadata' 
          }));
        } finally {
          setLoading(prev => ({ ...prev, [fileId]: false }));
        }
      }
    };

    if (fileIds.length > 0) {
      fetchMetadata();
    }
  }, [fileIds, metadata, loading]);

  return { metadata, loading, error };
}