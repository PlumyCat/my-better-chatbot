-- Migration: Add artifacts table for Claude-style artifacts
-- This migration creates the artifacts table with versioning support

-- Create artifacts table
CREATE TABLE IF NOT EXISTS "artifacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" varchar(255) NOT NULL,
  "message_id" varchar(255) NOT NULL,
  "identifier" varchar(255) NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "type" varchar(100) NOT NULL,
  "title" varchar(500),
  "language" varchar(50),
  "content" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index on (conversation_id, identifier, version)
CREATE UNIQUE INDEX IF NOT EXISTS "idx_artifacts_conversation_identifier_version" 
  ON "artifacts"("conversation_id", "identifier", "version");

-- Create index for querying latest versions
CREATE INDEX IF NOT EXISTS "idx_artifacts_conversation_identifier" 
  ON "artifacts"("conversation_id", "identifier");

-- Create index for message lookups
CREATE INDEX IF NOT EXISTS "idx_artifacts_message_id" 
  ON "artifacts"("message_id");

-- Create index for type filtering
CREATE INDEX IF NOT EXISTS "idx_artifacts_type" 
  ON "artifacts"("type");

-- Create index for created_at for ordering
CREATE INDEX IF NOT EXISTS "idx_artifacts_created_at" 
  ON "artifacts"("created_at");

-- Add foreign key constraint to chat_thread table (conversation_id references chat_thread.id)
ALTER TABLE "artifacts" 
  ADD CONSTRAINT "artifacts_conversation_id_fkey" 
  FOREIGN KEY ("conversation_id") 
  REFERENCES "chat_thread"("id") 
  ON DELETE CASCADE;

-- Add constraints
ALTER TABLE "artifacts" 
  ADD CONSTRAINT "artifacts_version_positive" 
  CHECK ("version" > 0);

ALTER TABLE "artifacts" 
  ADD CONSTRAINT "artifacts_type_valid" 
  CHECK ("type" IN ('text/html', 'image/svg+xml', 'application/.artifacts.mermaid', 'application/.artifacts.code'));

-- Add comments to document the schema
COMMENT ON TABLE "artifacts" IS 'Stores Claude-style artifacts with versioning support';
COMMENT ON COLUMN "artifacts"."id" IS 'Unique identifier for each artifact';
COMMENT ON COLUMN "artifacts"."conversation_id" IS 'References the thread/conversation this artifact belongs to';
COMMENT ON COLUMN "artifacts"."message_id" IS 'ID of the message that contains this artifact';
COMMENT ON COLUMN "artifacts"."identifier" IS 'User-defined identifier for the artifact (e.g., "my-component")';
COMMENT ON COLUMN "artifacts"."version" IS 'Version number for this artifact identifier, increments on updates';
COMMENT ON COLUMN "artifacts"."type" IS 'MIME type of the artifact content';
COMMENT ON COLUMN "artifacts"."title" IS 'Optional human-readable title for the artifact';
COMMENT ON COLUMN "artifacts"."language" IS 'Programming language for code artifacts';
COMMENT ON COLUMN "artifacts"."content" IS 'The actual artifact content';
COMMENT ON COLUMN "artifacts"."created_at" IS 'When this artifact version was created';
COMMENT ON COLUMN "artifacts"."updated_at" IS 'When this artifact record was last updated';