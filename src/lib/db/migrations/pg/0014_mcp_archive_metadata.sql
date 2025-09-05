-- Migration: Add MCP metadata columns to archive tables
-- This migration adds support for MCP server integration with archive functionality

-- Add columns to archive table for MCP tracking
ALTER TABLE "archive" ADD COLUMN IF NOT EXISTS "mcp_metadata" json;
ALTER TABLE "archive" ADD COLUMN IF NOT EXISTS "mcp_server_id" uuid;
ALTER TABLE "archive" ADD COLUMN IF NOT EXISTS "export_format" varchar(50);
ALTER TABLE "archive" ADD COLUMN IF NOT EXISTS "storage_location" text;
ALTER TABLE "archive" ADD COLUMN IF NOT EXISTS "file_size" bigint;

-- Add foreign key constraint for mcp_server_id
ALTER TABLE "archive" 
  ADD CONSTRAINT "archive_mcp_server_id_fkey" 
  FOREIGN KEY ("mcp_server_id") 
  REFERENCES "mcp_server"("id") 
  ON DELETE SET NULL;

-- Add columns to archive_item table for MCP analysis
ALTER TABLE "archive_item" ADD COLUMN IF NOT EXISTS "mcp_analysis" json;
ALTER TABLE "archive_item" ADD COLUMN IF NOT EXISTS "tokens_count" integer;
ALTER TABLE "archive_item" ADD COLUMN IF NOT EXISTS "content_summary" text;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_archive_mcp_server_id" ON "archive"("mcp_server_id");
CREATE INDEX IF NOT EXISTS "idx_archive_export_format" ON "archive"("export_format");
CREATE INDEX IF NOT EXISTS "idx_archive_storage_location" ON "archive"("storage_location");

-- Add comment to document the purpose
COMMENT ON COLUMN "archive"."mcp_metadata" IS 'Metadata from MCP server analysis including tokens, patterns, and insights';
COMMENT ON COLUMN "archive"."mcp_server_id" IS 'Reference to the MCP server that created or processed this archive';
COMMENT ON COLUMN "archive"."export_format" IS 'Format of the exported archive (json, markdown, pdf, etc)';
COMMENT ON COLUMN "archive"."storage_location" IS 'Path or URL where the exported archive is stored';
COMMENT ON COLUMN "archive"."file_size" IS 'Size of the exported archive file in bytes';

COMMENT ON COLUMN "archive_item"."mcp_analysis" IS 'Analysis results from MCP server including summaries and insights';
COMMENT ON COLUMN "archive_item"."tokens_count" IS 'Number of tokens in the archived item content';
COMMENT ON COLUMN "archive_item"."content_summary" IS 'AI-generated summary of the archived item content';