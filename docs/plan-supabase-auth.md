# Supabase Auth + Session History

## Context
InfraGraph has no user accounts or persistence — all state is in-memory. The user wants Google login, session history (saved diagrams), and a schema that supports future monetization (tiers, orgs, teams). Supabase chosen for: PostgreSQL database + built-in auth, open source (self-hostable), free tier to start, enterprise SSO later.

## Database Schema

```sql
-- profiles: auto-created on signup via trigger
profiles (
  id uuid PK → auth.users(id),
  email text,
  display_name text,
  avatar_url text,
  tier text default 'free',        -- future: 'pro', 'team', 'enterprise'
  session_limit int default 50,    -- future: enforce per tier
  org_id uuid nullable,            -- future: link to organizations
  created_at, updated_at
)

-- sessions: parsed diagrams saved per user
sessions (
  id uuid PK,
  user_id uuid → profiles(id),
  provider text ('aws'|'azure'|'gcp'),
  file_name text,
  resource_count int,
  data jsonb,                      -- full ParseResponse (nodes, edges, resources)
  created_at
)

-- future tables (created but unused)
organizations (id, name, slug, tier, max_members)
org_members (org_id, user_id, role)
```

Row-level security: users can only read/write their own profiles and sessions.

## Implementation Steps

### Step 1: Shared Types
**File:** `packages/shared/src/index.ts` — add types used by both frontend and backend

```typescript
UserProfile { id, email, displayName, avatarUrl, tier, sessionLimit }
Session { id, userId, provider, fileName, resourceCount, data: ParseResponse, createdAt }
SessionSummary { id, provider, fileName, resourceCount, createdAt }  // no data (for list endpoint)
CreateSessionRequest { provider, fileName, resourceCount, data }
```

### Step 2: Backend — Supabase Client + Auth Middleware
**New files:**
- `apps/backend/src/supabase.ts` — createClient with `SUPABASE_SERVICE_ROLE_KEY` (null if not configured → guest mode works)
- `apps/backend/src/middleware/auth.ts` — two middlewares:
  - `optionalAuth` — extracts user from JWT if present, passes through if not (for parse routes)
  - `requireAuth` — rejects 401 if not authenticated (for session/user routes)
- JWT validated via `supabase.auth.getUser(token)` (server-side, checks revocation)

**Install:** `npm install @supabase/supabase-js` in apps/backend

### Step 3: Backend — Session + User Routes
**New files:**
- `apps/backend/src/routes/sessions.ts`
  - `GET /api/sessions` — list user's sessions (summaries only, no data blob)
  - `GET /api/sessions/:id` — get full session with data
  - `POST /api/sessions` — save new session (Zod validated)
  - `DELETE /api/sessions/:id` — delete session
- `apps/backend/src/routes/user.ts`
  - `GET /api/user/profile` — get current user's profile

**Modify:** `apps/backend/src/index.ts` — register routes + `optionalAuth` globally

### Step 4: Frontend — Supabase Client + Auth Context
**New files:**
- `apps/frontend/src/lib/supabase.ts` — createClient with `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (null if not configured)
- `apps/frontend/src/lib/AuthContext.tsx` — React context providing: `user`, `loading`, `signInWithGoogle()`, `signOut()`, `getAccessToken()`
- `apps/frontend/src/components/AuthCallback.tsx` — handles OAuth redirect at `/auth/callback`

**Modify:**
- `apps/frontend/src/main.tsx` — wrap app with `<AuthProvider>`
- `apps/frontend/src/App.tsx` — add `/auth/callback` route

**Install:** `npm install @supabase/supabase-js` in apps/frontend

### Step 5: UserMenu Component (Replace Dummy Avatar)
**New file:** `apps/frontend/src/components/UserMenu.tsx`
- Not logged in → "Sign in" button (violet-600)
- Logged in → Google avatar + dropdown menu (name, email, "Session History", "Sign out")
- Loading → skeleton pulse circle

**Modify:**
- `apps/frontend/src/components/ProviderSelect.tsx` — replace dummy "U" avatar with `<UserMenu />`
- `apps/frontend/src/components/DocsPage.tsx` — same replacement

### Step 6: Wire API Client + Auto-Save Sessions
**Modify:** `apps/frontend/src/lib/api.ts`
- Add `authHeaders()` helper — returns `{ Authorization: Bearer <token> }` if logged in
- Add to existing `parseFile()`, `parseHcl()` — pass auth headers
- Add new functions: `listSessions()`, `getSession(id)`, `saveSession(payload)`, `deleteSession(id)`

**Modify:** `apps/frontend/src/components/HomePage.tsx`
- After successful parse in `handleSmartUpload` and `handleTrySample`: if user is logged in, fire-and-forget `saveSession()` call
- On mount: check `sessionStorage.getItem('loadSession')` to hydrate canvas from history

### Step 7: Session History Page
**New file:** `apps/frontend/src/components/HistoryPage.tsx`
- List of saved sessions: provider badge, file name, resource count, relative date
- Click → fetch full session → store in sessionStorage → navigate to `/canvas`
- Delete button per session
- Empty state for no sessions / not logged in

**Modify:** `apps/frontend/src/App.tsx` — add `/history` route (lazy-loaded)

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Guest mode preserved** | supabase client = null when not configured; parse routes work without auth |
| **`optionalAuth` on all routes** | Parse routes accept token if present but don't require it |
| **JSONB for session data** | Full ParseResponse stored as-is; ~200KB max per session, fine for MVP |
| **SessionSummary vs Session** | List endpoint omits `data` field to keep responses fast |
| **sessionStorage for history→canvas** | Avoids global state management; cleared when tab closes |
| **Fire-and-forget save** | Session save never blocks UI or fails the parse flow |
| **Future monetization ready** | `tier`, `session_limit`, `organizations`, `org_members` in schema but not enforced |

## Files Summary

| File | Action |
|------|--------|
| `packages/shared/src/index.ts` | Add UserProfile, Session, SessionSummary, CreateSessionRequest types |
| `apps/backend/src/supabase.ts` | New — Supabase admin client |
| `apps/backend/src/middleware/auth.ts` | New — optionalAuth + requireAuth middleware |
| `apps/backend/src/routes/sessions.ts` | New — session CRUD routes |
| `apps/backend/src/routes/user.ts` | New — user profile route |
| `apps/backend/src/index.ts` | Modify — register new routes + middleware |
| `apps/backend/package.json` | Add @supabase/supabase-js |
| `apps/frontend/src/lib/supabase.ts` | New — Supabase browser client |
| `apps/frontend/src/lib/AuthContext.tsx` | New — React auth context/provider |
| `apps/frontend/src/lib/api.ts` | Modify — add auth headers + session API functions |
| `apps/frontend/src/components/AuthCallback.tsx` | New — OAuth callback handler |
| `apps/frontend/src/components/UserMenu.tsx` | New — replaces dummy "U" avatar |
| `apps/frontend/src/components/HistoryPage.tsx` | New — session history page |
| `apps/frontend/src/components/HomePage.tsx` | Modify — auto-save + load-from-history |
| `apps/frontend/src/components/ProviderSelect.tsx` | Modify — use UserMenu |
| `apps/frontend/src/components/DocsPage.tsx` | Modify — use UserMenu |
| `apps/frontend/src/main.tsx` | Modify — wrap with AuthProvider |
| `apps/frontend/src/App.tsx` | Modify — add /auth/callback + /history routes |
| `apps/frontend/package.json` | Add @supabase/supabase-js |

## Verification
1. `npm run lint && npm run typecheck && npm run build` after each step
2. Playwright MCP: landing page shows "Sign in" button where "U" was
3. Manual: Google OAuth flow → sign in → avatar appears → upload file → session saved
4. Manual: navigate to /history → see saved session → click to reload diagram
5. Manual: sign out → app still works in guest mode (no save)
6. E2E tests still pass (parse routes unchanged)
