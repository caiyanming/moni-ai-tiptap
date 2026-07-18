# moni-ai-tiptap Guide

## Scope

This is Moni's TipTap fork. Treat it as editor infrastructure, not product UI. Changes here affect `moni-ai-web` editor behavior and package publishing.

## Source Of Truth

- Editor docs: `../moni-ai-docs/07-editor/`
- Web Component content contract: `../moni-ai-docs/05-implementation/web-components/web-component-content-parts.md`
- Teacher app integration: `../moni-ai-web/AGENTS.md`

## Rules

- Prefer upstream-compatible extension patterns. Do not add teacher-product behavior here when it can live in `moni-ai-web`.
- Keep editor schema, commands, transactions, and extension attributes as the source of truth; do not solve editor bugs by DOM patching in downstream UI.
- Moni-specific extensions should keep payload/contracts typed and documented, especially web component and drag/stream behavior.
- Any schema or serialization change must consider persisted documents and old content. Add migration or compatibility only when there is real stored-data evidence.
- Do not churn generated `dist/`, reports, or package artifacts unless the task is explicitly packaging/publishing.

## Verification

- Unit tests: `pnpm run test:unit`
- Moni unit tests: `pnpm run test:unit:moni`
- Drag tests: `pnpm run test:drag`
- Quick test suite: `pnpm run test:quick`
- Build: `pnpm run build`

Run the narrowest relevant test first; for schema/serialization changes, include tests that prove old and new document behavior.
