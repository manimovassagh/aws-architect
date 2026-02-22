# InfraGraph — Project Status

> Last updated: 2026-02-22

## Current Version: v2.0.0

## What's Working
- AWS, Azure, GCP all fully supported with branded icons, node components, and test fixtures
- Landing page: dark-first commercial aesthetic with gradient text, aurora glow, SVG provider icons, brand-colored hover effects
- Flow: Provider selection → Upload .tfstate/.tf → Interactive canvas
- Auto-detection of cloud provider from resource type prefixes
- Canvas: zoom, pan, minimap, dark mode, PNG export, search (Cmd+K), resource badges
- Docker: multi-stage builds for backend + frontend

## Open Issues
- **Issue #49**: CI E2E test logs not visible in pipeline output
- **Issue #52**: Browser back button doesn't work after selecting a provider
  - Root cause: React state (`useState`) navigation doesn't create browser history entries
  - Fix: use `pushState`/`popstate` or adopt React Router

## CI Pipeline
- Fixed on 2026-02-22 (commit `ddbe219`):
  - E2E test text matcher updated for redesigned landing page
  - Azure canvas timeout increased 5s → 10s
  - Docker workflow: removed SARIF upload (permission error), Trivy outputs table instead
  - Build artifact path fixed from `.next` → `dist` (Vite)
- Monitor next run to confirm green

## Key Technical Patterns
- `nodeTypes` in React Flow MUST be defined at module scope (not inside component)
- `ComponentType<any>` needed for React Flow nodeTypes (not `ComponentType<unknown>`)
- Vitest workspace needs `--exclude 'e2e/**'`
- Test files excluded from tsconfig: `"exclude": ["src/__tests__"]`
- shared package must be built before backend typecheck
- Backend parsers accept `ProviderConfig` — never hardcode provider-specific logic
- Frontend uses `ProviderFrontendConfig` with lazy-loading for Azure/GCP
- Container nesting (VPC/Subnet) is config-driven via `containerTypes` array
- CSS dark mode: use `.dark .class` pattern (NOT `:not(.dark) .class`)
- CSS `--glow-color` custom property set inline per card for brand-specific hover glow

## Milestones
| Version | What | Date |
|---------|------|------|
| v1.0.0 | Initial AWS-only release | 2026-02-20 |
| v1.3.2 | Multi-cloud support + rename to InfraGraph (PR #48) | 2026-02-21 |
| v2.0.0 | Full Azure & GCP + landing page redesign (PR #50) | 2026-02-22 |
