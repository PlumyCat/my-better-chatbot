import { tool as createTool } from "ai";
import { z } from "zod";
import { readFile as fsReadFile } from "fs/promises";
import { join } from "path";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { FileAttachmentSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

export const readFileTool = createTool({
  description: `MANDATORY: Read the content of attached files. You MUST use this tool immediately whenever you see file references like "[File: filename] (ID: abc123)" in user messages. DO NOT respond about files without reading their content first. Extract the file ID from parentheses and call this tool to access the actual file content before providing any analysis or response about the file.`,
  inputSchema: z.object({
    fileId: z.string().describe("The ID of the file to read (found in parentheses like '(ID: abc123)' in file references)"),
  }),
  execute: async ({ fileId }) => {
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

      // Read file from storage
      const fullPath = join(process.cwd(), file.storagePath);
      
      // Handle PDF files with LangChain PDFLoader
      if (file.contentType === 'application/pdf' ||
          file.originalFilename.endsWith('.pdf')) {
        try {
          const loader = new PDFLoader(fullPath, {
            splitPages: false, // Keep all content in single document
            parsedItemSeparator: " ", // Clean up spacing
          });
          
          const docs = await loader.load();
          
          // Combine all documents if splitPages was somehow true
          const content = docs.map(doc => doc.pageContent).join('\n');
          
          // Extract metadata from first document
          const metadata = docs[0]?.metadata || {};
          
          return {
            fileId,
            filename: file.originalFilename,
            contentType: file.contentType,
            size: file.fileSize,
            content: content,
            metadata: {
              pages: docs.length,
              source: metadata.source || file.originalFilename,
              ...metadata,
            },
            message: `Successfully extracted text from PDF "${file.originalFilename}" (${docs.length} page${docs.length > 1 ? 's' : ''}, ${Math.round(file.fileSize / 1024)}KB)`,
          };
        } catch (pdfError) {
          return {
            error: "Failed to extract PDF content",
            fileId,
            filename: file.originalFilename,
            contentType: file.contentType,
            size: file.fileSize,
            message: `Could not extract text from PDF "${file.originalFilename}". The file might be corrupted, password-protected, or contain only images.`,
            details: pdfError instanceof Error ? pdfError.message : "Unknown error",
          };
        }
      }

      // Handle Word documents (DOCX and DOC)
      if (file.contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
          file.contentType === 'application/msword' ||
          file.originalFilename.endsWith('.docx') ||
          file.originalFilename.endsWith('.doc')) {
        try {
          const fileBuffer = await fsReadFile(fullPath);
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          
          return {
            fileId,
            filename: file.originalFilename,
            contentType: file.contentType,
            size: file.fileSize,
            content: result.value,
            messages: result.messages,
            message: `Successfully extracted text from Word document "${file.originalFilename}" (${Math.round(file.fileSize / 1024)}KB)`,
          };
        } catch (docxError) {
          return {
            error: "Failed to extract Word document content",
            fileId,
            filename: file.originalFilename,
            contentType: file.contentType,
            size: file.fileSize,
            message: `Could not extract text from Word document "${file.originalFilename}". The file might be corrupted or use an unsupported format.`,
            details: docxError instanceof Error ? docxError.message : "Unknown error",
          };
        }
      }

      // Handle Excel files (XLS, XLSX)
      if (file.contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.contentType === 'application/vnd.ms-excel' ||
          file.originalFilename.endsWith('.xlsx') ||
          file.originalFilename.endsWith('.xls')) {
        try {
          const fileBuffer = await fsReadFile(fullPath);
          const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
          
          // Extract all sheets as text
          let content = '';
          workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            content += `\n=== Sheet: ${sheetName} ===\n`;
            content += XLSX.utils.sheet_to_txt(sheet);
            content += '\n';
          });
          
          return {
            fileId,
            filename: file.originalFilename,
            contentType: file.contentType,
            size: file.fileSize,
            content: content.trim(),
            metadata: {
              sheetNames: workbook.SheetNames,
              sheetCount: workbook.SheetNames.length,
            },
            message: `Successfully extracted data from Excel file "${file.originalFilename}" (${workbook.SheetNames.length} sheets, ${Math.round(file.fileSize / 1024)}KB)`,
          };
        } catch (xlsError) {
          return {
            error: "Failed to extract Excel content",
            fileId,
            filename: file.originalFilename,
            contentType: file.contentType,
            size: file.fileSize,
            message: `Could not extract data from Excel file "${file.originalFilename}". The file might be corrupted or use an unsupported format.`,
            details: xlsError instanceof Error ? xlsError.message : "Unknown error",
          };
        }
      }

      // Handle PowerPoint files (PPT, PPTX) - basic support message
      if (file.contentType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || 
          file.contentType === 'application/vnd.ms-powerpoint' ||
          file.originalFilename.endsWith('.pptx') ||
          file.originalFilename.endsWith('.ppt')) {
        return {
          fileId,
          filename: file.originalFilename,
          contentType: file.contentType,
          size: file.fileSize,
          sizeKB: Math.round(file.fileSize / 1024),
          message: `PowerPoint file "${file.originalFilename}" detected (${Math.round(file.fileSize / 1024)}KB). PowerPoint text extraction requires additional libraries. Please export as PDF or text format for analysis.`,
        };
      }

      // Handle MSG files (Outlook messages)
      if (file.contentType === 'application/vnd.ms-outlook' ||
          file.originalFilename.endsWith('.msg')) {
        return {
          fileId,
          filename: file.originalFilename,
          contentType: file.contentType,
          size: file.fileSize,
          sizeKB: Math.round(file.fileSize / 1024),
          message: `Outlook message file "${file.originalFilename}" detected (${Math.round(file.fileSize / 1024)}KB). MSG file extraction requires specialized parsing library.`,
        };
      }

      // Handle plain text files
      if (file.contentType === 'text/plain' || 
          file.originalFilename.endsWith('.txt') ||
          file.originalFilename.endsWith('.md') ||
          file.originalFilename.endsWith('.csv') ||
          file.originalFilename.endsWith('.log') ||
          file.originalFilename.endsWith('.json') ||
          file.originalFilename.endsWith('.xml') ||
          file.originalFilename.endsWith('.yml') ||
          file.originalFilename.endsWith('.yaml')) {
        try {
          const fileContent = await fsReadFile(fullPath, 'utf-8');
          
          return {
            fileId,
            filename: file.originalFilename,
            contentType: file.contentType,
            size: file.fileSize,
            content: fileContent,
            message: `Successfully read text file "${file.originalFilename}" (${Math.round(file.fileSize / 1024)}KB)`,
          };
        } catch (readError) {
          return {
            error: "Failed to read text file",
            fileId,
            filename: file.originalFilename,
            contentType: file.contentType,
            size: file.fileSize,
            message: `Could not read text file "${file.originalFilename}". The file might use an unsupported encoding.`,
            details: readError instanceof Error ? readError.message : "Unknown error",
          };
        }
      }

      // Handle image files - redirect to analyzeImage tool
      if (file.contentType.startsWith('image/')) {
        return {
          fileId,
          filename: file.originalFilename,
          contentType: file.contentType,
          size: file.fileSize,
          sizeKB: Math.round(file.fileSize / 1024),
          message: `Image file "${file.originalFilename}" detected (${Math.round(file.fileSize / 1024)}KB). For image analysis, OCR, or visual description, please use the analyzeImage tool instead with fileId: ${fileId}`,
          suggestion: `Use analyzeImage tool with fileId "${fileId}" to analyze this image content.`,
        };
      }

      // Try to read as text for other files
      try {
        const fileContent = await fsReadFile(fullPath, 'utf-8');
        
        return {
          fileId,
          filename: file.originalFilename,
          contentType: file.contentType,
          size: file.fileSize,
          content: fileContent,
          message: `Successfully read file "${file.originalFilename}" (${file.contentType}, ${Math.round(file.fileSize / 1024)}KB)`,
        };
      } catch (fsError) {
        return {
          error: "Cannot read file content",
          fileId,
          filename: file.originalFilename,
          contentType: file.contentType,
          size: file.fileSize,
          message: `File "${file.originalFilename}" exists but cannot be read (${file.contentType}, ${Math.round(file.fileSize / 1024)}KB). The file might be binary or use an unsupported encoding.`,
        };
      }
    } catch (error) {
      return {
        error: "Failed to access file",
        fileId,
        details: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});