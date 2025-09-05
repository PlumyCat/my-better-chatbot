"use client";

import { useState } from "react";
import { FilePicker } from "@/components/file-picker";
import { Button } from "ui/button";

export default function TestUploadPage() {
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>("");

  const handleFilesUploaded = (fileIds: string[]) => {
    setUploadedFileIds(prev => [...prev, ...fileIds]);
    console.log("Files uploaded:", fileIds);
  };

  const handleViewFile = () => {
    if (selectedFileId) {
      window.open(`/api/files/${selectedFileId}`, '_blank');
    }
  };

  const handleViewMetadata = async () => {
    if (selectedFileId) {
      try {
        const response = await fetch(`/api/files/${selectedFileId}/metadata`);
        const metadata = await response.json();
        console.log("File metadata:", metadata);
        alert(JSON.stringify(metadata, null, 2));
      } catch (error) {
        console.error("Error fetching metadata:", error);
        alert("Error fetching metadata");
      }
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">File Upload Test</h1>
          <p className="text-muted-foreground mt-2">
            Test the file upload functionality independently from the chat interface.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Upload Files</h2>
          <FilePicker onFilesUploaded={handleFilesUploaded} />
        </div>

        {uploadedFileIds.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Uploaded Files</h2>
            <div className="space-y-2">
              {uploadedFileIds.map((fileId) => (
                <div key={fileId} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <code className="text-sm bg-background px-2 py-1 rounded flex-1">
                    {fileId}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFileId(fileId)}
                  >
                    Select
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedFileId && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Test File Access</h2>
            <div className="p-4 bg-muted rounded">
              <p className="text-sm mb-4">
                Selected file: <code className="bg-background px-1 rounded">{selectedFileId}</code>
              </p>
              <div className="flex gap-2">
                <Button onClick={handleViewFile} variant="outline">
                  View File
                </Button>
                <Button onClick={handleViewMetadata} variant="outline">
                  View Metadata
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-2">Instructions</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Upload files using the file picker or drag & drop</li>
            <li>Supported types: Images, PDFs, text files, code files</li>
            <li>Maximum file size: 10MB</li>
            <li>Maximum files per upload: 5</li>
            <li>Select an uploaded file to test viewing and metadata retrieval</li>
          </ul>
        </div>
      </div>
    </div>
  );
}