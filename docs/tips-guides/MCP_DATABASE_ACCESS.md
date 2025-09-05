# MCP Server Database Access Schema

## 🔐 Architecture d'accès sécurisé

### 1. Configuration des variables d'environnement

```env
# Variables existantes pour la DB principale
POSTGRES_URL=postgres://username:password@localhost:5432/better_chatbot

# Variables spécifiques pour MCP avec accès limité
MCP_DB_HOST=localhost
MCP_DB_PORT=5432
MCP_DB_NAME=better_chatbot
MCP_DB_USER=mcp_service_user
MCP_DB_PASSWORD=secure_mcp_password_here
MCP_DB_SSL=false

# Configuration MCP Server
MCP_SERVER_NAME=database-assistant
MCP_SERVER_ENABLED=true
```

### 2. Création d'un utilisateur PostgreSQL dédié

```sql
-- Créer un utilisateur spécifique pour MCP avec des permissions limitées
CREATE USER mcp_service_user WITH PASSWORD 'secure_mcp_password_here';

-- Accorder les permissions minimales nécessaires
GRANT CONNECT ON DATABASE better_chatbot TO mcp_service_user;
GRANT USAGE ON SCHEMA public TO mcp_service_user;

-- Permissions spécifiques par table
-- Lecture seule sur la plupart des tables
GRANT SELECT ON chat_thread TO mcp_service_user;
GRANT SELECT ON chat_message TO mcp_service_user;
GRANT SELECT ON agent TO mcp_service_user;
GRANT SELECT ON workflow TO mcp_service_user;
GRANT SELECT ON file_attachment TO mcp_service_user;

-- Lecture/écriture pour les sauvegardes et archives
GRANT SELECT, INSERT, UPDATE ON archive TO mcp_service_user;
GRANT SELECT, INSERT, UPDATE ON archive_item TO mcp_service_user;

-- Permissions pour les séquences (pour les insertions)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO mcp_service_user;
```

## 📊 Schéma pour ajouter des colonnes aux sauvegardes

### Structure actuelle de la table Archive

```typescript
// Tables existantes dans schema.pg.ts
export const ArchiveSchema = pgTable("archive", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const ArchiveItemSchema = pgTable("archive_item", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  archiveId: uuid("archive_id")
    .notNull()
    .references(() => ArchiveSchema.id, { onDelete: "cascade" }),
  itemId: uuid("item_id").notNull(),
  itemType: varchar("item_type", {
    enum: ["agent", "workflow", "thread"],
  }).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
```

### Migration pour ajouter des colonnes MCP

```sql
-- Migration: Add MCP metadata columns to archive tables
-- File: src/lib/db/migrations/pg/0014_mcp_archive_metadata.sql

-- Ajouter des colonnes pour le tracking MCP
ALTER TABLE archive ADD COLUMN IF NOT EXISTS mcp_metadata json;
ALTER TABLE archive ADD COLUMN IF NOT EXISTS mcp_server_id uuid REFERENCES mcp_server(id);
ALTER TABLE archive ADD COLUMN IF NOT EXISTS export_format varchar(50);
ALTER TABLE archive ADD COLUMN IF NOT EXISTS storage_location text;
ALTER TABLE archive ADD COLUMN IF NOT EXISTS file_size bigint;

-- Ajouter des colonnes pour l'analyse MCP
ALTER TABLE archive_item ADD COLUMN IF NOT EXISTS mcp_analysis json;
ALTER TABLE archive_item ADD COLUMN IF NOT EXISTS tokens_count integer;
ALTER TABLE archive_item ADD COLUMN IF NOT EXISTS content_summary text;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_archive_mcp_server_id ON archive(mcp_server_id);
CREATE INDEX IF NOT EXISTS idx_archive_export_format ON archive(export_format);
```

## 🔧 Service d'accès MCP à la DB

### Structure du service MCP Database

```typescript
// src/lib/mcp/database-service.ts

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { ArchiveSchema, ArchiveItemSchema, ChatThreadSchema, ChatMessageSchema } from '@/lib/db/pg/schema.pg';
import { eq, and, desc } from 'drizzle-orm';

// Configuration de connexion séparée pour MCP
const mcpDbConfig = {
  host: process.env.MCP_DB_HOST || 'localhost',
  port: parseInt(process.env.MCP_DB_PORT || '5432'),
  database: process.env.MCP_DB_NAME || 'better_chatbot',
  username: process.env.MCP_DB_USER || 'mcp_service_user',
  password: process.env.MCP_DB_PASSWORD || '',
  ssl: process.env.MCP_DB_SSL === 'true',
};

// Connexion dédiée pour MCP
const mcpSql = postgres(mcpDbConfig);
export const mcpDb = drizzle(mcpSql);

export class MCPDatabaseService {
  // Lire les conversations archivées
  async getArchivedConversations(userId: string) {
    return await mcpDb
      .select()
      .from(ArchiveSchema)
      .where(eq(ArchiveSchema.userId, userId))
      .orderBy(desc(ArchiveSchema.createdAt));
  }

  // Créer une nouvelle archive avec métadonnées MCP
  async createArchiveWithMCPData(data: {
    name: string;
    description?: string;
    userId: string;
    mcpMetadata?: any;
    mcpServerId?: string;
    exportFormat?: string;
    storageLocation?: string;
    fileSize?: number;
  }) {
    return await mcpDb
      .insert(ArchiveSchema)
      .values({
        ...data,
        mcpMetadata: data.mcpMetadata ? JSON.stringify(data.mcpMetadata) : null,
      })
      .returning();
  }

  // Ajouter des éléments analysés à une archive
  async addAnalyzedArchiveItems(items: Array<{
    archiveId: string;
    itemId: string;
    itemType: 'agent' | 'workflow' | 'thread';
    metadata?: any;
    mcpAnalysis?: any;
    tokensCount?: number;
    contentSummary?: string;
  }>) {
    return await mcpDb
      .insert(ArchiveItemSchema)
      .values(items.map(item => ({
        ...item,
        metadata: item.metadata ? JSON.stringify(item.metadata) : null,
        mcpAnalysis: item.mcpAnalysis ? JSON.stringify(item.mcpAnalysis) : null,
      })))
      .returning();
  }

  // Analyser et résumer des conversations
  async analyzeConversation(threadId: string) {
    const messages = await mcpDb
      .select()
      .from(ChatMessageSchema)
      .where(eq(ChatMessageSchema.threadId, threadId))
      .orderBy(ChatMessageSchema.createdAt);

    // Analyse et calcul des tokens
    const analysis = {
      messageCount: messages.length,
      totalTokens: 0, // À calculer avec tiktoken ou similaire
      participants: [...new Set(messages.map(m => m.role))],
      firstMessage: messages[0]?.createdAt,
      lastMessage: messages[messages.length - 1]?.createdAt,
    };

    return analysis;
  }
}
```

## 🎯 Intégration MCP Server

### Configuration MCP Server pour Database Assistant

```typescript
// src/lib/mcp/servers/database-assistant.ts

export const databaseAssistantMCPConfig = {
  name: "database-assistant",
  description: "MCP server for database operations and conversation archiving",
  config: {
    command: "node",
    args: ["./mcp-servers/database-assistant/index.js"],
    env: {
      MCP_DB_HOST: process.env.MCP_DB_HOST,
      MCP_DB_PORT: process.env.MCP_DB_PORT,
      MCP_DB_NAME: process.env.MCP_DB_NAME,
      MCP_DB_USER: process.env.MCP_DB_USER,
      MCP_DB_PASSWORD: process.env.MCP_DB_PASSWORD,
    }
  },
  tools: [
    {
      name: "archive_conversation",
      description: "Archive a conversation with analysis",
      inputSchema: {
        type: "object",
        properties: {
          threadId: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          exportFormat: { 
            type: "string", 
            enum: ["json", "markdown", "pdf"] 
          },
        },
        required: ["threadId", "name"],
      },
    },
    {
      name: "search_archives",
      description: "Search through archived conversations",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          userId: { type: "string" },
          limit: { type: "number", default: 10 },
        },
        required: ["query"],
      },
    },
    {
      name: "analyze_conversation_patterns",
      description: "Analyze patterns in conversations",
      inputSchema: {
        type: "object",
        properties: {
          timeRange: { 
            type: "object",
            properties: {
              start: { type: "string", format: "date-time" },
              end: { type: "string", format: "date-time" },
            }
          },
          userId: { type: "string" },
        },
      },
    },
  ],
};
```

## 🛡️ Sécurité et bonnes pratiques

### 1. Isolation des permissions
- Utilisateur DB dédié avec permissions minimales
- Pas d'accès direct aux tables sensibles (user, session)
- Lecture seule sur la plupart des tables

### 2. Validation des données
```typescript
// Validation avec Zod avant insertion
import { z } from 'zod';

const ArchiveInsertSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  userId: z.string().uuid(),
  mcpMetadata: z.record(z.unknown()).optional(),
  exportFormat: z.enum(['json', 'markdown', 'pdf']).optional(),
});

// Utiliser avant toute insertion
const validatedData = ArchiveInsertSchema.parse(inputData);
```

### 3. Audit et logging
```typescript
// Logger toutes les opérations MCP sur la DB
import { logger } from '@/lib/logger';

export function logMCPDatabaseOperation(operation: string, details: any) {
  logger.info('MCP Database Operation', {
    operation,
    timestamp: new Date().toISOString(),
    mcpServer: process.env.MCP_SERVER_NAME,
    ...details,
  });
}
```

## 📝 Migration Drizzle Kit

Pour appliquer les changements :

```bash
# Générer la migration
pnpm db:generate

# Appliquer la migration
pnpm db:push

# Vérifier le statut
pnpm db:status
```

## 🚀 Utilisation dans le code

```typescript
// Exemple d'utilisation du service MCP Database
import { MCPDatabaseService } from '@/lib/mcp/database-service';

const mcpDbService = new MCPDatabaseService();

// Archiver une conversation avec analyse MCP
async function archiveWithMCP(threadId: string, userId: string) {
  // Analyser la conversation
  const analysis = await mcpDbService.analyzeConversation(threadId);
  
  // Créer l'archive avec métadonnées
  const archive = await mcpDbService.createArchiveWithMCPData({
    name: `Archive ${new Date().toISOString()}`,
    description: 'Archived via MCP',
    userId,
    mcpMetadata: analysis,
    exportFormat: 'json',
    fileSize: JSON.stringify(analysis).length,
  });
  
  return archive;
}
```

## 🔄 Synchronisation avec MCP

Le MCP server peut maintenant :
1. Lire les conversations et archives existantes
2. Créer de nouvelles archives avec métadonnées enrichies
3. Analyser les patterns de conversation
4. Exporter dans différents formats
5. Maintenir un historique d'analyse

Cette architecture permet une séparation claire entre l'application principale et les services MCP tout en maintenant la sécurité et l'intégrité des données.