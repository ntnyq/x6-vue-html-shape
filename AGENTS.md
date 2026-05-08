# Repository Guidelines

## Project Structure & Module Organization

This ESM TypeScript package renders Vue components as X6 nodes in an HTML overlay. Read `README.md` for usage and `docs/design/design.md` for architectural context.

- `src/`: library code; `index.ts` exposes the public API. `view.ts` manages Vue rendering, `layer.ts` manages overlays, and `sync.ts` handles graph events. Shared helpers live in `src/utils/`; styling lives in `src/style.css`.
- `tests/`: unit tests for registration, interaction guards, overlays, and synchronization.
- `docs/`: VitePress documentation, Vue demos in `docs/components/`, and theme assets in `docs/.vitepress/theme/`.
- `dist/`: generated package output. `__snapshots__/tsnapi/` contains generated API snapshots; review changes when modifying exports.

## Build, Test, and Development Commands

Use Node.js LTS and the pnpm version pinned in `package.json`. Run commands from the repository root:

- `pnpm install`: install workspace dependencies.
- `pnpm dev`: rebuild the library on changes.
- `pnpm build`: generate JavaScript, declarations, and API snapshots with tsdown.
- `pnpm docs:dev` / `pnpm docs:build`: serve or build documentation.
- `pnpm test`: run Vitest once; `pnpm test tests/sync.test.ts` targets synchronization tests.
- `pnpm typecheck`: check TypeScript with `tsgo --noEmit`.
- `pnpm lint`: run Oxlint.
- `pnpm format` / `pnpm format:check`: apply or check Oxfmt formatting.
- `pnpm release:check`: run formatting, lint, type, and test checks before submitting changes. Also run `pnpm build` for library changes.

## Coding Style & Naming Conventions

Use two-space indentation, LF endings, single quotes, no semicolons, and trailing commas. Follow the configured 80-column print width. Use camelCase for functions and variables, PascalCase for types and Vue component filenames, and UPPER_SNAKE_CASE for constants. Keep type-only imports explicit. Husky runs nano-staged formatting and lint fixes before commits.

## Testing Guidelines

Use Vitest with jsdom; name files `tests/*.test.ts` and describe behavior with `describe`/`it`. Add regression tests for changed behavior, including listener disposal and overlay cleanup. No coverage threshold is configured.

## Commit & Pull Request Guidelines

History currently contains only `chore: init commit`. Follow its `type: description` format, using appropriate prefixes such as `fix:`, `feat:`, or `docs:`. PRs should explain the change, link relevant issues, and report validation. Include screenshots for visible demo changes and update documentation for API changes.

## Architecture Guardrails

Preserve HTML overlay rendering without SVG `foreignObject`. Keep graph editing in X6, preserve interactive-element guards, and maintain Vue unmount, listener disposal, and layer cleanup paths.
