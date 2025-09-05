import { createArtifactsParser } from './parser';

const parser = createArtifactsParser();
const input = '<Artifact identifier="t" type="text/html">C</Artifact>';

const events: any[] = [];
for (const char of input) {
  const charEvents = parser.push(char);
  if (charEvents.length > 0) {
    console.log(`Char: "${char}" => Events:`, charEvents);
    events.push(...charEvents);
  }
}

console.log('\nAll events:', events);
console.log('\nHas start?', events.some(e => e.kind === 'artifact-start'));
console.log('Has content?', events.some(e => e.kind === 'artifact-chunk' && e.text.includes('C')));
console.log('Has end?', events.some(e => e.kind === 'artifact-end'));