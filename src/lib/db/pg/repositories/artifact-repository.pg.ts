import { ArtifactSchema, type ArtifactEntity } from "../schema.pg";
import { eq, desc, and, max } from "drizzle-orm";
import { pgDb as db } from "../db.pg";

export interface ArtifactCreateInput {
  conversationId: string;
  messageId: string;
  identifier: string;
  type: string;
  title?: string;
  language?: string;
  content: string;
}

export interface ArtifactUpdateInput {
  title?: string;
  language?: string;
  content: string;
}

export interface ArtifactVersionInfo {
  identifier: string;
  latestVersion: number;
  type: string;
  title?: string;
  createdAt: Date;
}

export class ArtifactRepository {
  constructor(private readonly db: any) {}

  /**
   * Create a new artifact or increment version if identifier exists
   */
  async create(input: ArtifactCreateInput): Promise<ArtifactEntity> {
    // Check if artifact with this identifier already exists
    const latestVersionQuery = await this.db
      .select({ version: max(ArtifactSchema.version) })
      .from(ArtifactSchema)
      .where(
        and(
          eq(ArtifactSchema.conversationId, input.conversationId),
          eq(ArtifactSchema.identifier, input.identifier),
        ),
      );

    const latestVersion = latestVersionQuery[0]?.version || 0;
    const newVersion = latestVersion + 1;

    const [artifact] = await this.db
      .insert(ArtifactSchema)
      .values({
        ...input,
        version: newVersion,
      })
      .returning();

    return artifact;
  }

  /**
   * Get artifact by conversation, identifier, and optionally version
   */
  async getByIdentifier(
    conversationId: string,
    identifier: string,
    version?: number,
  ): Promise<ArtifactEntity | null> {
    const query = this.db
      .select()
      .from(ArtifactSchema)
      .where(
        and(
          eq(ArtifactSchema.conversationId, conversationId),
          eq(ArtifactSchema.identifier, identifier),
        ),
      );

    if (version) {
      const results = await query
        .where(eq(ArtifactSchema.version, version))
        .limit(1);
      return results[0] || null;
    } else {
      const results = await query
        .orderBy(desc(ArtifactSchema.version))
        .limit(1);
      return results[0] || null;
    }
  }

  /**
   * Get all versions of an artifact by identifier
   */
  async getAllVersions(
    conversationId: string,
    identifier: string,
  ): Promise<ArtifactEntity[]> {
    return await this.db
      .select()
      .from(ArtifactSchema)
      .where(
        and(
          eq(ArtifactSchema.conversationId, conversationId),
          eq(ArtifactSchema.identifier, identifier),
        ),
      )
      .orderBy(desc(ArtifactSchema.version));
  }

  /**
   * List all artifacts in a conversation with their latest versions
   */
  async listByConversation(
    conversationId: string,
  ): Promise<ArtifactVersionInfo[]> {
    const latestVersions = this.db
      .select({
        identifier: ArtifactSchema.identifier,
        maxVersion: max(ArtifactSchema.version).as("max_version"),
      })
      .from(ArtifactSchema)
      .where(eq(ArtifactSchema.conversationId, conversationId))
      .groupBy(ArtifactSchema.identifier)
      .as("latest_versions");

    const results = await this.db
      .select({
        identifier: ArtifactSchema.identifier,
        latestVersion: ArtifactSchema.version,
        type: ArtifactSchema.type,
        title: ArtifactSchema.title,
        createdAt: ArtifactSchema.createdAt,
      })
      .from(ArtifactSchema)
      .innerJoin(
        latestVersions,
        and(
          eq(ArtifactSchema.identifier, latestVersions.identifier),
          eq(ArtifactSchema.version, latestVersions.maxVersion),
        ),
      )
      .where(eq(ArtifactSchema.conversationId, conversationId))
      .orderBy(desc(ArtifactSchema.createdAt));

    return results.map((row) => ({
      identifier: row.identifier,
      latestVersion: row.latestVersion,
      type: row.type,
      title: row.title || undefined,
      createdAt: row.createdAt,
    }));
  }

  /**
   * Get artifacts by message ID
   */
  async getByMessageId(messageId: string): Promise<ArtifactEntity[]> {
    return await this.db
      .select()
      .from(ArtifactSchema)
      .where(eq(ArtifactSchema.messageId, messageId))
      .orderBy(desc(ArtifactSchema.createdAt));
  }

  /**
   * Get artifact by ID
   */
  async getById(id: string): Promise<ArtifactEntity | null> {
    const results = await this.db
      .select()
      .from(ArtifactSchema)
      .where(eq(ArtifactSchema.id, id))
      .limit(1);

    return results[0] || null;
  }

  /**
   * Delete an artifact by ID
   */
  async deleteById(id: string): Promise<boolean> {
    const result = await this.db
      .delete(ArtifactSchema)
      .where(eq(ArtifactSchema.id, id));

    return result.length > 0;
  }

  /**
   * Delete all artifacts in a conversation
   */
  async deleteByConversation(conversationId: string): Promise<number> {
    const result = await this.db
      .delete(ArtifactSchema)
      .where(eq(ArtifactSchema.conversationId, conversationId));

    return result.length;
  }

  /**
   * Get latest version number for an identifier
   */
  async getLatestVersion(
    conversationId: string,
    identifier: string,
  ): Promise<number> {
    const result = await this.db
      .select({ version: max(ArtifactSchema.version) })
      .from(ArtifactSchema)
      .where(
        and(
          eq(ArtifactSchema.conversationId, conversationId),
          eq(ArtifactSchema.identifier, identifier),
        ),
      );

    return result[0]?.version || 0;
  }
}

// Create repository instance
export const pgArtifactRepository = new ArtifactRepository(db);
