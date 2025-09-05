# TODO — Add Claude–style **Artifacts** to `better-chatbot`

> Goal: implement Claude–style Artifacts blocks (`<Artifact …>…</Artifact>`) extracted from model streams, persisted with versioning, and rendered in a right‑side panel. Designed to be executed step‑by‑step with **Claude Code**.

---

## Scope (MVP)

* Supported types: `text/html`, `image/svg+xml`, `application/.artifacts.mermaid`, `application/.artifacts.code` (with `language`).
* One artifact per assistant message. Re‑using the same `identifier` means **update -> version++**.
* Safe rendering: sanitize everything; no arbitrary JS.

---

## Folder plan

```
src/
  features/
    artifacts/
      parser.ts
      types.ts
      store.ts
      ArtifactPanel.tsx
      renderers/
        HtmlArtifact.tsx
        SvgArtifact.tsx
        MermaidArtifact.tsx
        CodeArtifact.tsx
```

---

## Milestone 0 — Repo hygiene

* [ ] Create feature branch: `feat/artifacts-mvp`
* [ ] Add feature flag env: `ENABLE_ARTIFACTS=true` (default false)
* [ ] Decide state lib (Zustand/Redux/Context). This TODO assumes a tiny Zustand‑like store.

---

## Milestone 1 — Prompt spec (server)

**File(s):** your model system prompt (server)

* [ ] Add “Artifacts rules”:

  * When outputting substantial standalone content (web page, SVG, Mermaid, or code ≥ 15 lines), wrap it in:

    ```
    <Thinking>short reasoning...</Thinking>

    <Artifact identifier="kebab-id" type="MIME" title="Optional" language="Optional">
    ...content...
    </Artifact>
    ```
  * Put a **blank line** between `</Thinking>` and `<Artifact …>`.
  * Only **one artifact** per message.
  * To update, **reuse the same `identifier`** with new content.

---

## Milestone 2 — Streaming parser

**File:** `src/features/artifacts/parser.ts`

* [ ] Implement a **streaming** parser that survives chunk boundaries.
* [ ] Detect `<Artifact …>` start, capture attributes, accumulate `content` until `</Artifact>`.
* [ ] Expose an incremental API:

```ts
export type ArtifactChunkEvent =
  | { kind: 'text'; text: string }
  | { kind: 'artifact-start'; meta: ArtifactMeta }
  | { kind: 'artifact-chunk'; text: string }
  | { kind: 'artifact-end' };

export function createArtifactsParser() {
  return {
    push(chunk: string): ArtifactChunkEvent[],
    flush(): ArtifactChunkEvent[]
  };
}
```

**Parsing details (suggestion):**

* Maintain a small state machine: `Idle` → `InOpenTag` → `InArtifact` → `InCloseTag`.
* Attribute extraction helper:

```ts
export function parseAttributes(tagInner: string): Record<string,string> {
  const out: Record<string,string> = {};
  const rx = /(\w+)\s*=\s*"([^"]*)"/g; // supports identifier, type, title, language
  let m: RegExpExecArray | null;
  while ((m = rx.exec(tagInner))) out[m[1]] = m[2];
  return out;
}
```

* Be tolerant: ignore unknown attributes; trim `content` only at the end.

---

## Milestone 3 — Chat stream integration

**File(s):** wherever the assistant **response streaming** is piped to the UI.

* [ ] Insert `createArtifactsParser()` in the server stream pipeline.
* [ ] For each chunk from the LLM, call `parser.push(chunk)` and:

  * Forward `text` events to the regular chat token stream.
  * When you receive `artifact-*` events, also emit an SSE/WebSocket payload like:

    ```json
    { "type": "artifact", "phase": "start|chunk|end", "data": { ... } }
    ```
* [ ] Server builds a minimal artifact object on `artifact-start`:

```ts
{
  conversationId,
  messageId,
  identifier,
  type,
  title?,
  language?,
  content: ''
}
```

* [ ] Append `artifact-chunk` to `content`; on `artifact-end`, persist (see M4).

---

## Milestone 4 — Persistence + versioning

**DB:** Drizzle/SQL (or your current ORM).
**Migration name:** `2025XXXX_add_artifacts`

* [ ] Table `artifacts`:

  * `id` (PK, cuid/uuid)
  * `conversationId` (FK/string)
  * `messageId` (string)
  * `identifier` (string, non‑null)
  * `version` (int, default 1)
  * `type` (string)
  * `title` (string, null)
  * `language` (string, null)
  * `content` (text)
  * `createdAt` (timestamp)
* [ ] Unique index on `(conversationId, identifier, version)`.
* [ ] On write: look up last `version` for `(conversationId, identifier)`; set `version = last + 1`.

---

## Milestone 5 — API endpoints (MVP)

* [ ] `GET /api/artifacts?conversationId=...` → list identifiers + latest version meta.
* [ ] `GET /api/artifacts/:identifier?conversationId=...` → full versions.
* [ ] `POST /api/artifacts/:id/export` → returns a file (MIME derived from `type`).
* [ ] (Optional) SSE channel `/api/stream/artifacts?conversationId=...` if not sharing the chat SSE.

---

## Milestone 6 — UI Panel

**Files:** `store.ts`, `ArtifactPanel.tsx`, renderers/\*

* [ ] **Panel layout** docked right; auto‑open when an artifact arrives.
* [ ] Top bar: Identifier selector (dropdown), Version selector, buttons **Copy**, **Download**, **Detach** (open in new tab).
* [ ] Tabs: **Preview** / **Source**.
* [ ] **Renderers:**

  * HTML → `HtmlArtifact.tsx`: render in sandboxed iframe.
  * SVG → `SvgArtifact.tsx`: inline sanitized svg.
  * Mermaid → `MermaidArtifact.tsx`: render via mermaid init on mount.
  * Code → `CodeArtifact.tsx`: Monaco (readonly) + language from meta.

---

## Milestone 7 — Security (must‑have)

* [ ] **Sanitize** HTML & SVG with DOMPurify (`FORBID_TAGS: ['script', 'iframe']`, `FORBID_ATTR: [/^on/i]`, block `javascript:` URLs).
* [ ] **Iframe sandbox**: `sandbox="allow-same-origin"` only (no scripts at MVP). CSP for iframe document:

  ```
  default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; font-src data:; frame-ancestors 'self';
  ```
* [ ] Size limits: reject artifacts > 200 KB; truncate with notice.
* [ ] Only 1 artifact per assistant message; ignore extra ones (log warning).

---

## Milestone 8 — Update/Replace UX

* [ ] In Panel, button **“Ask to update”** → posts a prefilled user message:

  ```
  Update the existing artifact with identifier "<id>". Keep the same identifier and output a single <Artifact> block.
  ```
* [ ] Parser handles the new artifact and DB stores `version+1`.

---

## Milestone 9 — Tests

* [ ] **Unit: parser** — chunk boundary splits, attribute combos, nested text, malformed tags (ensure graceful fallback to plain text), multi‑MB content rejection.
* [ ] **Unit: sanitizer** — block scripts, on\* attrs, `javascript:` URLs; allow safe `style`, `viewBox`.
* [ ] **E2E:** generate each type via LLM, verify panel auto‑opens, switching versions, download works.

---

## Milestone 10 — Developer ergonomics (Claude Code prompts)

Paste these in Claude Code when starting each milestone.

**1) Parser**

> Implement `src/features/artifacts/parser.ts` as a streaming state machine that emits the four events described in `ArtifactChunkEvent`. Include exhaustive tests with chunk splits at every character boundary.

**2) Integration**

> Wire `createArtifactsParser()` into the assistant response stream pipeline. Ensure text tokens still flow to the chat. Emit artifact SSE events (start/chunk/end). Add metrics logs when artifacts are detected.

**3) DB + API**

> Add a Drizzle migration for `artifacts` with versioning. Implement the three endpoints in Milestone 5 with input validation and pagination.

**4) UI Panel**

> Build `ArtifactPanel.tsx` and minimal store. Four renderers, Preview/Source tabs, Copy/Download/Detach.

**5) Security**

> Add DOMPurify sanitization, iframe sandbox, CSP, and 200 KB limit. Write tests that prove exploits are blocked.

---

## Definition of Done (MVP)

* [ ] Feature flag ON shows a right panel that auto‑opens when an artifact arrives.
* [ ] Parser reliably extracts attributes & content across streaming chunk boundaries.
* [ ] DB stores artifacts with versioning; API lists & fetches versions.
* [ ] UI renders all four types; security rules enforced; downloads work.
* [ ] Tests: green unit + E2E for happy paths & basic security.

---

## Nice‑to‑have (post‑MVP)

* React live artifacts via Sandpack (isolated bundling) with stricter CSP.
* Artifact diff viewer between versions (code & HTML side‑by‑side unified diff).
* “Pin to sidebar” across conversations.
* Export to `.svg`, `.html`, `.mmd`, `.txt` bundles.

---

## Tracking checklist (copy into Issue)

* [ ] M0 Branch & flag
* [ ] M1 Prompt rules
* [ ] M2 Parser + tests
* [ ] M3 Stream integration
* [ ] M4 DB + migration
* [ ] M5 API endpoints
* [ ] M6 Panel UI + renderers
* [ ] M7 Security hardening
* [ ] M8 Update/Replace UX
* [ ] M9 Tests (unit + E2E)
* [ ] DoD sign‑off
