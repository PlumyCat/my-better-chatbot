import { NextRequest, NextResponse } from "next/server";
import { getSession } from "auth/server";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { FileAttachmentSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";
import { getFileCategory } from "@/types/file-attachment";

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
    
    // Basic access control
    if (file.uploadedBy !== session.user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Return metadata
    const metadata = {
      id: file.id,
      filename: file.originalFilename,
      contentType: file.contentType,
      fileSize: file.fileSize,
      fileSizeFormatted: formatFileSize(file.fileSize),
      category: getFileCategory(file.contentType),
      isImage: file.contentType.startsWith('image/'),
      isDocument: file.contentType.includes('pdf') || file.contentType.includes('document'),
      isCode: file.contentType.includes('javascript') || file.contentType.includes('json') || file.contentType.includes('html'),
      createdAt: file.createdAt,
      messageId: file.messageId,
    };

    return NextResponse.json(metadata);

  } catch (error) {
    console.error('File metadata error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}