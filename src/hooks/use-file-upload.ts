import { useState, useCallback } from 'react';
import { FileUploadResponse } from '@/types/file-attachment';

export interface UseFileUploadResult {
  upload: (files: File[], messageId?: string) => Promise<FileUploadResponse>;
  uploading: boolean;
  progress: number;
  error: string | null;
  clearError: () => void;
}

export function useFileUpload(): UseFileUploadResult {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const upload = useCallback(async (files: File[], messageId?: string): Promise<FileUploadResponse> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      
      // Add files to form data
      files.forEach(file => {
        formData.append('files', file);
      });

      // Add optional message ID
      if (messageId) {
        formData.append('messageId', messageId);
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result: FileUploadResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.errors?.join(', ') || 'Upload failed');
      }

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      throw err;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, []);

  return {
    upload,
    uploading,
    progress,
    error,
    clearError,
  };
}