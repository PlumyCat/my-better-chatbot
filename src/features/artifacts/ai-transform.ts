import { createArtifactsParser } from './parser';
import type { Artifact } from './types';
import { generateUUID } from 'lib/utils';

/**
 * Creates a transform for the AI SDK that parses artifacts from the stream
 */
export function createArtifactTransform(
  threadId: string,
  onArtifact?: (artifact: Partial<Artifact>) => void
) {
  const parser = createArtifactsParser();
  let currentArtifact: Partial<Artifact> | null = null;
  let currentMessageId: string | null = null;
  
  return {
    transform: (chunk: string, messageId?: string): string => {
      // Store message ID for artifact association
      if (messageId) {
        currentMessageId = messageId;
      }
      
      // Parse the chunk
      const events = parser.push(chunk);
      let outputText = '';
      
      for (const event of events) {
        switch (event.kind) {
          case 'text':
            outputText += event.text;
            break;
            
          case 'artifact-start':
            // Initialize new artifact
            currentArtifact = {
              id: generateUUID(),
              conversationId: threadId,
              messageId: currentMessageId || '',
              identifier: event.meta.identifier,
              type: event.meta.type,
              title: event.meta.title,
              language: event.meta.language,
              version: 1,
              content: '',
              createdAt: new Date(),
            };
            break;
            
          case 'artifact-chunk':
            // Accumulate content
            if (currentArtifact) {
              currentArtifact.content = (currentArtifact.content || '') + event.text;
            }
            break;
            
          case 'artifact-end':
            // Complete artifact
            if (currentArtifact && onArtifact) {
              onArtifact(currentArtifact);
            }
            currentArtifact = null;
            break;
        }
      }
      
      return outputText;
    },
    
    flush: () => {
      parser.flush();
      if (currentArtifact && onArtifact) {
        // If we have an incomplete artifact, still save it
        onArtifact(currentArtifact);
      }
    }
  };
}

/**
 * Wraps the smooth stream transform to add artifact parsing
 */
export function artifactAwareTransform(
  baseTransform: any,
  threadId: string,
  onArtifact: (artifact: Partial<Artifact>) => void
) {
  const artifactTransform = createArtifactTransform(threadId, onArtifact);
  
  // Return a composed transform
  return async function* (stream: AsyncIterable<string>) {
    // First apply the base transform if it exists
    const transformedStream = baseTransform ? baseTransform(stream) : stream;
    
    // Then apply artifact parsing
    for await (const chunk of transformedStream) {
      const processedChunk = artifactTransform.transform(chunk);
      if (processedChunk) {
        yield processedChunk;
      }
    }
    
    // Flush any remaining content
    artifactTransform.flush();
  };
}