# Plan d'Implémentation Sécurisée - File Attachments

## ⚠️ RÈGLES ABSOLUES

1. **NE JAMAIS** modifier le middleware existant
2. **NE JAMAIS** toucher aux tables users, sessions, chat_messages existantes  
3. **NE JAMAIS** modifier le système Better Auth
4. **TOUJOURS** tester chaque étape isolément
5. **TOUJOURS** garder un plan de rollback

## Composants Sauvegardés

Les composants fonctionnels sont dans `/backup-file-upload/`:
- `file-aware-prompt-input.tsx` - Input principal avec upload
- `use-file-upload.ts` - Hook pour gérer les uploads  
- `file-attachment.ts` - Types TypeScript
- `file-utils.ts` - Utilitaires pour fichiers
- `api/files/` - API endpoints

## Phase 1: Préparation Base de Données

### Créer UNE SEULE nouvelle table

```sql
-- Migration: 001_add_file_attachments.sql
CREATE TABLE file_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path VARCHAR(255) NOT NULL,
  content_hash VARCHAR(64), -- SHA-256 pour déduplication
  uploaded_by VARCHAR(255) NOT NULL, -- référence user.id existant (pas FK!)
  uploaded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_file_attachments_uploaded_by ON file_attachments(uploaded_by);
CREATE INDEX idx_file_attachments_content_hash ON file_attachments(content_hash);
```

### Variables d'environnement

Ajouter à `.env` SANS toucher aux autres:

```env
# File Attachments - NOUVELLES VARIABLES UNIQUEMENT
ENABLE_FILE_ATTACHMENTS=true
MAX_FILE_SIZE=10MB
MAX_FILES_PER_MESSAGE=5
FILE_STORAGE_PATH=./uploads
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,text/plain
```

## Phase 2: API Backend Isolée

### Structure des routes

```
src/app/api/files/
├── upload/
│   └── route.ts          # POST /api/files/upload
├── [id]/
│   └── route.ts          # GET /api/files/[id]
└── [id]/
    └── metadata/
        └── route.ts      # GET /api/files/[id]/metadata
```

### Implementation upload route

```typescript
// src/app/api/files/upload/route.ts
import { NextRequest } from "next/server";
import { auth } from "lib/auth/server";

export async function POST(req: NextRequest) {
  // Utiliser l'auth EXISTANTE
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Process upload...
  // Utiliser session.user.id pour uploaded_by
  // Sauvegarder en DB avec query simple
  
  return Response.json({ success: true, files: [] });
}
```

### Tester l'API isolément

```bash
# Test 1: Upload sans auth -> 401
curl -X POST http://localhost:3001/api/files/upload

# Test 2: Upload avec auth -> 200  
# (utiliser browser devtools pour récupérer cookies/headers)
```

## Phase 3: Frontend Isolé

### Hook useFileUpload

```typescript
// src/hooks/use-file-upload.ts
import { useState, useCallback } from 'react';

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  
  const upload = useCallback(async (files: File[]) => {
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      return await response.json();
    } finally {
      setUploading(false);
    }
  }, []);
  
  return { upload, uploading };
}
```

### Page de test isolée

```typescript
// src/app/test-upload/page.tsx
'use client';

import { useFileUpload } from 'hooks/use-file-upload';

export default function TestUploadPage() {
  const { upload, uploading } = useFileUpload();
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      try {
        const result = await upload(files);
        console.log('Upload result:', result);
      } catch (error) {
        console.error('Upload error:', error);
      }
    }
  };
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Upload Isolé</h1>
      <input 
        type="file" 
        multiple 
        onChange={handleFileChange}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

## Phase 4: Tests de Non-Régression

### Tests critiques AVANT intégration

1. **Auth toujours fonctionnel**
   - Login/logout OK
   - Sessions persistantes
   - Redirections OK

2. **Chat existant toujours fonctionnel**
   - Envoi messages
   - Historique
   - Streaming responses

3. **Performance pas dégradée**
   - Pages se chargent normalement
   - Pas d'erreurs console
   - DB queries normales

## Rollback Emergency

### Si quelque chose casse

```sql
-- Rollback DB
DROP TABLE IF EXISTS file_attachments;
```

```env
# Rollback env
ENABLE_FILE_ATTACHMENTS=false
```

```bash
# Rollback fichiers
rm -rf src/app/api/files/
rm -rf src/components/file-attachments/
rm src/hooks/use-file-upload.ts
```

## Points de Validation

### ✅ Validation Phase 1
- [ ] Migration DB appliquée sans erreur
- [ ] App démarre normalement  
- [ ] Login/chat fonctionnent normalement

### ✅ Validation Phase 2  
- [ ] API /api/files/upload retourne 401 sans auth
- [ ] API /api/files/upload retourne 200 avec auth
- [ ] Fichiers sauvegardés en DB et filesystem

### ✅ Validation Phase 3
- [ ] Page /test-upload accessible
- [ ] Upload files fonctionne via UI
- [ ] Pas d'erreurs console

---

## Résumé

**Règle d'or: Si ça marche, ne le touche pas. Ajouter sans casser.**

Intégration progressive, isolation complète, tests à chaque étape, rollback plan toujours prêt.

---

# ANCIEN - Documentation d'implémentation cassée

## Implementation Summary

The file attachments system has been fully implemented with a comprehensive backend architecture that provides secure, scalable, and efficient file management capabilities.

**⚠️ ATTENTION: Cette implémentation a causé des problèmes avec l'auth existante. Voir le nouveau plan ci-dessus.**

## Completed Components

### ✅ Database Schema & Types
- **Database Tables**: Created `file_attachment` and `message_attachment` schemas
- **TypeScript Types**: Complete type definitions in `/src/types/file-attachment.ts`
- **Entity Mappings**: Proper Drizzle ORM schema mappings with indexes and constraints

### ✅ Storage Layer Architecture
- **Storage Service**: Implemented `FileStorageService` interface with filesystem backend
- **Content Deduplication**: SHA-256 based deduplication system
- **Secure Path Generation**: Date-based directory structure with hash prefixes
- **Stream Support**: Efficient streaming for large file handling

### ✅ Repository Layer
- **FileAttachmentRepository**: Complete CRUD operations with PostgreSQL implementation
- **Message Associations**: Junction table management for message-attachment relationships
- **Cleanup Operations**: Orphaned file detection and cleanup capabilities

### ✅ API Endpoints
- **POST /api/files/upload**: Multi-file upload with validation and deduplication
- **GET /api/files/[id]**: Secure file retrieval with caching and ETag support
- **GET /api/files/metadata/[id]**: Metadata-only endpoint for UI components
- **Message Attachment APIs**: Complete CRUD for message-attachment relationships
- **Admin APIs**: Comprehensive admin management endpoints

### ✅ Integration Points
- **Chat System Extension**: Extended ChatMessage types and repository methods
- **Authentication Integration**: Secure access control using existing auth system
- **Database Migration**: Complete migration script for schema creation

### ✅ Management & Monitoring
- **Cleanup Service**: Automated orphaned file cleanup with configurable retention
- **Configuration System**: Comprehensive environment-based configuration
- **Admin Dashboard APIs**: Statistics, monitoring, and maintenance endpoints
- **File Integrity Verification**: System to verify storage consistency

### ✅ Security & Validation
- **File Type Validation**: Configurable MIME type allowlist (40+ supported types)
- **Size Limits**: Configurable file and storage limits with user quotas
- **Filename Sanitization**: Automatic sanitization of dangerous characters
- **Content Integrity**: SHA-256 hash verification and deduplication
- **Access Control**: User-based ownership and authentication requirements

## Key Features Delivered

1. **Multi-file Upload**: Support for up to 10 files per upload with 100MB per file limit
2. **Content-based Deduplication**: Automatic deduplication using SHA-256 hashing
3. **Secure File Access**: Authentication-based access control with proper headers
4. **Storage Abstraction**: Pluggable storage backends (filesystem implemented, cloud-ready)
5. **Message Integration**: Seamless attachment to chat messages with junction table
6. **Automated Cleanup**: Configurable cleanup of orphaned files (7+ days old)
7. **Admin Management**: Complete admin APIs for monitoring and maintenance
8. **Performance Optimization**: Streaming, caching, and efficient database queries

## File Structure Created

```
src/
├── types/file-attachment.ts                    # Type definitions
├── lib/
│   ├── storage/file-storage.service.ts         # Storage service implementation
│   ├── services/file-cleanup.service.ts        # Cleanup and maintenance
│   ├── config/file-attachment.config.ts        # Configuration management
│   └── db/
│       ├── pg/
│       │   ├── schema.pg.ts                    # Database schema (updated)
│       │   └── repositories/
│       │       └── file-attachment-repository.pg.ts  # Repository implementation
│       └── migrations/pg/
│           └── 0013_file_attachments.sql       # Database migration
└── app/api/
    ├── files/
    │   ├── upload/route.ts                     # File upload endpoint
    │   ├── [id]/route.ts                       # File retrieval endpoint
    │   └── metadata/[id]/route.ts              # Metadata endpoint
    ├── messages/[messageId]/attachments/route.ts  # Message attachment management
    └── admin/files/route.ts                    # Admin management API
```

## Configuration Files
- `.env.file-attachments.example` - Environment configuration template
- `FILE_ATTACHMENTS_README.md` - Comprehensive documentation

## Next Steps for Frontend Integration

1. **Update Chat UI Components** to display file attachments
2. **Add File Upload Components** with drag-and-drop support  
3. **Integrate with Message Creation** to attach files to new messages
4. **Add File Preview Components** for different file types
5. **Create Admin Dashboard** for file management (optional)

## Technical Specifications Met

- ✅ **Scalability**: Designed for cloud migration and high-volume usage
- ✅ **Security**: Comprehensive security measures and access controls
- ✅ **Performance**: Optimized queries, streaming, and deduplication
- ✅ **Maintainability**: Clean architecture with proper separation of concerns
- ✅ **Reliability**: Transaction safety, error handling, and data integrity
- ✅ **Monitoring**: Complete admin APIs and statistics collection

The file attachments system is now ready for production use and frontend integration. All backend components are implemented following the project's established patterns and best practices.