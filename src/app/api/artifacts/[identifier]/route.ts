import { NextRequest } from "next/server";
import { artifactRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import globalLogger from "logger";
import { colorize } from "consola/utils";

const logger = globalLogger.withDefaults({
  message: colorize("blueBright", `Artifacts API: `),
});

interface RouteContext {
  params: {
    identifier: string;
  };
}

/**
 * GET /api/artifacts/[identifier]?conversationId=...&version=...
 * Get a specific artifact by identifier, optionally by version
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { identifier } = context.params;
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const versionParam = searchParams.get('version');
    const version = versionParam ? parseInt(versionParam, 10) : undefined;

    if (!conversationId) {
      return Response.json({ error: 'conversationId is required' }, { status: 400 });
    }

    if (versionParam && (isNaN(version!) || version! < 1)) {
      return Response.json({ error: 'version must be a positive integer' }, { status: 400 });
    }

    // TODO: Add authorization check to ensure user owns the conversation

    const artifact = await artifactRepository.getByIdentifier(
      conversationId, 
      identifier, 
      version
    );

    if (!artifact) {
      return Response.json({ error: 'Artifact not found' }, { status: 404 });
    }

    logger.info(`Retrieved artifact: ${identifier} (version ${artifact.version})`);

    return Response.json({ artifact });
  } catch (error: any) {
    logger.error("Error retrieving artifact:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/artifacts/[identifier]?conversationId=...&version=...
 * Delete a specific version of an artifact (or all versions if no version specified)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { identifier } = context.params;
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const versionParam = searchParams.get('version');
    const version = versionParam ? parseInt(versionParam, 10) : undefined;

    if (!conversationId) {
      return Response.json({ error: 'conversationId is required' }, { status: 400 });
    }

    if (versionParam && (isNaN(version!) || version! < 1)) {
      return Response.json({ error: 'version must be a positive integer' }, { status: 400 });
    }

    // TODO: Add authorization check to ensure user owns the conversation

    // Get the artifact first to get its ID for deletion
    const artifact = await artifactRepository.getByIdentifier(
      conversationId,
      identifier,
      version
    );

    if (!artifact) {
      return Response.json({ error: 'Artifact not found' }, { status: 404 });
    }

    const deleted = await artifactRepository.deleteById(artifact.id);

    if (deleted) {
      logger.info(`Deleted artifact: ${identifier} (version ${artifact.version})`);
      return Response.json({ message: 'Artifact deleted successfully' });
    } else {
      return Response.json({ error: 'Failed to delete artifact' }, { status: 500 });
    }
  } catch (error: any) {
    logger.error("Error deleting artifact:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}