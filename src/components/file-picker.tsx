"use client";

import { useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "ui/button";
import { PaperclipIcon, XIcon, FileIcon, ImageIcon, UploadIcon } from "lucide-react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { isAllowedFileType, MAX_FILE_SIZE, MAX_FILES_PER_UPLOAD, getFileCategory, ALLOWED_FILE_TYPES_STRING } from "@/types/file-attachment";
import { cn } from "lib/utils";
import { toast } from "sonner";

interface FilePickerProps {
  onFilesUploaded?: (fileIds: string[]) => void;
  messageId?: string;
  disabled?: boolean;
  className?: string;
}

interface SelectedFile {
  file: File;
  id: string;
  preview?: string;
}

export function FilePicker({ onFilesUploaded, messageId, disabled, className }: FilePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  
  const { upload, uploading, progress } = useFileUpload();

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const validFiles: SelectedFile[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      // Validate file type
      if (!isAllowedFileType(file.type)) {
        errors.push(`${file.name}: File type not supported`);
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 10MB)`);
        return;
      }

      // Check total files limit
      if (selectedFiles.length + validFiles.length >= MAX_FILES_PER_UPLOAD) {
        errors.push(`Maximum ${MAX_FILES_PER_UPLOAD} files allowed`);
        return;
      }

      const selectedFile: SelectedFile = {
        file,
        id: Math.random().toString(36).substring(7),
      };

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          selectedFile.preview = e.target?.result as string;
          setSelectedFiles(prev => prev.map(f => f.id === selectedFile.id ? selectedFile : f));
        };
        reader.readAsDataURL(file);
      }

      validFiles.push(selectedFile);
    });

    if (errors.length > 0) {
      toast.error(errors.join('\n'));
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  }, [selectedFiles.length]);

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    try {
      const result = await upload(selectedFiles.map(f => f.file), messageId);
      
      if (result.success && result.files.length > 0) {
        const fileIds = result.files.map(f => f.id);
        onFilesUploaded?.(fileIds);
        setSelectedFiles([]);
        toast.success(`Uploaded ${result.files.length} file(s) successfully`);
      }

      if (result.errors && result.errors.length > 0) {
        toast.error(result.errors.join('\n'));
      }
    } catch (error) {
      toast.error('Upload failed');
    }
  }, [selectedFiles, upload, messageId, onFilesUploaded]);

  const removeFile = useCallback((id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_FILE_TYPES_STRING}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Drag and Drop Zone */}
      <div 
        className={cn(
          "border-2 border-dashed rounded-lg p-4 space-y-3 transition-colors relative",
          dragActive ? "border-primary bg-primary/5" : "border-border",
          disabled || uploading ? "opacity-50 pointer-events-none" : "cursor-pointer"
        )}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {selectedFiles.length === 0 ? (
          /* Empty State */
          <div className="text-center py-6">
            <PaperclipIcon className="size-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">
              Click to select files or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              Images, PDFs, text files, code files • Max 10MB • Up to 5 files
            </p>
          </div>
        ) : (
          /* Selected Files */
          <>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedFiles.length} file(s) selected
            </span>
            <Button
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering file selector
                handleUpload();
              }}
              disabled={uploading}
              size="sm"
              className="h-8"
            >
              {uploading ? (
                <>
                  <div className="animate-spin mr-2 h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                  Uploading... {progress}%
                </>
              ) : (
                <>
                  <UploadIcon className="size-3 mr-1" />
                  Upload
                </>
              )}
            </Button>
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* File List */}
          <div className="space-y-2">
            {selectedFiles.map((selectedFile) => {
              const category = getFileCategory(selectedFile.file.type);
              return (
                <div key={selectedFile.id} className="flex items-center gap-3 p-2 bg-background rounded border">
                  {/* File Icon/Preview */}
                  <div className="flex-shrink-0">
                    {selectedFile.preview ? (
                      <Image 
                        src={selectedFile.preview} 
                        alt={selectedFile.file.name}
                        width={32}
                        height={32}
                        className="w-8 h-8 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-8 h-8 flex items-center justify-center bg-muted rounded border">
                        {category === 'image' ? (
                          <ImageIcon className="size-4" />
                        ) : (
                          <FileIcon className="size-4" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.file.size)} • {selectedFile.file.type}
                    </p>
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering file selector
                      removeFile(selectedFile.id);
                    }}
                    className="flex-shrink-0 h-6 w-6 p-0"
                    disabled={uploading}
                  >
                    <XIcon className="size-3" />
                  </Button>
                </div>
              );
            })}
          </div>

          </>
        )}

        {/* Drop Zone Overlay */}
        {dragActive && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-primary rounded-lg flex items-center justify-center">
            <div className="text-center">
              <UploadIcon className="size-8 mx-auto mb-2 text-primary" />
              <p className="text-primary font-medium">Drop files here to upload</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}