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
 * GET /api/artifacts/[identifier]/versions?conversationId=...
 * Get all versions of a specific artifact
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

    if (!conversationId) {
      return Response.json({ error: 'conversationId is required' }, { status: 400 });
    }

    // TODO: Add authorization check to ensure user owns the conversation

    const versions = await artifactRepository.getAllVersions(conversationId, identifier);

    if (versions.length === 0) {
      return Response.json({ error: 'Artifact not found' }, { status: 404 });
    }

    logger.info(`Retrieved ${versions.length} versions for artifact: ${identifier}`);

    return Response.json({ 
      identifier,
      versions: versions.map(v => ({
        version: v.version,
        title: v.title,
        language: v.language,
        createdAt: v.createdAt,
        contentLength: v.content.length,
      })),
      latestVersion: versions[0].version,
    });
  } catch (error: any) {
    logger.error("Error retrieving artifact versions:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}