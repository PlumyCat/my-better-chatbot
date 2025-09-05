import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { getSession } from "auth/server";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { FileAttachmentSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get file record from database
    const fileRecord = await db
      .select()
      .from(FileAttachmentSchema)
      .where(eq(FileAttachmentSchema.id, id))
      .limit(1);

    if (!fileRecord.length) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    const file = fileRecord[0];
    
    // Basic access control - users can only access their own files
    // TODO: Add more granular permissions for message-based access
    if (file.uploadedBy !== session.user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Read file from storage
    const fullPath = join(process.cwd(), file.storagePath);
    
    try {
      const fileBuffer = await readFile(fullPath);
      
      // Set appropriate headers
      return new NextResponse(fileBuffer as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': file.contentType,
          'Content-Length': file.fileSize.toString(),
          'Content-Disposition': `inline; filename="${file.originalFilename}"`,
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
          'ETag': `"${file.contentHash}"`,
        },
      });
    } catch (fsError) {
      console.error('File read error:', fsError);
      return NextResponse.json(
        { error: "File not accessible" },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('File retrieval error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}