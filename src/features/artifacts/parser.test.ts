import { describe, it, expect } from 'vitest';
import { createArtifactsParser, parseAttributes } from './parser';

describe('parseAttributes', () => {
  it('should parse simple attributes', () => {
    const attrs = parseAttributes('identifier="test" type="text/html"');
    expect(attrs).toEqual({
      identifier: 'test',
      type: 'text/html',
    });
  });

  it('should parse attributes with spaces', () => {
    const attrs = parseAttributes(' identifier = "test"  type="text/html" ');
    expect(attrs).toEqual({
      identifier: 'test',
      type: 'text/html',
    });
  });

  it('should parse all artifact attributes', () => {
    const attrs = parseAttributes(
      'identifier="my-code" type="application/.artifacts.code" title="Example Code" language="typescript"'
    );
    expect(attrs).toEqual({
      identifier: 'my-code',
      type: 'application/.artifacts.code',
      title: 'Example Code',
      language: 'typescript',
    });
  });

  it('should handle empty attributes', () => {
    const attrs = parseAttributes('');
    expect(attrs).toEqual({});
  });
});

describe('createArtifactsParser', () => {
  it('should parse text without artifacts', () => {
    const parser = createArtifactsParser();
    const events = parser.push('Hello world, this is plain text.');
    
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ kind: 'text', text: 'Hello world, this is plain text.' });
  });

  it('should parse a complete artifact in one chunk', () => {
    const parser = createArtifactsParser();
    const input = 'Text before<Artifact identifier="test" type="text/html">Content inside</Artifact>Text after';
    const events = parser.push(input);
    
    expect(events).toEqual([
      { kind: 'text', text: 'Text before' },
      { kind: 'artifact-start', meta: { identifier: 'test', type: 'text/html' } },
      { kind: 'artifact-chunk', text: 'Content inside' },
      { kind: 'artifact-end' },
      { kind: 'text', text: 'Text after' },
    ]);
  });

  it('should handle artifacts split across chunks', () => {
    const parser = createArtifactsParser();
    
    const events1 = parser.push('Text before<Artif');
    expect(events1).toEqual([{ kind: 'text', text: 'Text before' }]);
    
    const events2 = parser.push('act identifier="test" type="text/html">Con');
    expect(events2).toEqual([
      { kind: 'artifact-start', meta: { identifier: 'test', type: 'text/html' } },
      { kind: 'artifact-chunk', text: 'Con' },
    ]);
    
    const events3 = parser.push('tent </Artifact>After');
    expect(events3).toEqual([
      { kind: 'artifact-chunk', text: 'tent ' },
      { kind: 'artifact-end' },
      { kind: 'text', text: 'After' },
    ]);
  });

  it('should handle tag split at attribute boundary', () => {
    const parser = createArtifactsParser();
    
    const events1 = parser.push('<Artifact identifier="test');
    expect(events1).toEqual([]);
    
    const events2 = parser.push('" type="text/html">Content</Artifact>');
    expect(events2).toEqual([
      { kind: 'artifact-start', meta: { identifier: 'test', type: 'text/html' } },
      { kind: 'artifact-chunk', text: 'Content' },
      { kind: 'artifact-end' },
    ]);
  });

  it('should handle content split across many chunks', () => {
    const parser = createArtifactsParser();
    
    const events0 = parser.push('<Artifact identifier="test" type="text/html">');
    const events1 = parser.push('Part 1 ');
    const events2 = parser.push('Part 2 ');
    const events3 = parser.push('Part 3</Artifact>');
    
    expect(events0).toEqual([
      { kind: 'artifact-start', meta: { identifier: 'test', type: 'text/html' } },
    ]);
    expect(events1).toEqual([
      { kind: 'artifact-chunk', text: 'Part 1 ' },
    ]);
    expect(events2).toEqual([{ kind: 'artifact-chunk', text: 'Part 2 ' }]);
    expect(events3).toEqual([
      { kind: 'artifact-chunk', text: 'Part 3' },
      { kind: 'artifact-end' },
    ]);
  });

  it('should skip Thinking blocks', () => {
    const parser = createArtifactsParser();
    const input = 'Before<Thinking>Internal thoughts</Thinking>After';
    const events = parser.push(input);
    
    expect(events).toEqual([
      { kind: 'text', text: 'Before' },
      { kind: 'text', text: 'After' },
    ]);
  });

  it('should handle Thinking block before Artifact', () => {
    const parser = createArtifactsParser();
    const input = '<Thinking>Reasoning</Thinking>\n\n<Artifact identifier="test" type="text/html">Content</Artifact>';
    const events = parser.push(input);
    
    expect(events).toEqual([
      { kind: 'text', text: '\n\n' },
      { kind: 'artifact-start', meta: { identifier: 'test', type: 'text/html' } },
      { kind: 'artifact-chunk', text: 'Content' },
      { kind: 'artifact-end' },
    ]);
  });

  it('should handle flush() when in the middle of parsing', () => {
    const parser = createArtifactsParser();
    
    const pushEvents = parser.push('<Artifact identifier="test" type="text/html">Partial content');
    const flushEvents = parser.flush();
    
    // The artifact-start and initial chunk are emitted during push
    expect(pushEvents).toEqual([
      { kind: 'artifact-start', meta: { identifier: 'test', type: 'text/html' } },
      { kind: 'artifact-chunk', text: 'Partial content' },
    ]);
    // flush() should close the open artifact
    expect(flushEvents).toEqual([
      { kind: 'artifact-end' },
    ]);
  });

  it('should handle flush() with remaining text', () => {
    const parser = createArtifactsParser();
    
    // For a parser that emits during push(), the text is already emitted
    const pushEvents = parser.push('Some remaining text');
    const flushEvents = parser.flush();
    
    // Text is emitted during push
    expect(pushEvents).toEqual([{ kind: 'text', text: 'Some remaining text' }]);
    // Nothing left to flush
    expect(flushEvents).toEqual([]);
  });

  it('should parse artifact with all attributes', () => {
    const parser = createArtifactsParser();
    const input = '<Artifact identifier="my-code" type="application/.artifacts.code" title="Example" language="typescript">const x = 1;</Artifact>';
    const events = parser.push(input);
    
    expect(events).toEqual([
      {
        kind: 'artifact-start',
        meta: {
          identifier: 'my-code',
          type: 'application/.artifacts.code',
          title: 'Example',
          language: 'typescript',
        },
      },
      { kind: 'artifact-chunk', text: 'const x = 1;' },
      { kind: 'artifact-end' },
    ]);
  });

  it('should handle malformed artifacts gracefully', () => {
    const parser = createArtifactsParser();
    
    // Missing closing tag - should be handled by flush
    parser.push('<Artifact identifier="test" type="text/html">Content');
    const events = parser.flush();
    
    expect(events).toContainEqual({ kind: 'artifact-end' });
  });

  it('should handle extremely split chunks at every character', () => {
    const parser = createArtifactsParser();
    const input = '<Artifact identifier="t" type="text/html">C</Artifact>';
    
    const events: any[] = [];
    for (const char of input) {
      events.push(...parser.push(char));
    }
    
    const hasStart = events.some(e => e.kind === 'artifact-start');
    const hasContent = events.some(e => e.kind === 'artifact-chunk' && e.text.includes('C'));
    const hasEnd = events.some(e => e.kind === 'artifact-end');
    
    expect(hasStart).toBe(true);
    expect(hasContent).toBe(true);
    expect(hasEnd).toBe(true);
  });
});