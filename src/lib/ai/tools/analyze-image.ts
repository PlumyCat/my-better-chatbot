import { tool as createTool } from "ai";
import { z } from "zod";
import { readFile as fsReadFile } from "fs/promises";
import { join } from "path";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { FileAttachmentSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export const analyzeImageTool = createTool({
  description: `Analyze image content using vision model. Use this tool when you need to understand what's in an image, extract text (OCR), or get visual descriptions.`,
  inputSchema: z.object({
    fileId: z.string().describe("The ID of the image file to analyze"),
    question: z.string().optional().describe("Specific question about the image (optional, defaults to general description)"),
  }),
  execute: async ({ fileId, question = "Describe what you see in this image in detail. If there's any text, transcribe it exactly." }) => {
    try {
      // Get file record from database
      const fileRecord = await db
        .select()
        .from(FileAttachmentSchema)
        .where(eq(FileAttachmentSchema.id, fileId))
        .limit(1);

      if (!fileRecord.length) {
        return {
          error: "File not found",
          fileId,
        };
      }

      const file = fileRecord[0];

      // Verify it's an image file
      if (!file.contentType.startsWith('image/')) {
        return {
          error: "Not an image file",
          fileId,
          filename: file.originalFilename,
          contentType: file.contentType,
          message: `File "${file.originalFilename}" is not an image (${file.contentType}). Use readFile tool for other file types.`,
        };
      }

      // Read file and convert to base64
      const fullPath = join(process.cwd(), file.storagePath);
      const imageBuffer = await fsReadFile(fullPath);
      const base64Image = imageBuffer.toString('base64');
      
      // Create data URL for the image
      const dataUrl = `data:${file.contentType};base64,${base64Image}`;

      try {
        // Use OpenAI GPT-4o-mini for image analysis
        const result = await generateText({
          model: openai('gpt-4o-mini'),
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that analyzes images and responds in clear, detailed Markdown format. If you see text in the image, transcribe it exactly. Describe visual elements, layout, colors, and any relevant details."
            },
            {
              role: "user",
              content: [
                { type: "text", text: question },
                { 
                  type: "image", 
                  image: dataUrl
                }
              ]
            }
          ],
          temperature: 0.0,
        });

        return {
          fileId,
          filename: file.originalFilename,
          contentType: file.contentType,
          size: file.fileSize,
          analysis: result.text,
          question: question,
          message: `Successfully analyzed image "${file.originalFilename}" (${Math.round(file.fileSize / 1024)}KB)`,
          ...(result.usage && {
            usage: {
              totalTokens: result.usage.totalTokens || 0,
            }
          })
        };
      } catch (visionError) {
        return {
          error: "Failed to analyze image",
          fileId,
          filename: file.originalFilename,
          contentType: file.contentType,
          size: file.fileSize,
          message: `Could not analyze image "${file.originalFilename}". Vision model might be unavailable or the image format is not supported.`,
          details: visionError instanceof Error ? visionError.message : "Unknown error",
        };
      }
    } catch (error) {
      return {
        error: "Failed to process image",
        fileId,
        details: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});