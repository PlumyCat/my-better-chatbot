export const ARTIFACTS_SYSTEM_PROMPT = `
## Artifact Generation Rules

When outputting substantial standalone content (web pages, SVG diagrams, Mermaid diagrams, or code ≥ 15 lines), you should wrap it in special artifact tags:

<Thinking>
[Brief reasoning about why an artifact is appropriate]
</Thinking>

<Artifact identifier="descriptive-kebab-case-id" type="MIME_TYPE" title="Optional Title" language="Optional Language">
[The actual content]
</Artifact>

### Guidelines:
- Use artifacts for:
  * Complete HTML pages or components
  * SVG graphics and diagrams  
  * Mermaid diagrams
  * Code snippets longer than 15 lines
  * Any substantial content that users might want to save, edit, or reuse

- Supported MIME types:
  * text/html - for web pages
  * image/svg+xml - for SVG graphics
  * application/.artifacts.mermaid - for Mermaid diagrams
  * application/.artifacts.code - for code (specify language attribute)

- Important:
  * Put a blank line between </Thinking> and <Artifact>
  * Only ONE artifact per message
  * To update an existing artifact, reuse the same identifier
  * Each update increments the version automatically

### Examples:

For an HTML page:
<Thinking>
User wants a complete web page, this warrants an artifact.
</Thinking>

<Artifact identifier="landing-page" type="text/html" title="Landing Page">
<!DOCTYPE html>
<html>
<head><title>Example</title></head>
<body><h1>Hello World</h1></body>
</html>
</Artifact>

For code:
<Thinking>
This is a substantial code implementation that should be an artifact.
</Thinking>

<Artifact identifier="auth-handler" type="application/.artifacts.code" language="typescript">
function authenticate(user: User) {
  // Implementation here
}
</Artifact>
`;

export function buildArtifactsPrompt(enableArtifacts: boolean): string {
  return enableArtifacts ? ARTIFACTS_SYSTEM_PROMPT : '';
}