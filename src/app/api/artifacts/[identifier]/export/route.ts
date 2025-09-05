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
 * POST /api/artifacts/[identifier]/export?conversationId=...&version=...
 * Export an artifact as a downloadable file
 */
export async function POST(request: NextRequest, context: RouteContext) {
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

    // Determine file extension and MIME type based on artifact type
    let fileExtension: string;
    let mimeType: string;

    switch (artifact.type) {
      case 'text/html':
        fileExtension = 'html';
        mimeType = 'text/html';
        break;
      case 'image/svg+xml':
        fileExtension = 'svg';
        mimeType = 'image/svg+xml';
        break;
      case 'application/.artifacts.mermaid':
        fileExtension = 'mmd';
        mimeType = 'text/plain';
        break;
      case 'application/.artifacts.code':
        fileExtension = artifact.language || 'txt';
        mimeType = 'text/plain';
        break;
      default:
        fileExtension = 'txt';
        mimeType = 'text/plain';
    }

    const filename = `${artifact.identifier}-v${artifact.version}.${fileExtension}`;

    logger.info(`Exporting artifact: ${identifier} (version ${artifact.version}) as ${filename}`);

    return new Response(artifact.content, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': artifact.content.length.toString(),
      },
    });
  } catch (error: any) {
    logger.error("Error exporting artifact:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}