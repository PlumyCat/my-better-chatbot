import { ArtifactChunkEvent, ArtifactMeta } from './types';

type ParserState = 'Idle' | 'InOpenTag' | 'InArtifact' | 'InCloseTag';

export function parseAttributes(tagInner: string): Record<string, string> {
  const out: Record<string, string> = {};
  const rx = /(\w+)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(tagInner))) {
    out[m[1]] = m[2];
  }
  return out;
}

export function createArtifactsParser() {
  let state: ParserState = 'Idle';
  let buffer = '';
  let tagBuffer = '';
  let artifactContent = '';
  let currentMeta: ArtifactMeta | null = null;
  
  const ARTIFACT_OPEN_TAG = '<Artifact';
  const ARTIFACT_CLOSE_TAG = '</Artifact>';
  const THINKING_OPEN_TAG = '<Thinking>';
  const THINKING_CLOSE_TAG = '</Thinking>';
  
  function push(chunk: string): ArtifactChunkEvent[] {
    const events: ArtifactChunkEvent[] = [];
    buffer += chunk;
    
    let iterations = 0;
    const maxIterations = 1000;
    
    while (buffer.length > 0 && iterations++ < maxIterations) {
      switch (state) {
        case 'Idle': {
          // Look for <Thinking> blocks to skip
          const thinkingIndex = buffer.indexOf(THINKING_OPEN_TAG);
          const artifactIndex = buffer.indexOf(ARTIFACT_OPEN_TAG);
          
          // Skip <Thinking> blocks entirely
          if (thinkingIndex !== -1 && (artifactIndex === -1 || thinkingIndex < artifactIndex)) {
            const thinkingEndIndex = buffer.indexOf(THINKING_CLOSE_TAG);
            if (thinkingEndIndex !== -1) {
              // Extract text before thinking
              const beforeThinking = buffer.substring(0, thinkingIndex);
              if (beforeThinking) {
                events.push({ kind: 'text', text: beforeThinking });
              }
              // Skip thinking block and continue
              buffer = buffer.substring(thinkingEndIndex + THINKING_CLOSE_TAG.length);
              continue;
            } else {
              // Incomplete thinking block, wait for more data
              const beforeThinking = buffer.substring(0, thinkingIndex);
              if (beforeThinking) {
                events.push({ kind: 'text', text: beforeThinking });
                buffer = buffer.substring(thinkingIndex);
              }
              break;
            }
          }
          
          // Look for <Artifact
          if (artifactIndex === -1) {
            // Check if buffer might end with partial start of artifact tag
            let possiblePartialMatch = -1;
            for (let i = 1; i < ARTIFACT_OPEN_TAG.length && i < buffer.length; i++) {
              if (buffer.endsWith(ARTIFACT_OPEN_TAG.substring(0, i))) {
                possiblePartialMatch = buffer.length - i;
                break;
              }
            }
            
            if (possiblePartialMatch !== -1) {
              // Emit text before the potential partial match
              if (possiblePartialMatch > 0) {
                events.push({ kind: 'text', text: buffer.substring(0, possiblePartialMatch) });
                buffer = buffer.substring(possiblePartialMatch);
              }
              // Keep the partial match in buffer
              return events;
            }
            
            // No artifact tag or partial, emit all as text
            if (buffer.length > 0) {
              events.push({ kind: 'text', text: buffer });
              buffer = '';
            }
            return events;
          }
          
          // Found artifact tag
          if (artifactIndex > 0) {
            // Emit text before the artifact tag
            const textBefore = buffer.substring(0, artifactIndex);
            events.push({ kind: 'text', text: textBefore });
          }
          
          // Move to InOpenTag state
          buffer = buffer.substring(artifactIndex);
          state = 'InOpenTag';
          tagBuffer = '';
          break;
        }
        
        case 'InOpenTag': {
          // Accumulate the opening tag until we find '>'
          const closeTagIndex = buffer.indexOf('>');
          
          if (closeTagIndex === -1) {
            // Haven't found the end of the tag yet
            tagBuffer += buffer;
            buffer = '';
            return events;
          }
          
          // Found the end of the tag
          tagBuffer += buffer.substring(0, closeTagIndex + 1);
          buffer = buffer.substring(closeTagIndex + 1);
          
          // Parse attributes from the tag
          const tagInner = tagBuffer.substring(ARTIFACT_OPEN_TAG.length, tagBuffer.length - 1);
          const attrs = parseAttributes(tagInner);
          
          currentMeta = {
            identifier: attrs.identifier || 'unknown',
            type: attrs.type || 'text/plain',
            title: attrs.title,
            language: attrs.language,
          };
          
          events.push({ kind: 'artifact-start', meta: currentMeta });
          
          // Move to InArtifact state
          state = 'InArtifact';
          artifactContent = '';
          tagBuffer = '';
          break;
        }
        
        case 'InArtifact': {
          // Look for closing tag
          const closeIndex = buffer.indexOf(ARTIFACT_CLOSE_TAG);
          
          if (closeIndex === -1) {
            // Check if buffer might end with partial start of close tag
            let possiblePartialMatch = -1;
            for (let i = 1; i < ARTIFACT_CLOSE_TAG.length && i < buffer.length; i++) {
              if (buffer.endsWith(ARTIFACT_CLOSE_TAG.substring(0, i))) {
                possiblePartialMatch = buffer.length - i;
                break;
              }
            }
            
            if (possiblePartialMatch !== -1 && possiblePartialMatch > 0) {
              // Emit content before the potential partial match
              const chunk = buffer.substring(0, possiblePartialMatch);
              artifactContent += chunk;
              events.push({ kind: 'artifact-chunk', text: chunk });
              buffer = buffer.substring(possiblePartialMatch);
              return events;
            }
            
            // No close tag found, accumulate all content
            if (buffer.length > 0) {
              artifactContent += buffer;
              events.push({ kind: 'artifact-chunk', text: buffer });
              buffer = '';
            }
            return events;
          }
          
          // Found closing tag
          const remainingContent = buffer.substring(0, closeIndex);
          if (remainingContent) {
            artifactContent += remainingContent;
            events.push({ kind: 'artifact-chunk', text: remainingContent });
          }
          
          events.push({ kind: 'artifact-end' });
          
          // Reset state
          buffer = buffer.substring(closeIndex + ARTIFACT_CLOSE_TAG.length);
          state = 'Idle';
          currentMeta = null;
          artifactContent = '';
          break;
        }
        
        default:
          // Should never reach here
          state = 'Idle';
          break;
      }
    }
    
    return events;
  }
  
  function flush(): ArtifactChunkEvent[] {
    const events: ArtifactChunkEvent[] = [];
    
    if (state === 'Idle') {
      // Flush any remaining buffer as text
      if (buffer.length > 0) {
        events.push({ kind: 'text', text: buffer });
        buffer = '';
      }
    } else if (state === 'InOpenTag' && currentMeta) {
      // We were in the middle of parsing an open tag, emit what we have
      // This shouldn't normally happen but handle it gracefully
      buffer = '';
      tagBuffer = '';
    } else if (state === 'InArtifact') {
      // We were in the middle of an artifact, close it
      if (artifactContent.length > 0 || buffer.length > 0) {
        if (buffer.length > 0) {
          events.push({ kind: 'artifact-chunk', text: buffer });
        }
        events.push({ kind: 'artifact-end' });
      }
    }
    
    // Reset state
    state = 'Idle';
    buffer = '';
    tagBuffer = '';
    artifactContent = '';
    currentMeta = null;
    
    return events;
  }
  
  return {
    push,
    flush,
  };
}