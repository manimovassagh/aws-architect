# InfraGraph — Claude Code Instructions

## Workflow Rules

1. **Small steps**: Make changes in small increments. Never write more than a few files without verifying.
2. **Always verify**: After each change, run `npm run lint`, `npm run typecheck`, and `npm run build`. Use Playwright for visual smoke checks when UI changes are involved.
3. **Frequent commits**: Commit after every meaningful change so it's easy to roll back. Don't batch too many changes into one commit.
4. **Give feedback**: Always show progress. Never go silent during long operations — show intermediate results, test output, or status updates.
5. **Visual testing**: For frontend changes, use Playwright MCP to open the app and verify the UI looks correct before committing.

## Project Structure

- **Monorepo** with npm workspaces: `apps/backend`, `apps/frontend`, `packages/shared`, `e2e/`
- **Backend**: Express + TypeScript (port 3001)
- **Frontend**: Vite + React 18 + React Flow + Tailwind (port 3000)
- **Shared**: `@infragraph/shared` — TypeScript types package
- **E2E**: Standalone Playwright tests (not a workspace)

## Architecture

- Multi-cloud: `providers/` directories in both backend and frontend
- Backend parsers accept `ProviderConfig` — never hardcode provider-specific logic in parsers
- Frontend uses `ProviderFrontendConfig` with lazy-loading for non-AWS providers
- Container nesting (VPC/Subnet) is config-driven via `containerTypes` array
- Keep node components **separate per cloud provider** for maintainability

## Build & Test Commands

```bash
npm run build          # Build all workspaces (shared must build first)
npm run lint           # ESLint across all workspaces
npm run typecheck      # Build shared + tsc --noEmit on backend
npm run test:unit      # Vitest unit tests with coverage
npm run test:e2e       # Playwright E2E tests (requires dev servers running)
npm run dev            # Start backend (3001) + frontend (3000)
```

## Key Technical Notes

- `nodeTypes` in React Flow MUST be defined at module scope (not inside component)
- Use `ComponentType<any>` for React Flow nodeTypes (not `ComponentType<unknown>`)
- shared package must be built before backend typecheck
- Test files excluded from tsconfig: `"exclude": ["src/__tests__"]`
- Vitest workspace needs `--exclude 'e2e/**'`
