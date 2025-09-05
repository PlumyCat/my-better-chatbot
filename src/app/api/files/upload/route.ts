import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { getSession } from "auth/server";
import { createHash } from "crypto";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { FileAttachmentSchema } from "@/lib/db/pg/schema.pg";
import { isAllowedFileType, MAX_FILE_SIZE, MAX_FILES_PER_UPLOAD } from "@/types/file-attachment";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const messageId = formData.get("messageId") as string | null;

    // Validation
    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided" },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES_PER_UPLOAD) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_FILES_PER_UPLOAD} files allowed` },
        { status: 400 }
      );
    }

    const uploadedFiles: any[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        // Validate file type
        if (!isAllowedFileType(file.type)) {
          errors.push(`${file.name}: File type not allowed`);
          continue;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: File too large (max 10MB)`);
          continue;
        }

        // Generate content hash
        const buffer = Buffer.from(await file.arrayBuffer());
        const contentHash = createHash('sha256').update(buffer).digest('hex');

        // Check for existing file with same hash (deduplication)
        const existingFile = await db
          .select()
          .from(FileAttachmentSchema)
          .where(eq(FileAttachmentSchema.contentHash, contentHash))
          .limit(1);

        let fileRecord;

        if (existingFile.length > 0) {
          // File already exists, just create reference
          fileRecord = existingFile[0];
        } else {
          // Create unique filename with timestamp and hash prefix
          const timestamp = Date.now();
          const hashPrefix = contentHash.substring(0, 8);
          const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const uniqueFilename = `${timestamp}_${hashPrefix}_${sanitizedName}`;

          // Create date-based directory structure
          const date = new Date();
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          const uploadDir = join(process.cwd(), 'uploads', year.toString(), month, day);
          
          // Ensure directory exists
          const { mkdir } = await import('fs/promises');
          await mkdir(uploadDir, { recursive: true });

          const storagePath = join('uploads', year.toString(), month, day, uniqueFilename);
          const fullPath = join(process.cwd(), storagePath);

          // Save file to disk
          await writeFile(fullPath, buffer);

          // Save to database
          const insertResult = await db
            .insert(FileAttachmentSchema)
            .values({
              filename: uniqueFilename,
              originalFilename: file.name,
              contentType: file.type,
              fileSize: file.size,
              storagePath,
              contentHash,
              uploadedBy: session.user.id,
              messageId,
            })
            .returning();

          fileRecord = insertResult[0];
        }

        uploadedFiles.push(fileRecord);
      } catch (error) {
        console.error('File upload error:', error);
        errors.push(`${file.name}: Upload failed`);
      }
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}