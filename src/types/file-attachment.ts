export interface FileAttachment {
  id: string;
  filename: string;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  storagePath: string;
  contentHash?: string;
  uploadedBy: string;
  messageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileUploadRequest {
  files: File[];
  messageId?: string;
}

export interface FileUploadResponse {
  success: boolean;
  files: FileAttachment[];
  errors?: string[];
}

export interface FileMetadata {
  id: string;
  filename: string;
  contentType: string;
  fileSize: number;
  isImage: boolean;
  isDocument: boolean;
  isCode: boolean;
  createdAt: Date;
}

export const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/csv',
  // Code
  'text/javascript',
  'application/json',
  'text/html',
  'text/css',
  'application/xml',
  'text/xml',
] as const;

export const ALLOWED_FILE_TYPES_STRING = ALLOWED_FILE_TYPES.join(',');

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILES_PER_UPLOAD = 5;

export function isAllowedFileType(mimeType: string): boolean {
  return ALLOWED_FILE_TYPES.includes(mimeType as any);
}

export function getFileCategory(mimeType: string): 'image' | 'document' | 'code' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html') || mimeType.includes('css') || mimeType.includes('xml')) return 'code';
  return 'other';
}