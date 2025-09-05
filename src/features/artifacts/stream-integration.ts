import { createArtifactsParser } from './parser';
import { Artifact } from './types';
import { generateUUID } from 'lib/utils';

export interface ArtifactStreamHandler {
  onArtifactStart: (artifact: Partial<Artifact>) => void;
  onArtifactChunk: (chunk: string) => void;
  onArtifactEnd: () => void;
}

export function createArtifactStreamProcessor(
  threadId: string,
  messageId: string,
  handler: ArtifactStreamHandler
) {
  const parser = createArtifactsParser();
  let currentArtifact: Partial<Artifact> | null = null;
  let accumulatedContent = '';

  return {
    processChunk: (chunk: string): string => {
      // Parse the chunk for artifacts
      const events = parser.push(chunk);
      
      // Accumulate text that should be displayed in chat
      let textForChat = '';
      
      for (const event of events) {
        switch (event.kind) {
          case 'text':
            textForChat += event.text;
            break;
            
          case 'artifact-start':
            // Start accumulating artifact
            currentArtifact = {
              id: generateUUID(),
              conversationId: threadId,
              messageId: messageId,
              identifier: event.meta.identifier,
              type: event.meta.type,
              title: event.meta.title,
              language: event.meta.language,
              version: 1,
              content: '',
              createdAt: new Date(),
            };
            accumulatedContent = '';
            handler.onArtifactStart(currentArtifact);
            break;
            
          case 'artifact-chunk':
            // Accumulate content
            if (currentArtifact) {
              accumulatedContent += event.text;
              handler.onArtifactChunk(event.text);
            }
            break;
            
          case 'artifact-end':
            // Finalize artifact
            if (currentArtifact) {
              currentArtifact.content = accumulatedContent;
              handler.onArtifactEnd();
              currentArtifact = null;
              accumulatedContent = '';
            }
            break;
        }
      }
      
      return textForChat;
    },
    
    flush: () => {
      const events = parser.flush();
      for (const event of events) {
        if (event.kind === 'artifact-end' && currentArtifact) {
          currentArtifact.content = accumulatedContent;
          handler.onArtifactEnd();
        }
      }
    }
  };
}

/**
 * Transform stream that processes artifacts
 */
export function createArtifactTransformStream(
  threadId: string, 
  messageId: string,
  onArtifact?: (artifact: Partial<Artifact>) => void
) {
  let currentArtifact: Partial<Artifact> | null = null;
  
  const processor = createArtifactStreamProcessor(threadId, messageId, {
    onArtifactStart: (artifact) => {
      currentArtifact = artifact;
    },
    onArtifactChunk: (chunk) => {
      if (currentArtifact) {
        currentArtifact.content = (currentArtifact.content || '') + chunk;
      }
    },
    onArtifactEnd: () => {
      if (currentArtifact && onArtifact) {
        onArtifact(currentArtifact);
      }
      currentArtifact = null;
    }
  });
  
  return new TransformStream<string, string>({
    transform(chunk, controller) {
      const processedText = processor.processChunk(chunk);
      controller.enqueue(processedText);
    },
    
    flush() {
      processor.flush();
    }
  });
}