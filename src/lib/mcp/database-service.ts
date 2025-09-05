import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { 
  ArchiveSchema, 
  ArchiveItemSchema, 
  ChatMessageSchema,
  type ArchiveEntity 
} from '@/lib/db/pg/schema.pg';
import { eq, and, desc, sql, count } from 'drizzle-orm';

// Configuration de connexion séparée pour MCP
const mcpDbConfig = {
  host: process.env.MCP_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.MCP_DB_PORT || process.env.DB_PORT || '5432'),
  database: process.env.MCP_DB_NAME || process.env.DB_NAME || 'better_chatbot',
  username: process.env.MCP_DB_USER || process.env.DB_USER || 'chatbot_user',
  password: process.env.MCP_DB_PASSWORD || process.env.DB_PASSWORD || '',
  ssl: process.env.MCP_DB_SSL === 'true' || process.env.DB_SSL === 'true',
};

// Créer l'URL de connexion PostgreSQL
const connectionString = `postgres://${mcpDbConfig.username}:${mcpDbConfig.password}@${mcpDbConfig.host}:${mcpDbConfig.port}/${mcpDbConfig.database}${mcpDbConfig.ssl ? '?sslmode=require' : ''}`;

// Connexion dédiée pour MCP
const mcpSql = postgres(connectionString);
export const mcpDb = drizzle(mcpSql);

export interface MCPArchiveData {
  name: string;
  description?: string;
  userId: string;
  mcpMetadata?: Record<string, any>;
  mcpServerId?: string;
  exportFormat?: string;
  storageLocation?: string;
  fileSize?: number;
}

export interface MCPArchiveItem {
  archiveId: string;
  itemId: string;
  userId: string;
  mcpAnalysis?: Record<string, any>;
  tokensCount?: number;
  contentSummary?: string;
}

export interface ConversationAnalysis {
  threadId: string;
  messageCount: number;
  totalTokens: number;
  estimatedTokens: number;
  participants: string[];
  firstMessage?: Date;
  lastMessage?: Date;
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export class MCPDatabaseService {
  /**
   * Obtenir toutes les conversations archivées pour un utilisateur
   */
  async getArchivedConversations(userId: string, limit = 50): Promise<ArchiveEntity[]> {
    try {
      return await mcpDb
        .select()
        .from(ArchiveSchema)
        .where(eq(ArchiveSchema.userId, userId))
        .orderBy(desc(ArchiveSchema.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Error fetching archived conversations:', error);
      throw new Error('Failed to fetch archived conversations');
    }
  }

  /**
   * Créer une nouvelle archive avec métadonnées MCP
   */
  async createArchiveWithMCPData(data: MCPArchiveData): Promise<ArchiveEntity> {
    try {
      const [archive] = await mcpDb
        .insert(ArchiveSchema)
        .values({
          name: data.name,
          description: data.description,
          userId: data.userId,
          mcpMetadata: data.mcpMetadata || {},
          mcpServerId: data.mcpServerId,
          exportFormat: data.exportFormat,
          storageLocation: data.storageLocation,
          fileSize: data.fileSize,
        })
        .returning();

      return archive;
    } catch (error) {
      console.error('Error creating archive with MCP data:', error);
      throw new Error('Failed to create archive');
    }
  }

  /**
   * Ajouter des éléments analysés à une archive
   */
  async addAnalyzedArchiveItems(items: MCPArchiveItem[]): Promise<any[]> {
    if (items.length === 0) return [];

    try {
      return await mcpDb
        .insert(ArchiveItemSchema)
        .values(items.map(item => ({
          archiveId: item.archiveId,
          itemId: item.itemId,
          userId: item.userId,
          mcpAnalysis: item.mcpAnalysis || {},
          tokensCount: item.tokensCount,
          contentSummary: item.contentSummary,
        })))
        .returning();
    } catch (error) {
      console.error('Error adding analyzed archive items:', error);
      throw new Error('Failed to add archive items');
    }
  }

  /**
   * Analyser une conversation et calculer les métriques
   */
  async analyzeConversation(threadId: string): Promise<ConversationAnalysis> {
    try {
      // Récupérer tous les messages de la conversation
      const messages = await mcpDb
        .select()
        .from(ChatMessageSchema)
        .where(eq(ChatMessageSchema.threadId, threadId))
        .orderBy(ChatMessageSchema.createdAt);

      if (messages.length === 0) {
        throw new Error('No messages found for this conversation');
      }

      // Calculer les métriques de base
      const participants = [...new Set(messages.map(m => m.role))];
      const firstMessage = messages[0]?.createdAt;
      const lastMessage = messages[messages.length - 1]?.createdAt;

      // Estimer le nombre de tokens (approximation simple)
      const estimatedTokens = messages.reduce((total, message) => {
        const contentLength = JSON.stringify(message.parts || []).length;
        return total + Math.ceil(contentLength / 4); // ~4 chars per token
      }, 0);

      // Analyser les topics (extraction simple de mots-clés)
      const allText = messages
        .flatMap(m => m.parts || [])
        .filter(part => part.type === 'text')
        .map(part => part.text)
        .join(' ')
        .toLowerCase();

      const topics = this.extractTopics(allText);

      // Analyser le sentiment (simple heuristique)
      const sentiment = this.analyzeSentiment(allText);

      return {
        threadId,
        messageCount: messages.length,
        totalTokens: 0, // À implémenter avec un tokenizer réel
        estimatedTokens,
        participants,
        firstMessage,
        lastMessage,
        topics,
        sentiment,
      };
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      throw new Error('Failed to analyze conversation');
    }
  }

  /**
   * Rechercher dans les archives avec métadonnées MCP
   */
  async searchArchives(
    query: string, 
    userId?: string, 
    limit = 10
  ): Promise<ArchiveEntity[]> {
    try {
      const searchCondition = sql`(
        ${ArchiveSchema.name} ILIKE ${`%${query}%`} OR 
        ${ArchiveSchema.description} ILIKE ${`%${query}%`} OR
        ${ArchiveSchema.mcpMetadata}::text ILIKE ${`%${query}%`}
      )`;

      const whereCondition = userId 
        ? and(eq(ArchiveSchema.userId, userId), searchCondition)
        : searchCondition;

      return await mcpDb
        .select()
        .from(ArchiveSchema)
        .where(whereCondition)
        .orderBy(desc(ArchiveSchema.updatedAt))
        .limit(limit);
    } catch (error) {
      console.error('Error searching archives:', error);
      throw new Error('Failed to search archives');
    }
  }

  /**
   * Obtenir les statistiques des archives MCP
   */
  async getArchiveStats(userId?: string) {
    try {
      const baseQuery = mcpDb
        .select({
          totalArchives: count(),
          totalSize: sql<number>`COALESCE(SUM(${ArchiveSchema.fileSize}), 0)`,
        })
        .from(ArchiveSchema);

      const [stats] = userId 
        ? await baseQuery.where(eq(ArchiveSchema.userId, userId))
        : await baseQuery;

      // Statistiques par format d'export
      const formatStatsQuery = mcpDb
        .select({
          exportFormat: ArchiveSchema.exportFormat,
          count: count(),
        })
        .from(ArchiveSchema)
        .groupBy(ArchiveSchema.exportFormat);

      const formatStats = userId
        ? await formatStatsQuery.where(eq(ArchiveSchema.userId, userId))
        : await formatStatsQuery;

      return {
        totalArchives: stats.totalArchives,
        totalSize: stats.totalSize,
        formatBreakdown: formatStats,
      };
    } catch (error) {
      console.error('Error getting archive stats:', error);
      throw new Error('Failed to get archive statistics');
    }
  }

  /**
   * Méthode utilitaire pour extraire des topics simples
   */
  private extractTopics(text: string): string[] {
    // Extraction simple basée sur des mots-clés fréquents
    const words = text
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Méthode utilitaire pour analyser le sentiment
   */
  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'perfect', 'love', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'worst', 'failed'];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Fermer la connexion à la base de données
   */
  async close() {
    await mcpSql.end();
  }
}

// Instance singleton pour l'utilisation dans l'application
export const mcpDbService = new MCPDatabaseService();

// Gestion gracieuse de la fermeture
process.on('beforeExit', async () => {
  await mcpDbService.close();
});

export default MCPDatabaseService;