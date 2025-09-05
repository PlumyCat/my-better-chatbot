import { NextRequest } from "next/server";
import { artifactRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import globalLogger from "logger";
import { colorize } from "consola/utils";

const logger = globalLogger.withDefaults({
  message: colorize("blueBright", `Artifacts API: `),
});

/**
 * GET /api/artifacts?conversationId=...
 * List all artifacts in a conversation with their latest versions
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return Response.json({ error: 'conversationId is required' }, { status: 400 });
    }

    // TODO: Add authorization check to ensure user owns the conversation

    const artifacts = await artifactRepository.listByConversation(conversationId);
    
    logger.info(`Listed ${artifacts.length} artifacts for conversation ${conversationId}`);
    
    return Response.json({ artifacts });
  } catch (error: any) {
    logger.error("Error listing artifacts:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/artifacts
 * Create a new artifact (mainly for testing, normally created via chat stream)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { conversationId, messageId, identifier, type, title, language, content } = body;

    if (!conversationId || !messageId || !identifier || !type || !content) {
      return Response.json({ 
        error: 'Missing required fields: conversationId, messageId, identifier, type, content' 
      }, { status: 400 });
    }

    // Validate artifact type
    const validTypes = ['text/html', 'image/svg+xml', 'application/.artifacts.mermaid', 'application/.artifacts.code'];
    if (!validTypes.includes(type)) {
      return Response.json({ 
        error: `Invalid artifact type. Must be one of: ${validTypes.join(', ')}` 
      }, { status: 400 });
    }

    // TODO: Add authorization check to ensure user owns the conversation

    const artifact = await artifactRepository.create({
      conversationId,
      messageId,
      identifier,
      type,
      title,
      language,
      content,
    });

    logger.info(`Created artifact: ${identifier} (version ${artifact.version})`);

    return Response.json({ artifact }, { status: 201 });
  } catch (error: any) {
    logger.error("Error creating artifact:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}