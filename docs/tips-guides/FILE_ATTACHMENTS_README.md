# File Attachment System Documentation

## Overview

The Better Chatbot file attachment system allows users to upload, manage, and access files within chat conversations. The system supports drag-and-drop uploads, file validation, deduplication, and AI model integration through a specialized `readFile` tool.

## Architecture

### Core Components

1. **FilePicker Component** - Frontend file selection and upload interface
2. **File Upload API** - Backend file processing and storage endpoint
3. **ReadFile Tool** - AI model integration for file content access
4. **File Upload Hook** - React hook for upload state management
5. **Type Definitions** - TypeScript interfaces and validation utilities

### Database Schema

```sql
CREATE TABLE file_attachment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  content_hash TEXT, -- SHA-256 for deduplication
  uploaded_by UUID NOT NULL REFERENCES users(id),
  message_id TEXT, -- Optional reference to chat message
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX file_attachment_uploaded_by_idx ON file_attachment(uploaded_by);
CREATE INDEX file_attachment_content_hash_idx ON file_attachment(content_hash);
CREATE INDEX file_attachment_message_id_idx ON file_attachment(message_id);
```

### File Storage Structure

```
uploads/
├── 2025/
│   ├── 01/
│   │   ├── 15/
│   │   │   ├── 1736956800_a1b2c3d4_document.pdf
│   │   │   └── 1736956845_e5f6g7h8_code.js
│   │   └── 16/
│   └── 02/
```

Files are organized by date (YYYY/MM/DD) with unique filenames containing:
- Unix timestamp
- 8-character content hash prefix
- Sanitized original filename

## API Documentation

### Upload Endpoint

**POST** `/api/files/upload`

Handles file uploads with validation, deduplication, and storage.

#### Request

```typescript
Content-Type: multipart/form-data

FormData fields:
- files: File[] (required) - Files to upload
- messageId: string (optional) - Associate files with a chat message
```

#### Response

```typescript
interface FileUploadResponse {
  success: boolean;
  files: FileAttachment[];
  errors?: string[];
}

interface FileAttachment {
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
```

#### Example Request

```javascript
const formData = new FormData();
formData.append('files', file1);
formData.append('files', file2);
formData.append('messageId', 'chat-message-123');

const response = await fetch('/api/files/upload', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
```

#### Example Success Response

```json
{
  "success": true,
  "files": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "filename": "1736956800_a1b2c3d4_document.pdf",
      "originalFilename": "document.pdf",
      "contentType": "application/pdf",
      "fileSize": 1048576,
      "storagePath": "uploads/2025/01/15/1736956800_a1b2c3d4_document.pdf",
      "contentHash": "a1b2c3d4e5f6g7h8...",
      "uploadedBy": "user-uuid",
      "messageId": "chat-message-123",
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

#### Error Responses

```json
// Authentication error
{
  "success": false,
  "error": "Unauthorized"
}

// Validation error
{
  "success": false,
  "error": "Maximum 5 files allowed"
}

// Mixed success/failure
{
  "success": true,
  "files": [...],
  "errors": [
    "large-file.pdf: File too large (max 10MB)",
    "bad-file.exe: File type not allowed"
  ]
}
```

### File Metadata Endpoint

**GET** `/api/files/[id]/metadata`

Retrieves file metadata without downloading the actual file content.

#### Response

```typescript
interface FileMetadata {
  id: string;
  filename: string;
  contentType: string;
  fileSize: number;
  fileSizeFormatted: string;
  category: 'image' | 'document' | 'code' | 'other';
  isImage: boolean;
  isDocument: boolean;
  isCode: boolean;
  createdAt: Date;
  messageId?: string;
}
```

## Component Documentation

### FilePicker Component

A comprehensive file upload component with drag-and-drop support, validation, and progress tracking.

#### Props

```typescript
interface FilePickerProps {
  onFilesUploaded?: (fileIds: string[]) => void;
  messageId?: string;
  disabled?: boolean;
  className?: string;
}
```

#### Usage

```tsx
import { FilePicker } from '@/components/file-picker';

function ChatInput() {
  const handleFilesUploaded = (fileIds: string[]) => {
    // Add file references to message
    console.log('Uploaded files:', fileIds);
  };

  return (
    <FilePicker
      onFilesUploaded={handleFilesUploaded}
      messageId="current-message-id"
      disabled={false}
    />
  );
}
```

#### Features

- **Drag & Drop**: Full drag-and-drop support with visual feedback
- **File Validation**: Type and size validation with user feedback
- **Image Previews**: Automatic thumbnail generation for images
- **Progress Tracking**: Real-time upload progress with visual indicators
- **Multi-file Support**: Upload up to 5 files simultaneously
- **Error Handling**: Detailed error messages for validation failures

#### File Validation

```typescript
// Supported file types
const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/markdown', 'text/csv',
  // Code
  'text/javascript', 'application/json', 'text/html',
  'text/css', 'application/xml', 'text/xml',
];

// Limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_UPLOAD = 5;
```

### useFileUpload Hook

React hook for managing file upload state and operations.

#### Usage

```typescript
import { useFileUpload } from '@/hooks/use-file-upload';

function MyComponent() {
  const { upload, uploading, progress, error, clearError } = useFileUpload();

  const handleUpload = async (files: File[]) => {
    try {
      const result = await upload(files, 'optional-message-id');
      console.log('Upload result:', result);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div>
      {uploading && <div>Uploading: {progress}%</div>}
      {error && <div>Error: {error}</div>}
      <button onClick={() => clearError()}>Clear Error</button>
    </div>
  );
}
```

#### Return Type

```typescript
interface UseFileUploadResult {
  upload: (files: File[], messageId?: string) => Promise<FileUploadResponse>;
  uploading: boolean;
  progress: number;
  error: string | null;
  clearError: () => void;
}
```

### useFileMetadata Hook

Hook for fetching and caching file metadata.

#### Usage

```typescript
import { useFileMetadata } from '@/hooks/use-file-metadata';

function FileDisplay({ fileIds }: { fileIds: string[] }) {
  const { metadata, loading, error } = useFileMetadata(fileIds);

  return (
    <div>
      {fileIds.map(id => (
        <div key={id}>
          {loading[id] ? (
            <div>Loading...</div>
          ) : error[id] ? (
            <div>Error: {error[id]}</div>
          ) : metadata[id] ? (
            <div>
              <h3>{metadata[id].filename}</h3>
              <p>Size: {metadata[id].fileSizeFormatted}</p>
              <p>Type: {metadata[id].contentType}</p>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
```

## AI Tool Integration

### ReadFile Tool

The `readFile` tool enables AI models to access and analyze file content uploaded by users.

#### Tool Description

```typescript
export const readFileTool = tool({
  description: `Read the content of an attached file. ALWAYS use this tool when you see file references like "[File: filename] (ID: abc123)" in the user's message. Extract the file ID from the parentheses and use this tool to access the actual file content.`,
  parameters: z.object({
    fileId: z.string().describe("The ID of the file to read (found in parentheses like '(ID: abc123)' in file references)"),
  }),
  execute: async ({ fileId }) => {
    // Implementation details below
  },
});
```

#### Usage in Chat

When a user uploads a file, it appears in the chat as:
```
[File: document.pdf] (ID: 550e8400-e29b-41d4-a716-446655440000)
```

The AI model can use the readFile tool to access the content:

```typescript
// Tool call
{
  "tool": "readFile",
  "parameters": {
    "fileId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### Response Types

**Success Response (Text Files)**
```json
{
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "document.txt",
  "contentType": "text/plain",
  "size": 1024,
  "content": "File content goes here...",
  "message": "Successfully read file \"document.txt\" (text/plain, 1KB)"
}
```

**Error Response (Binary Files)**
```json
{
  "error": "Cannot read file content as text. This might be a binary file.",
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "image.jpg",
  "contentType": "image/jpeg",
  "size": 2048576,
  "message": "File \"image.jpg\" exists but cannot be read as text (image/jpeg, 2MB). This might be an image, PDF, or other binary file."
}
```

**Not Found Response**
```json
{
  "error": "File not found",
  "fileId": "invalid-file-id"
}
```

## Security Considerations

### File Validation

1. **Type Whitelist**: Only allowed MIME types are accepted
2. **Size Limits**: 10MB maximum per file, 5 files per upload
3. **Content Validation**: Server-side validation of file headers
4. **Filename Sanitization**: Special characters removed from filenames

### Access Control

1. **Authentication Required**: All endpoints require valid user session
2. **Owner Verification**: Users can only access files they uploaded
3. **Content Hash**: SHA-256 hashing for integrity and deduplication
4. **Path Security**: All files stored in controlled directory structure

### Storage Security

1. **Isolated Storage**: Files stored outside web-accessible directory
2. **Unique Filenames**: Timestamp + hash prevents filename collisions
3. **No Direct Access**: Files served only through authenticated endpoints
4. **Content-Type Headers**: Proper MIME types set for file serving

## Error Handling

### Client-Side Errors

```typescript
// File type validation
if (!isAllowedFileType(file.type)) {
  toast.error(`${file.name}: File type not supported`);
}

// Size validation
if (file.size > MAX_FILE_SIZE) {
  toast.error(`${file.name}: File too large (max 10MB)`);
}

// Upload limit
if (selectedFiles.length >= MAX_FILES_PER_UPLOAD) {
  toast.error(`Maximum ${MAX_FILES_PER_UPLOAD} files allowed`);
}
```

### Server-Side Errors

```typescript
// Authentication
if (!session?.user?.id) {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}

// File processing errors
try {
  await writeFile(fullPath, buffer);
} catch (error) {
  console.error('File write error:', error);
  errors.push(`${file.name}: Storage failed`);
}
```

## Integration Examples

### Adding Files to Chat Messages

```typescript
// In chat component
const [attachedFiles, setAttachedFiles] = useState<string[]>([]);

const handleFilesUploaded = (fileIds: string[]) => {
  setAttachedFiles(prev => [...prev, ...fileIds]);
  
  // Add file references to message
  const fileRefs = fileIds.map(id => `[File: ${filename}] (ID: ${id})`).join('\n');
  setInput(prev => prev + '\n' + fileRefs);
};

return (
  <div>
    <FilePicker 
      onFilesUploaded={handleFilesUploaded}
      messageId={currentMessageId}
    />
  </div>
);
```

### Displaying File Attachments

```typescript
// Extract file IDs from message content
const extractFileIds = (content: string): string[] => {
  const matches = content.match(/\(ID: ([^)]+)\)/g);
  return matches ? matches.map(m => m.slice(5, -1)) : [];
};

// Display files in message
function MessageFiles({ content }: { content: string }) {
  const fileIds = extractFileIds(content);
  const { metadata } = useFileMetadata(fileIds);

  return (
    <div className="flex gap-2 mt-2">
      {fileIds.map(id => {
        const file = metadata[id];
        return file ? (
          <div key={id} className="border rounded p-2">
            <FileIcon className="size-4" />
            <span className="text-sm">{file.filename}</span>
            <span className="text-xs text-gray-500">{file.fileSizeFormatted}</span>
          </div>
        ) : null;
      })}
    </div>
  );
}
```

## Performance Considerations

### Deduplication

Files are deduplicated using SHA-256 content hashes:

```typescript
// Generate content hash
const buffer = Buffer.from(await file.arrayBuffer());
const contentHash = createHash('sha256').update(buffer).digest('hex');

// Check for existing file
const existingFile = await db
  .select()
  .from(FileAttachmentSchema)
  .where(eq(FileAttachmentSchema.contentHash, contentHash))
  .limit(1);

if (existingFile.length > 0) {
  // Use existing file record instead of storing duplicate
  fileRecord = existingFile[0];
}
```

### Caching

- File metadata is cached in React state
- Database queries use indexes on frequently accessed columns
- Content hash enables efficient duplicate detection

### Optimization Opportunities

1. **CDN Integration**: Move file storage to cloud CDN
2. **Image Processing**: Generate thumbnails for images
3. **Compression**: Compress large text files before storage
4. **Streaming**: Stream large files instead of loading into memory

## Testing

### Unit Tests

```typescript
// File validation tests
describe('isAllowedFileType', () => {
  test('allows PDF files', () => {
    expect(isAllowedFileType('application/pdf')).toBe(true);
  });

  test('rejects executable files', () => {
    expect(isAllowedFileType('application/x-executable')).toBe(false);
  });
});

// File size formatting tests
describe('formatFileSize', () => {
  test('formats bytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
  });
});
```

### Integration Tests

```typescript
// API endpoint tests
describe('/api/files/upload', () => {
  test('uploads valid file successfully', async () => {
    const formData = new FormData();
    formData.append('files', validFile);

    const response = await request(app)
      .post('/api/files/upload')
      .send(formData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.files).toHaveLength(1);
  });

  test('rejects oversized files', async () => {
    const formData = new FormData();
    formData.append('files', oversizedFile);

    const response = await request(app)
      .post('/api/files/upload')
      .send(formData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('too large');
  });
});
```

## Future Enhancements

### Planned Features

1. **File Previews**: In-chat file preview for images and PDFs
2. **Batch Operations**: Bulk file management interface
3. **Version Control**: File versioning and history tracking
4. **Sharing**: File sharing between users
5. **Search**: Full-text search across uploaded files

### Cloud Storage Migration

```typescript
// Example S3 integration
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const uploadToS3 = async (buffer: Buffer, key: string) => {
  const client = new S3Client({});
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: buffer,
  });
  
  await client.send(command);
  return `s3://${process.env.S3_BUCKET}/${key}`;
};
```

### Advanced AI Integration

```typescript
// OCR for images
const extractTextFromImage = async (imagePath: string) => {
  const ocrResult = await performOCR(imagePath);
  return ocrResult.text;
};

// PDF text extraction
const extractTextFromPDF = async (pdfPath: string) => {
  const pdfResult = await extractPDFText(pdfPath);
  return pdfResult.text;
};
```

## Troubleshooting

### Common Issues

**Files not uploading**
- Check file size limits (10MB max)
- Verify file type is supported
- Ensure user is authenticated
- Check disk space on server

**File content not readable**
- Binary files cannot be read as text
- Use appropriate tools for PDF/image analysis
- Check file permissions and path

**Upload timeout**
- Increase server timeout settings
- Check network connectivity
- Reduce file sizes or batch count

### Debug Information

```typescript
// Enable detailed logging
console.log('Upload attempt:', {
  fileCount: files.length,
  totalSize: files.reduce((sum, f) => sum + f.size, 0),
  types: files.map(f => f.type),
  userId: session.user.id,
});
```

## Configuration

### Environment Variables

```bash
# Storage configuration
MAX_FILE_SIZE=10485760  # 10MB in bytes
MAX_FILES_PER_UPLOAD=5
UPLOAD_DIR=uploads

# Security
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf,text/plain
FILE_SCAN_ENABLED=false  # Future malware scanning

# Cloud storage (optional)
AWS_S3_BUCKET=my-chatbot-files
AWS_REGION=us-east-1
```

### Database Configuration

```sql
-- Increase max file size if needed
ALTER TABLE file_attachment ALTER COLUMN file_size TYPE BIGINT;

-- Add additional indexes for performance
CREATE INDEX file_attachment_created_at_idx ON file_attachment(created_at DESC);
CREATE INDEX file_attachment_content_type_idx ON file_attachment(content_type);
```

This comprehensive documentation covers all aspects of the file attachment system, providing developers with the information needed to understand, use, extend, and troubleshoot the implementation.